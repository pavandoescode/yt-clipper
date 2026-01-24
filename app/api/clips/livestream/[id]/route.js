import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import connectDB from '@/lib/db';

export async function GET(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const livestream = await Livestream.findOne({ _id: id });

        if (!livestream) {
            return NextResponse.json({ message: 'Livestream not found' }, { status: 404 });
        }

        const clips = await Clip.find({ livestreamId: livestream._id });

        return NextResponse.json({ livestream, clips });
    } catch (error) {
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const livestream = await Livestream.findOne({ _id: id });

        if (!livestream) {
            return NextResponse.json({ message: 'Livestream not found' }, { status: 404 });
        }

        // Delete all associated clips
        await Clip.deleteMany({ livestreamId: livestream._id });

        // Delete the livestream
        await Livestream.deleteOne({ _id: livestream._id });

        return NextResponse.json({ message: 'Livestream and all clips deleted successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
