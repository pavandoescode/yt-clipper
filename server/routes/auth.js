import express from 'express';
import jwt from 'jsonwebtoken';
import Settings from '../models/Settings.js';

const router = express.Router();

// Generate JWT token (14 days)
const generateToken = async (pinHash) => {
    return jwt.sign({ pinHash }, process.env.JWT_SECRET, { expiresIn: '14d' });
};

// POST /api/auth/login - Login with PIN
router.post('/login', async (req, res) => {
    try {
        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({ message: 'PIN is required' });
        }

        // Verify PIN against database
        const isValid = await Settings.verifyPin(pin);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid PIN' });
        }

        // Get settings for pinHash
        const settings = await Settings.getSettings();
        const token = await generateToken(settings.pinHash);

        res.json({
            message: 'Login successful',
            token,
            user: { id: 'admin', email: 'admin@ytclipper.local' }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// GET /api/auth/me - Verify token
router.get('/me', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if PIN has changed (invalidate old tokens)
        const settings = await Settings.getSettings();
        if (decoded.pinHash !== settings.pinHash) {
            return res.status(401).json({ message: 'PIN changed, please re-login' });
        }

        res.json({
            user: { id: 'admin', email: 'admin@ytclipper.local' }
        });
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
});

// PATCH /api/auth/change-pin - Change PIN
router.patch('/change-pin', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        jwt.verify(token, process.env.JWT_SECRET);

        const { currentPin, newPin } = req.body;

        if (!currentPin || !newPin) {
            return res.status(400).json({ message: 'Current PIN and new PIN are required' });
        }

        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            return res.status(400).json({ message: 'New PIN must be exactly 4 digits' });
        }

        // Verify current PIN
        const isValid = await Settings.verifyPin(currentPin);
        if (!isValid) {
            return res.status(400).json({ message: 'Current PIN is incorrect' });
        }

        // Change PIN
        await Settings.changePin(newPin);

        res.json({ message: 'PIN changed successfully. Please login again.' });
    } catch (error) {
        console.error('Change PIN error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});

export default router;
