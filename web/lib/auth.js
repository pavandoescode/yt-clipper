import jwt from 'jsonwebtoken';
import Settings from '@/models/Settings';
import connectDB from '@/lib/db';

export async function verifyAuth(request) {
    try {
        await connectDB();

        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return null;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if PIN has changed (invalidate old tokens)
        const settings = await Settings.getSettings();
        if (decoded.pinHash !== settings.pinHash) {
            return null;
        }

        return { user: { id: 'admin', email: 'admin@ytclipper.local' } };
    } catch (error) {
        return null;
    }
}
