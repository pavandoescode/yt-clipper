import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import connectDB from '@/lib/db';

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
        const sortOrder = searchParams.get('sortOrder') === 'new' ? -1 : 1;

        const filter = showDone ? { isDone: true } : { $or: [{ isDone: false }, { isDone: { $exists: false } }, { isDone: null }] };
        const total = await ChannelStream.countDocuments(filter);
        const totalDone = await ChannelStream.countDocuments({ isDone: true });
        const totalAll = await ChannelStream.countDocuments({});

        const streams = await ChannelStream.find(filter)
            .sort({ publishedAt: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // Get clip counts for each stream
        const streamsWithClips = await Promise.all(streams.map(async (stream) => {
            const livestreams = await Livestream.find({
                url: { $regex: stream.videoId }
            }).lean();

            let clipCount = 0;
            if (livestreams.length > 0) {
                const livestreamIds = livestreams.map(ls => ls._id);
                clipCount = await Clip.countDocuments({ livestreamId: { $in: livestreamIds } });
            }

            return { ...stream, clipCount };
        }));

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
