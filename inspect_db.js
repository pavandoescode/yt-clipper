const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Manually parse .env.local
let MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    try {
        const envPath = path.join(__dirname, '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/MONGODB_URI=(.*)/);
            if (match && match[1]) {
                MONGODB_URI = match[1].trim().replace(/^["']|["']$/g, '');
            }
        }
    } catch (e) {
        console.error('Error reading .env.local:', e);
    }
}

async function inspect() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to DB');

        const collection = mongoose.connection.db.collection('clips');
        const clips = await collection.find({}).limit(5).toArray();

        console.log('--- DB INSPECTION ---');
        clips.forEach(clip => {
            console.log(`ID: ${clip._id} | clipNumber: "${clip.clipNumber}" | Type: ${typeof clip.clipNumber} | Length: ${clip.clipNumber?.length}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

inspect();
