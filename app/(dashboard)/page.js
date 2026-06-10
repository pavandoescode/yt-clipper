import Link from 'next/link';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

import ChannelStream from '@/models/ChannelStream';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import StreamList from '@/components/StreamList'; // We'll extract the UI to a component

export default async function ClipsPage() {

    await connectDB();

    // Strategy: Find streams that have clips. 
    // This is more reliable than paging through ChannelStreams and checking for clips.

    // 1. Get all unique livestreamIds from Clips
    const clipsAgg = await Clip.aggregate([
        { $group: { _id: '$livestreamId', count: { $sum: 1 } } }
    ]);

    const livestreamIds = clipsAgg.map(c => c._id);
    const clipCountMap = {};
    clipsAgg.forEach(c => clipCountMap[c._id.toString()] = c.count);

    // 2. Get the Livestreams (exclude done)
    const livestreams = await Livestream.find({
        _id: { $in: livestreamIds },
        isDone: { $ne: true }
    }).lean();

    // 3. Get the ChannelStreams to get rich metadata (views, duration)
    const videoIds = livestreams.map(ls => ls.videoId);
    const channelStreams = await ChannelStream.find({ videoId: { $in: videoIds } }).lean();

    const channelStreamMap = {};
    channelStreams.forEach(cs => channelStreamMap[cs.videoId] = cs);

    // 4. Merge data
    // 4. Merge data and Deduplicate by videoId
    const streamsMap = new Map();

    livestreams.forEach(ls => {
        const cs = channelStreamMap[ls.videoId] || {};
        const count = clipCountMap[ls._id.toString()] || 0;
        const publishedAt = cs.publishedAt ? cs.publishedAt.toISOString() : (ls.videoUploadDate || (ls.createdAt ? ls.createdAt.toISOString() : new Date().toISOString()));

        if (streamsMap.has(ls.videoId)) {
            const existing = streamsMap.get(ls.videoId);
            existing.clipCount += count;
            // If the current stream is marked as done, update the existing entry to be done
            if (cs.isDone || ls.isDone) {
                existing.isDone = true;
            }
            // Keep the most recent ID or metadata if needed, but usually they are identical for the same video
        } else {
            streamsMap.set(ls.videoId, {
                _id: cs._id ? cs._id.toString() : ls._id.toString(),
                livestreamId: ls._id.toString(),
                videoId: ls.videoId,
                title: cs.title || ls.videoTitle || ls.title,
                thumbnail: cs.thumbnail || ls.thumbnail,
                publishedAt: publishedAt,
                duration: cs.duration,
                viewCount: cs.viewCount,
                clipCount: count,
                isLivestreamDoc: true,
                isDone: cs.isDone || ls.isDone
            });
        }
    });

    const streams = Array.from(streamsMap.values())
        .filter(s => !s.isDone)
        .sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    return (
        <>
            <div className="page-header">
                <h1>Active Clips</h1>
                <p>Manage streams with extracted clips</p>
            </div>

            <StreamList initialStreams={streams} />
        </>
    );
}
