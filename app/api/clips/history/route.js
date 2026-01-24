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

        const livestreams = await Livestream.find({}).sort({ createdAt: -1 });

        return NextResponse.json({ livestreams });
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
