import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import connectDB from '@/lib/db';

export async function GET(request, props) {
    const params = await props.params;
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { videoId } = params;
        const stream = await ChannelStream.findOne({ videoId });

        if (!stream) {
            return NextResponse.json({ message: 'Stream not found' }, { status: 404 });
        }

        return NextResponse.json(stream);
    } catch (error) {
        console.error('Get stream by videoId error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
