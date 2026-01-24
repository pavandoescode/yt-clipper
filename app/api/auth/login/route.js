import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import Settings from '@/models/Settings';
import connectDB from '@/lib/db';

export async function POST(request) {
    try {
        await connectDB();
        const { pin } = await request.json();

        if (!pin) {
            return NextResponse.json({ message: 'PIN is required' }, { status: 400 });
        }

        // Verify PIN
        const isValid = await Settings.verifyPin(pin);
        if (!isValid) {
            return NextResponse.json({ message: 'Invalid PIN' }, { status: 400 });
        }

        // Generate Token
        const settings = await Settings.getSettings();
        const token = jwt.sign(
            { pinHash: settings.pinHash },
            process.env.JWT_SECRET,
            { expiresIn: '14d' }
        );

        return NextResponse.json({
            message: 'Login successful',
            token,
            user: { id: 'admin', email: 'admin@ytclipper.local' }
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ message: 'Server error during login' }, { status: 500 });
    }
}
