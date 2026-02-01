
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { nanoid } from 'nanoid';

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { clips, videoId } = await request.json();

        if (!clips || !Array.isArray(clips) || clips.length === 0) {
            return NextResponse.json({ message: 'No clips provided' }, { status: 400 });
        }

        if (!videoId) {
            return NextResponse.json({ message: 'Video ID is required' }, { status: 400 });
        }

        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // Fetch video title
        let videoTitle = '';
        try {
            const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
            const oEmbedResponse = await fetch(oEmbedUrl);
            if (oEmbedResponse.ok) {
                const oEmbedData = await oEmbedResponse.json();
                videoTitle = oEmbedData.title || '';
            }
        } catch (e) {
            console.log('Could not fetch video title:', e.message);
        }

        // Create new livestream record
        const livestream = new Livestream({
            url: cleanUrl,
            status: 'completed',
            thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            videoTitle,
            videoId
        });
        await livestream.save();

        // Save clips
        const savedClips = [];

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            const newId = new mongoose.Types.ObjectId();

            const newClip = new Clip({
                _id: newId,
                livestreamId: livestream._id,
                clipNumber: nanoid(10),
                title: clip.title || `Clip ${i + 1}`,
                timestampStart: clip.timestampStart || '00:00:00',
                timestampEnd: clip.timestampEnd || '00:00:30',
                category: clip.category || 'Uncategorized',
                summary: clip.summary || '',
                keyLine: clip.keyLine || '',
                whyItWorks: clip.whyItWorks || '',
                suggestedLength: clip.suggestedLength || '',
                suggestedTitles: clip.suggestedTitles || []
            });
            await newClip.save();
            savedClips.push(newClip);
        }

        return NextResponse.json({
            message: 'Import successful',
            clips: savedClips,
            livestream: {
                id: livestream._id,
                url: livestream.url
            }
        });

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ message: 'Server error during import' }, { status: 500 });
    }
}
