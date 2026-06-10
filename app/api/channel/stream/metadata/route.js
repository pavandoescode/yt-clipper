import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import connectDB from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { videoId } = await request.json();
        if (!videoId) {
            return NextResponse.json({ message: 'Video ID is required' }, { status: 400 });
        }

        const url = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Use yt-dlp to get duration in seconds
        // --get-duration returns it in HH:MM:SS format normally
        // --print duration gives it in seconds which is easier
        const { stdout, stderr } = await execPromise(`python -m yt_dlp --get-duration "${url}"`);
        
        if (stderr && !stdout) {
            console.error('yt-dlp error:', stderr);
            return NextResponse.json({ message: 'Failed to fetch metadata' }, { status: 500 });
        }

        const durationStr = stdout.trim(); // e.g., "01:35:10" or "45:12"
        
        // Update the database
        const updatedStream = await ChannelStream.findOneAndUpdate(
            { videoId },
            { duration: durationStr },
            { new: true }
        );

        return NextResponse.json({ 
            success: true, 
            duration: durationStr,
            stream: updatedStream 
        });

    } catch (error) {
        console.error('Metadata fetch error:', error);
        return NextResponse.json({ message: 'Error: ' + error.message }, { status: 500 });
    }
}
