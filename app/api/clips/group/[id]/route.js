import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import ClipGroup from '@/models/ClipGroup';
import connectDB from '@/lib/db';

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Group ID required' }, { status: 400 });
        }

        const deletedGroup = await ClipGroup.findByIdAndDelete(id);
        
        if (!deletedGroup) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Delete group error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function PATCH(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        if (!id) {
            return NextResponse.json({ message: 'Group ID required' }, { status: 400 });
        }

        const { isDone } = await request.json();

        if (isDone) {
            // Ensure models are registered
            require('@/models/Clip');
            const Clip = (await import('@/models/Clip')).default;

            // 1. Find the group to get clip IDs
            const group = await ClipGroup.findById(id);
            if (!group) {
                return NextResponse.json({ message: 'Group not found' }, { status: 404 });
            }

            const clipIds = group.clips.map(c => c.clipId);

            // 2. Mark group as done
            group.isDone = true;
            await group.save();

            // 3. Mark all clips as unsaved
            if (clipIds.length > 0) {
                await Clip.updateMany(
                    { _id: { $in: clipIds } },
                    { $set: { isSaved: false } }
                );
            }

            return NextResponse.json({ message: 'Group marked as done and clips unsaved' });
        }

        return NextResponse.json({ message: 'No changes requested' }, { status: 400 });
    } catch (error) {
        console.error('Update group error:', error);
        return NextResponse.json({ message: 'Server error', details: error.message }, { status: 500 });
    }
}
