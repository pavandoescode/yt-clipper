import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
    const auth = await verifyAuth(request);

    if (!auth) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
        user: auth.user
    });
}
