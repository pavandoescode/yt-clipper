import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
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

        // We need to require the Livestream model to ensure it's registered
        // even if we don't use it directly here, because populate uses it
        require('@/models/Livestream');

        const clips = await Clip.find({
            isSaved: true
        }).populate('livestreamId').sort({ createdAt: -1 });

        return NextResponse.json({ clips });
    } catch (error) {
        console.error('Fetch saved error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
