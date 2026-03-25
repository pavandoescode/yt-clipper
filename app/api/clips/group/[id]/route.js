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
