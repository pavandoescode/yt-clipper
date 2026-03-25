import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Clip from '@/models/Clip';
import connectDB from '@/lib/db';

export async function PATCH(request, props) {
    const params = await props.params;
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const { customTitle, thumbnailText } = await request.json();

        const clip = await Clip.findById(id);

        if (!clip) {
            return NextResponse.json({ message: 'Clip not found' }, { status: 404 });
        }

        if (customTitle !== undefined) clip.customTitle = customTitle;
        if (thumbnailText !== undefined) clip.thumbnailText = thumbnailText;

        await clip.save();

        return NextResponse.json({ message: 'Text saved', clip });
    } catch (error) {
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
