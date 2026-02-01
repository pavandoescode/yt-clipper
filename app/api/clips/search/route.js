import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
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
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ clips: [] });
        }

        // We need the Livestream model populated
        require('@/models/Livestream');

        // Search by clipNumber (exact match preferably, or partial?)
        // Since IDs are short and unique, exact or startsWith is good.
        // Let's do partial match for better UX.
        const clips = await Clip.find({
            clipNumber: { $regex: query, $options: 'i' }
        }).limit(5).populate('livestreamId');

        return NextResponse.json({ clips });
    } catch (error) {
        console.error('Search clips error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
