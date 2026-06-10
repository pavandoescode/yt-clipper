import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
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
        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;

        const livestreams = await Livestream.find({
            url: cleanUrl
        }).sort({ createdAt: -1 });

        if (!livestreams || livestreams.length === 0) {
            return NextResponse.json({ clips: [], exists: false });
        }

        const livestreamIds = livestreams.map(ls => ls._id);
        const clips = await Clip.find({
            livestreamId: { $in: livestreamIds }
        }).sort({ createdAt: -1 });

        return NextResponse.json({
            clips,
            exists: clips.length > 0,
            livestream: {
                id: livestreams[0]._id,
                title: livestreams[0].videoTitle,
                status: livestreams[0].status
            }
        });
    } catch (error) {
        console.error('Get clips by video error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
