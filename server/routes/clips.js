import express from 'express';
import auth from '../middleware/auth.js';
import Livestream from '../models/Livestream.js';
import Clip from '../models/Clip.js';
import { analyzeVideo } from '../services/geminiService.js';

const router = express.Router();

// Helper to extract video ID from YouTube URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
        /youtube\.com\/live\/([^&\s?]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// POST /api/clips/analyze - Analyze a YouTube video
router.post('/analyze', auth, async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ message: 'YouTube URL is required' });
        }

        // Validate YouTube URL
        const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|embed\/)|youtu\.be\/)/;
        if (!youtubePattern.test(url)) {
            return res.status(400).json({ message: 'Please enter a valid YouTube URL' });
        }

        // Extract video ID for thumbnail (using mqdefault for smaller file size)
        const videoId = extractVideoId(url);
        const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';

        // Clean URL - remove extra params like &t=7s to keep only video ID
        let cleanUrl = url;
        if (videoId) {
            cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        }

        // Fetch video title from YouTube oEmbed API
        let videoTitle = '';
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const oEmbedResponse = await fetch(oEmbedUrl);
            if (oEmbedResponse.ok) {
                const oEmbedData = await oEmbedResponse.json();
                videoTitle = oEmbedData.title || '';
            }
        } catch (e) {
            console.log('Could not fetch video title:', e.message);
        }

        // Create livestream record
        const livestream = new Livestream({
            url: cleanUrl,

            status: 'analyzing',
            thumbnail,
            videoTitle
        });
        await livestream.save();

        // Analyze with Gemini
        const result = await analyzeVideo(url);

        if (!result.success) {
            livestream.status = 'failed';
            await livestream.save();
            return res.status(500).json({ message: 'Failed to analyze video', error: result.error });
        }

        // Save individual clips to database
        const savedClips = [];
        for (const clip of result.data.individualClips) {
            const newClip = new Clip({
                livestreamId: livestream._id,

                clipNumber: clip.clipNumber,
                title: clip.title,
                timestampStart: clip.timestampStart,
                timestampEnd: clip.timestampEnd,
                category: clip.category,
                summary: clip.summary,
                keyLine: clip.keyLine || '',
                whyItWorks: clip.whyItWorks || '',
                suggestedLength: clip.suggestedLength || '',
                suggestedTitles: clip.suggestedTitles || []
            });
            await newClip.save();
            savedClips.push(newClip);
        }

        // Update livestream status
        livestream.status = 'completed';
        await livestream.save();

        res.json({
            message: 'Analysis complete',
            livestream: {
                id: livestream._id,
                url: livestream.url
            },
            clips: savedClips
        });
    } catch (error) {
        console.error('Analyze error:', error);
        res.status(500).json({ message: 'Server error during analysis' });
    }
});

// GET /api/clips/analyze-stream - SSE endpoint for real-time analysis progress
router.get('/analyze-stream', auth, async (req, res) => {
    const { url } = req.query;

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        if (!url) {
            sendEvent({ type: 'error', message: 'YouTube URL is required' });
            return res.end();
        }

        // Validate YouTube URL
        const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|embed\/)|youtu\.be\/)/;
        if (!youtubePattern.test(url)) {
            sendEvent({ type: 'error', message: 'Please enter a valid YouTube URL' });
            return res.end();
        }

        sendEvent({ type: 'progress', stage: 'init', message: 'Starting analysis...' });

        // Extract video ID
        const videoId = extractVideoId(url);
        const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';
        let cleanUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;

        sendEvent({ type: 'progress', stage: 'info', message: 'Fetching video info...' });

        // Fetch video title
        let videoTitle = '';
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
            const oEmbedResponse = await fetch(oEmbedUrl);
            if (oEmbedResponse.ok) {
                const oEmbedData = await oEmbedResponse.json();
                videoTitle = oEmbedData.title || '';
            }
        } catch (e) { }

        // Create livestream record
        const livestream = new Livestream({
            url: cleanUrl,

            status: 'analyzing',
            thumbnail,
            videoTitle
        });
        await livestream.save();

        sendEvent({ type: 'progress', stage: 'ai', message: 'Analyzing with AI... This may take a minute.' });

        // Analyze with Gemini
        const result = await analyzeVideo(url);

        if (!result.success) {
            livestream.status = 'failed';
            await livestream.save();
            sendEvent({ type: 'error', message: 'Failed to analyze video: ' + result.error });
            return res.end();
        }

        const totalClips = result.data.individualClips?.length || 0;
        sendEvent({ type: 'progress', stage: 'saving', message: `Found ${totalClips} clips. Saving...`, total: totalClips });

        // Save individual clips
        const savedClips = [];
        for (let i = 0; i < result.data.individualClips.length; i++) {
            const clip = result.data.individualClips[i];
            const newClip = new Clip({
                livestreamId: livestream._id,

                clipNumber: clip.clipNumber,
                title: clip.title,
                timestampStart: clip.timestampStart,
                timestampEnd: clip.timestampEnd,
                category: clip.category,
                summary: clip.summary,
                keyLine: clip.keyLine || '',
                whyItWorks: clip.whyItWorks || '',
                suggestedLength: clip.suggestedLength || '',
                suggestedTitles: clip.suggestedTitles || []
            });
            await newClip.save();
            savedClips.push(newClip);

            sendEvent({
                type: 'clip',
                current: i + 1,
                total: totalClips,
                clip: newClip,
                message: `Saving clip ${i + 1}/${totalClips}...`
            });
        }

        // Update livestream status
        livestream.status = 'completed';
        await livestream.save();

        // Send completion
        sendEvent({
            type: 'complete',
            message: 'Analysis complete!',
            clips: savedClips,
            livestream: { id: livestream._id, url: livestream.url }
        });

        res.end();
    } catch (error) {
        console.error('SSE Analyze error:', error);
        sendEvent({ type: 'error', message: 'Server error during analysis' });
        res.end();
    }
});

// GET /api/clips/saved - Get all saved clips
router.get('/saved', auth, async (req, res) => {
    try {
        const clips = await Clip.find({
            isSaved: true
        }).populate('livestreamId').sort({ createdAt: -1 });

        res.json({ clips });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/clips/by-video/:videoId - Get clips for a specific video
router.get('/by-video/:videoId', auth, async (req, res) => {
    try {
        const { videoId } = req.params;
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Find livestream by URL
        const livestream = await Livestream.findOne({
            url: cleanUrl
        });

        if (!livestream) {
            return res.json({ clips: [], exists: false });
        }

        // Get clips for this livestream
        const clips = await Clip.find({
            livestreamId: livestream._id
        }).sort({ clipNumber: 1 });

        res.json({
            clips,
            exists: clips.length > 0,
            livestream: {
                id: livestream._id,
                title: livestream.videoTitle,
                status: livestream.status
            }
        });
    } catch (error) {
        console.error('Get clips by video error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/clips/:id/save - Toggle save status for a clip
router.patch('/:id/save', auth, async (req, res) => {
    try {
        const { customTitle, thumbnailTopText, thumbnailMainText } = req.body;

        const clip = await Clip.findOne({
            _id: req.params.id
        });

        if (!clip) {
            return res.status(404).json({ message: 'Clip not found' });
        }

        clip.isSaved = !clip.isSaved;

        // Save custom fields if provided
        if (customTitle !== undefined) clip.customTitle = customTitle;
        if (thumbnailTopText !== undefined) clip.thumbnailTopText = thumbnailTopText;
        if (thumbnailMainText !== undefined) clip.thumbnailMainText = thumbnailMainText;

        await clip.save();

        res.json({ message: clip.isSaved ? 'Clip saved' : 'Clip unsaved', clip });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/clips/:id/update-text - Auto-save text fields without toggling save
router.patch('/:id/update-text', auth, async (req, res) => {
    try {
        const { customTitle, thumbnailTopText, thumbnailMainText } = req.body;
        const clip = await Clip.findById(req.params.id);

        if (!clip) {
            return res.status(404).json({ message: 'Clip not found' });
        }

        if (customTitle !== undefined) clip.customTitle = customTitle;
        if (thumbnailTopText !== undefined) clip.thumbnailTopText = thumbnailTopText;
        if (thumbnailMainText !== undefined) clip.thumbnailMainText = thumbnailMainText;

        await clip.save();
        res.json({ message: 'Text saved', clip });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/clips/saved - Get all saved clips
router.get('/saved', auth, async (req, res) => {
    try {
        const clips = await Clip.find({ isSaved: true }).sort({ savedAt: -1, updatedAt: -1 });
        res.json({ clips, segments: [] });
    } catch (error) {
        console.error('Fetch saved error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/clips/history - Get analysis history
router.get('/history', auth, async (req, res) => {
    try {
        const livestreams = await Livestream.find({}).sort({ createdAt: -1 });

        res.json({ livestreams });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/clips/livestream/:id - Get clips for a specific livestream
router.get('/livestream/:id', auth, async (req, res) => {
    try {
        const livestream = await Livestream.findOne({
            _id: req.params.id
        });

        if (!livestream) {
            return res.status(404).json({ message: 'Livestream not found' });
        }

        const clips = await Clip.find({ livestreamId: livestream._id });

        res.json({ livestream, clips });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/clips/livestream/:id - Delete a livestream and all its clips
router.delete('/livestream/:id', auth, async (req, res) => {
    try {
        const livestream = await Livestream.findOne({
            _id: req.params.id
        });

        if (!livestream) {
            return res.status(404).json({ message: 'Livestream not found' });
        }

        // Delete all associated clips
        await Clip.deleteMany({ livestreamId: livestream._id });

        // Delete the livestream
        await Livestream.deleteOne({ _id: livestream._id });

        res.json({ message: 'Livestream and all clips deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
