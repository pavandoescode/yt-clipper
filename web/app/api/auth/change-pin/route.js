import { NextResponse } from 'next/server';
import Settings from '@/models/Settings';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/db';

export async function PATCH(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);

        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { currentPin, newPin } = await request.json();

        if (!currentPin || !newPin) {
            return NextResponse.json({ message: 'Current PIN and new PIN are required' }, { status: 400 });
        }

        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            return NextResponse.json({ message: 'New PIN must be exactly 4 digits' }, { status: 400 });
        }

        // Verify current PIN
        const isValid = await Settings.verifyPin(currentPin);
        if (!isValid) {
            return NextResponse.json({ message: 'Current PIN is incorrect' }, { status: 400 });
        }

        // Change PIN
        await Settings.changePin(newPin);

        return NextResponse.json({ message: 'PIN changed successfully. Please login again.' });
    } catch (error) {
        console.error('Change PIN error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}
