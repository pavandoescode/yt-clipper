import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 9;
        const showDone = searchParams.get('showDone') === 'true';
        const hasClips = searchParams.get('hasClips') === 'true';
        const sortOrder = searchParams.get('sortOrder') === 'new' ? -1 : 1;

        let filter = showDone ? { isDone: true } : { $or: [{ isDone: false }, { isDone: { $exists: false } }, { isDone: null }] };

        if (hasClips) {
            // Find clips to get livestream IDs
            const distinctLivestreamIds = await Clip.distinct('livestreamId');

            // Find livestreams with those IDs to get videoIds
            const livestreamsWithClips = await Livestream.find({
                _id: { $in: distinctLivestreamIds }
            }).select('videoId').lean();

            const videoIdsWithClips = livestreamsWithClips.map(ls => ls.videoId);

            // Add to filter
            filter.videoId = { $in: videoIdsWithClips };
        }
        const total = await ChannelStream.countDocuments(filter);
        const totalDone = await ChannelStream.countDocuments({ isDone: true });
        const totalAll = await ChannelStream.countDocuments({});

        const streams = await ChannelStream.find(filter)
            .sort({ publishedAt: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Get clip counts AND isDone status for each stream
        // Efficiently get clip counts using the new videoId field
        const videoIds = streams.map(s => s.videoId);
        const livestreams = await Livestream.find({ videoId: { $in: videoIds } }).select('_id videoId isDone').lean();

        const livestreamIds = livestreams.map(ls => ls._id);
        const clipCounts = await Clip.aggregate([
            { $match: { livestreamId: { $in: livestreamIds } } },
            { $group: { _id: '$livestreamId', count: { $sum: 1 } } }
        ]);

        const clipCountMap = {};
        clipCounts.forEach(c => {
            clipCountMap[c._id.toString()] = c.count;
        });

        const videoToClipCount = {};
        const videoToIsDone = {};

        livestreams.forEach(ls => {
            const count = clipCountMap[ls._id.toString()];
            if (count) {
                videoToClipCount[ls.videoId] = (videoToClipCount[ls.videoId] || 0) + count;
            }
            if (ls.isDone) {
                videoToIsDone[ls.videoId] = true;
            }
        });

        // Sync logic: If Livestream is done but ChannelStream is not, update ChannelStream
        const updates = [];
        const streamsWithClips = streams.map(stream => {
            let effectiveIsDone = stream.isDone;

            // If ChannelStream says not done, but Livestream says done, trust Livestream
            if (!stream.isDone && videoToIsDone[stream.videoId]) {
                effectiveIsDone = true;
                updates.push(stream._id);
            }

            return {
                ...stream,
                clipCount: videoToClipCount[stream.videoId] || 0,
                isDone: effectiveIsDone
            };
        }).filter(stream => {
            // Apply filter again because we might have discovered it's actually done
            if (!showDone && stream.isDone) return false;
            // If we are showing done, and we found it is done, we keep it. 
            // If we are showing done, and it is NOT done, it wouldn't be here mostly (unless filter logic was complex).
            // But main issue is hiding "Done" streams in "Pending" view.
            return true;
        });

        // Async update strict consistency
        if (updates.length > 0) {
            // we don't await this to keep response fast, or we can await if we want to be sure
            // Let's await to be safe and avoid race conditions or confusion
            await ChannelStream.updateMany(
                { _id: { $in: updates } },
                { $set: { isDone: true } }
            );
        }

        return NextResponse.json({
            streams: streamsWithClips,
            total,
            totalDone,
            totalAll,
            page,
            totalPages: Math.ceil(total / limit),
            hasMore: page * limit < total
        });
    } catch (error) {
        console.error('Fetch streams error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
