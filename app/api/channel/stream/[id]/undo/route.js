import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import connectDB from '@/lib/db';

export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const stream = await ChannelStream.findByIdAndUpdate(
            id,
            { isDone: false },
            { new: true }
        );

        if (stream && stream.videoId) {
            const Livestream = (await import('@/models/Livestream')).default;
            await Livestream.updateOne({ videoId: stream.videoId }, { isDone: false });
        }

        if (!stream) {
            return NextResponse.json({ message: 'Stream not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: stream });
    } catch (error) {
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
