import express from 'express';
import auth from '../middleware/auth.js';
import ChannelStream from '../models/ChannelStream.js';

const router = express.Router();

// GET /api/channel/streams - Get paginated channel streams
router.get('/streams', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const showDone = req.query.showDone === 'true';
        const sortOrder = req.query.sortOrder === 'new' ? -1 : 1;
        // For undone: isDone is false OR not set (undefined/null)
        const filter = showDone ? { isDone: true } : { $or: [{ isDone: false }, { isDone: { $exists: false } }, { isDone: null }] };
        const total = await ChannelStream.countDocuments(filter);
        const totalDone = await ChannelStream.countDocuments({ isDone: true });
        const totalAll = await ChannelStream.countDocuments({});

        const streams = await ChannelStream.find(filter)
            .sort({ publishedAt: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        res.json({
            streams,
            total,
            totalDone,
            totalAll,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
        });
    } catch (error) {
        console.error('Fetch streams error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/channel/clear - Clear all channel streams
router.delete('/clear', auth, async (req, res) => {
    try {
        const result = await ChannelStream.deleteMany({});
        res.json({ message: `Deleted ${result.deletedCount} streams` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/channel/stream/video/:videoId - Get stream by YouTube videoId
router.get('/stream/video/:videoId', auth, async (req, res) => {
    try {
        const { videoId } = req.params;
        const stream = await ChannelStream.findOne({ videoId });
        if (!stream) {
            return res.status(404).json({ message: 'Stream not found' });
        }
        res.json(stream);
    } catch (error) {
        console.error('Get stream by videoId error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/channel/cleanup-duplicates - Remove duplicate streams
router.post('/cleanup-duplicates', auth, async (req, res) => {
    try {
        // Find duplicates by videoId
        const duplicates = await ChannelStream.aggregate([
            { $group: { _id: '$videoId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let removedCount = 0;
        for (const dup of duplicates) {
            // Keep the first one, delete the rest
            const idsToDelete = dup.ids.slice(1);
            await ChannelStream.deleteMany({ _id: { $in: idsToDelete } });
            removedCount += idsToDelete.length;
        }

        res.json({
            message: `Removed ${removedCount} duplicate streams`,
            duplicatesFixed: duplicates.length
        });
    } catch (error) {
        console.error('Cleanup duplicates error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/channel/fetch - Fetch new streams from YouTube and store in DB
router.post('/fetch', auth, async (req, res) => {
    try {
        const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

        if (!YOUTUBE_API_KEY) {
            return res.status(400).json({ message: 'YouTube API key not configured' });
        }

        // First, get channel ID from handle
        const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=ezLiveOfficial&key=${YOUTUBE_API_KEY}`;
        const channelResponse = await fetch(handleUrl);
        const channelData = await channelResponse.json();

        if (!channelData.items || channelData.items.length === 0) {
            return res.status(404).json({ message: 'Channel not found' });
        }

        const channelId = channelData.items[0].id;
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

        // Fetch videos from uploads playlist (stops when hitting existing videos)
        let allNewVideos = [];
        let nextPageToken = '';
        let foundExisting = false;

        do {
            const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const playlistResponse = await fetch(playlistUrl);
            const playlistData = await playlistResponse.json();

            if (playlistData.items) {
                // Check each video - stop when we find one that exists
                for (const video of playlistData.items) {
                    const videoId = video.snippet.resourceId.videoId;
                    const existing = await ChannelStream.findOne({ videoId });

                    if (existing) {
                        foundExisting = true;
                        break;
                    }
                    allNewVideos.push(video);
                }
            }

            nextPageToken = playlistData.nextPageToken;
        } while (nextPageToken && !foundExisting);

        // If no new videos, return early
        if (allNewVideos.length === 0) {
            const totalStreams = await ChannelStream.countDocuments();
            return res.json({
                message: 'No new livestreams found',
                newCount: 0,
                totalStreams
            });
        }

        // Get video details only for new videos
        const videoIds = allNewVideos.map(v => v.snippet.resourceId.videoId).join(',');
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
        const videoDetailsResponse = await fetch(videoDetailsUrl);
        const videoDetailsData = await videoDetailsResponse.json();

        // Create a map of video details
        const detailsMap = {};
        if (videoDetailsData.items) {
            videoDetailsData.items.forEach(item => {
                detailsMap[item.id] = {
                    duration: item.contentDetails?.duration || '',
                    viewCount: item.statistics?.viewCount || ''
                };
            });
        }

        // Save new videos to DB
        let newCount = 0;
        for (const video of allNewVideos) {
            const videoId = video.snippet.resourceId.videoId;
            const details = detailsMap[videoId] || {};

            await ChannelStream.create({
                videoId,
                title: video.snippet.title,
                thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
                channelId: channelId,
                channelTitle: video.snippet.channelTitle,
                publishedAt: new Date(video.snippet.publishedAt),
                duration: details.duration,
                viewCount: details.viewCount
            });
            newCount++;
        }

        const totalStreams = await ChannelStream.countDocuments();
        res.json({
            message: `Fetched ${newCount} new livestreams`,
            newCount,
            totalStreams
        });

    } catch (error) {
        console.error('Fetch from YouTube error:', error);
        res.status(500).json({ message: 'Failed to fetch from YouTube: ' + error.message });
    }
});

// Helper function to parse ISO 8601 duration to seconds
function parseDuration(duration) {
    if (!duration) return 0;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

// DELETE /api/channel/stream/:id - Delete a channel stream
router.delete('/stream/:id', auth, async (req, res) => {
    try {
        await ChannelStream.findByIdAndDelete(req.params.id);
        res.json({ message: 'Stream deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/channel/stream/:id/done - Mark stream as done
router.patch('/stream/:id/done', auth, async (req, res) => {
    try {
        const stream = await ChannelStream.findByIdAndUpdate(
            req.params.id,
            { isDone: true },
            { new: true }
        );
        res.json(stream);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PATCH /api/channel/stream/:id/undo - Mark stream as not done
router.patch('/stream/:id/undo', auth, async (req, res) => {
    try {
        const stream = await ChannelStream.findByIdAndUpdate(
            req.params.id,
            { isDone: false },
            { new: true }
        );
        res.json(stream);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
