import jwt from 'jsonwebtoken';
import Settings from '../models/Settings.js';

const auth = async (req, res, next) => {
    try {
        // Check Authorization header first, then fall back to query param (for SSE)
        let token = req.header('Authorization')?.replace('Bearer ', '');

        // For SSE endpoints, token might be in query params
        if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if PIN has changed (invalidate old tokens)
        const settings = await Settings.getSettings();
        if (decoded.pinHash !== settings.pinHash) {
            return res.status(401).json({ message: 'PIN changed, please re-login' });
        }

        // Set a fake user object for compatibility
        req.user = { _id: 'admin', email: 'admin@ytclipper.local' };
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

export default auth;
