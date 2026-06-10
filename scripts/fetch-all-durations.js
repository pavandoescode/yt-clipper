const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Manually load .env.local because we're running as a standalone node script
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
    }
});

const MONGODB_URI = env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not found in .env.local');
    process.exit(1);
}

// 2. Define Schema (Simplified for script)
const channelStreamSchema = new mongoose.Schema({
    videoId: String,
    title: String,
    duration: String
}, { collection: 'channelstreams' }); // Use the actual collection name

const ChannelStream = mongoose.models.ChannelStream || mongoose.model('ChannelStream', channelStreamSchema);

async function run() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected!');

        // 3. Find streams with missing or '0' duration
        const streams = await ChannelStream.find({
            $or: [
                { duration: { $exists: false } },
                { duration: '' },
                { duration: '0' },
                { duration: null }
            ]
        });

        console.log(`Found ${streams.length} streams to update.`);

        for (let i = 0; i < streams.length; i++) {
            const stream = streams[i];
            const url = `https://www.youtube.com/watch?v=${stream.videoId}`;
            
            console.log(`[${i + 1}/${streams.length}] Fetching duration for: ${stream.title} (${stream.videoId})`);
            
            try {
                const duration = execSync(`python -m yt_dlp --get-duration "${url}"`, { encoding: 'utf8' }).trim();
                
                if (duration) {
                    stream.duration = duration;
                    await stream.save();
                    console.log(`  ✅ Saved: ${duration}`);
                } else {
                    console.log(`  ⚠️ No duration returned for ${stream.videoId}`);
                }
            } catch (err) {
                console.error(`  ❌ Failed to fetch for ${stream.videoId}: ${err.message}`);
            }
        }

        console.log('\nBatch update complete! 🎉');
        process.exit(0);

    } catch (error) {
        console.error('Fatal Error:', error);
        process.exit(1);
    }
}

run();
