import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import connectDB from '@/lib/db';

export async function GET(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const livestreams = await Livestream.find({}).sort({ createdAt: -1 }).lean();

        // Serialize fields ensuring everything is a string/primitive
        const serializedLivestreams = livestreams.map(stream => ({
            ...stream,
            _id: stream._id.toString(),
            userId: stream.userId ? stream.userId.toString() : null,
            createdAt: stream.createdAt?.toISOString(),
            updatedAt: stream.updatedAt?.toISOString(),
        }));

        return NextResponse.json({
            success: true,
            data: { livestreams: serializedLivestreams }
        });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' }
        }, { status: 500 });
    }
}
