import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import connectDB from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const livestreams = await Livestream.find({}).sort({ createdAt: -1 }).lean();
        
        // Fetch done groups
        const ClipGroup = (await import('@/models/ClipGroup')).default;
        const doneGroups = await ClipGroup.find({ isDone: true }).populate({
            path: 'clips.clipId',
            populate: { path: 'livestreamId' }
        }).sort({ updatedAt: -1 }).lean();

        // Serialize fields ensuring everything is a string/primitive
        const serializedLivestreams = livestreams.map(stream => ({
            ...stream,
            _id: stream._id.toString(),
            userId: stream.userId ? stream.userId.toString() : null,
            createdAt: stream.createdAt?.toISOString(),
            updatedAt: stream.updatedAt?.toISOString(),
        }));

        const serializedGroups = doneGroups.map(group => ({
            ...group,
            _id: group._id?.toString(),
            userId: group.userId?.toString(),
            createdAt: group.createdAt?.toISOString(),
            updatedAt: group.updatedAt?.toISOString(),
            clips: group.clips.map(c => ({
                ...c,
                _id: c._id?.toString(),
                clipId: c.clipId ? {
                    ...c.clipId,
                    _id: c.clipId._id?.toString(),
                    livestreamId: c.clipId.livestreamId ? {
                        ...c.clipId.livestreamId,
                        _id: c.clipId.livestreamId._id?.toString()
                    } : null
                } : null
            }))
        }));

        return NextResponse.json({
            success: true,
            data: { 
                livestreams: serializedLivestreams,
                doneGroups: serializedGroups
            }
        });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' }
        }, { status: 500 });
    }
}
