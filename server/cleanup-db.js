import mongoose from 'mongoose';
import 'dotenv/config';

async function dropCollections() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected');

        const db = mongoose.connection.db;

        // Drop unused collections
        const collections = ['users', 'chunkedsegments', 'combinededits'];

        for (const name of collections) {
            try {
                await db.dropCollection(name);
                console.log(`🗑️  Dropped: ${name}`);
            } catch (e) {
                if (e.code === 26) {
                    console.log(`⏭️  Skipped: ${name} (doesn't exist)`);
                } else {
                    console.log(`❌ Error dropping ${name}:`, e.message);
                }
            }
        }

        console.log('\n✅ Cleanup complete!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

dropCollections();
