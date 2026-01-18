import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import clipRoutes from './routes/clips.js';
import channelRoutes from './routes/channel.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5000', process.env.FRONTEND_URL].filter(Boolean),
    credentials: true
}));
// Increase body size limit to 50MB for base64 image data
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clips', clipRoutes);
app.use('/api/channel', channelRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'YT Clipper API is running' });
});

// Serve React app for all non-API routes (must be after API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB and start server
console.log('🔗 Connecting to MongoDB Atlas...');

mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority'
})
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('\n⚠️  If you see IP-related errors, go to MongoDB Atlas:');
        console.log('   1. Go to Network Access');
        console.log('   2. Click "Add IP Address"');
        console.log('   3. Click "Allow Access from Anywhere" (0.0.0.0/0)');
        console.log('   4. Wait 1-2 minutes and restart the server\n');
        process.exit(1);
    });

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (error) => {
    console.error('⚠️ Uncaught Exception:', error?.message || error);
});
