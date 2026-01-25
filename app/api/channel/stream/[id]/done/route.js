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

        // Try updating ChannelStream first
        let stream = await ChannelStream.findByIdAndUpdate(
            id,
            { isDone: true },
            { new: true }
        );

        // If not found (or even if found), try updating Livestream
        // We might be passing a Livestream ID, or we might want to sync both
        if (!stream) {
            // Try as Livestream ID
            const livestream = await Livestream.findByIdAndUpdate(
                id,
                { isDone: true },
                { new: true }
            );

            if (livestream) {
                return NextResponse.json({ success: true, type: 'Livestream', data: livestream });
            }

            return NextResponse.json({ message: 'Stream not found' }, { status: 404 });
        } else {
            // If we found a ChannelStream, also try to mark linked Livestream as done if it exists
            if (stream.videoId) {
                await Livestream.updateOne({ videoId: stream.videoId }, { isDone: true });
            }
        }

        return NextResponse.json({ success: true, type: 'ChannelStream', data: stream });
    } catch (error) {
        console.error('Mark Done Error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
