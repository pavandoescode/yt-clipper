import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ChannelStream from '@/models/ChannelStream';
import connectDB from '@/lib/db';

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Find duplicates by videoId
        const duplicates = await ChannelStream.aggregate([
            { $group: { _id: '$videoId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
            { $match: { count: { $gt: 1 } } }
        ]);

        let removedCount = 0;
        for (const dup of duplicates) {
            // Keep the first one, delete the rest
            const idsToDelete = dup.ids.slice(1);
            await ChannelStream.deleteMany({ _id: { $in: idsToDelete } });
            removedCount += idsToDelete.length;
        }

        return NextResponse.json({
            message: `Removed ${removedCount} duplicate streams`,
            duplicatesFixed: duplicates.length
        });
    } catch (error) {
        console.error('Cleanup duplicates error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
