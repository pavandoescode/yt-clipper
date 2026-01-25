import Link from 'next/link';
import connectDB from '@/lib/db';
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

    // 2. Get the Livestreams
    const livestreams = await Livestream.find({ _id: { $in: livestreamIds } }).lean();

    // 3. Get the ChannelStreams to get rich metadata (views, duration)
    const videoIds = livestreams.map(ls => ls.videoId);
    const channelStreams = await ChannelStream.find({ videoId: { $in: videoIds } }).lean();

    const channelStreamMap = {};
    channelStreams.forEach(cs => channelStreamMap[cs.videoId] = cs);

    // 4. Merge data
    const streams = livestreams.map(ls => {
        const cs = channelStreamMap[ls.videoId] || {};
        return {
            _id: cs._id ? cs._id.toString() : ls._id.toString(), // Prefer ChannelStream ID if available for actions
            livestreamId: ls._id.toString(), // Explicitly pass Livestream ID for navigation
            videoId: ls.videoId,
            title: cs.title || ls.videoTitle || ls.title,
            thumbnail: cs.thumbnail || ls.thumbnail,
            publishedAt: cs.publishedAt ? cs.publishedAt.toISOString() : (ls.updatedAt || new Date()).toISOString(),
            duration: cs.duration,
            viewCount: cs.viewCount,
            clipCount: clipCountMap[ls._id.toString()] || 0,
            isLivestreamDoc: true // Marker
        };
    }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

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
