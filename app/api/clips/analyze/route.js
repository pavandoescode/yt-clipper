import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import { analyzeVideo } from '@/lib/gemini';
import connectDB from '@/lib/db';

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

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ message: 'YouTube URL is required' }, { status: 400 });
        }

        // Validate YouTube URL
        const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|live\/|embed\/)|youtu\.be\/)/;
        if (!youtubePattern.test(url)) {
            return NextResponse.json({ message: 'Please enter a valid YouTube URL' }, { status: 400 });
        }

        // Extract video ID
        const videoId = extractVideoId(url);
        const thumbnail = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : '';

        // Clean URL
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
            videoId,
            status: 'analyzing',
            thumbnail,
            videoTitle
        });
        await livestream.save();

        // Analyze with Gemini with timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Analysis timed out')), 300000) // 5 minute timeout
        );

        const analyzePromise = analyzeVideo(url);
        const result = await Promise.race([analyzePromise, timeoutPromise]);

        if (!result.success) {
            livestream.status = 'failed';
            await livestream.save();
            return NextResponse.json({ message: 'Failed to analyze video', error: result.error }, { status: 500 });
        }

        // Save individual clips
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

        return NextResponse.json({
            message: 'Analysis complete',
            livestream: {
                id: livestream._id,
                url: livestream.url
            },
            clips: savedClips
        });

    } catch (error) {
        console.error('Analyze error:', error);
        return NextResponse.json({ message: 'Server error during analysis' }, { status: 500 });
    }
}
