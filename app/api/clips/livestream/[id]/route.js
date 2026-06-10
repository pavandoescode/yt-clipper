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
            return NextResponse.json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' }
            }, { status: 401 });
        }

        const { id } = await params;
        const livestream = await Livestream.findOne({ _id: id });

        if (!livestream) {
            return NextResponse.json({
                success: false,
                error: { code: 'RESOURCE_NOT_FOUND', message: 'Livestream not found' }
            }, { status: 404 });
        }

        const clips = await Clip.find({ livestreamId: livestream._id });

        return NextResponse.json({
            success: true,
            data: { livestream, clips }
        });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' }
        }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Unauthorized access' }
            }, { status: 401 });
        }

        const { id } = await params;
        const livestream = await Livestream.findOne({ _id: id });

        if (!livestream) {
            return NextResponse.json({
                success: false,
                error: { code: 'RESOURCE_NOT_FOUND', message: 'Livestream not found' }
            }, { status: 404 });
        }

        // Delete all associated clips
        await Clip.deleteMany({ livestreamId: livestream._id });

        // Delete the livestream
        await Livestream.deleteOne({ _id: livestream._id });

        return NextResponse.json({
            success: true,
            message: 'Livestream and all clips deleted successfully'
        });
    } catch (error) {
        console.error('API Delete Error:', error);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' }
        }, { status: 500 });
    }
}
