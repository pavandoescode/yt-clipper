import mongoose from 'mongoose';
import connectDB from './lib/db.js';
import ClipGroup from './models/ClipGroup.js';

async function migrate() {
    await connectDB();
    const groups = await ClipGroup.find({ groupNumber: { $exists: false } });
    console.log(`Found ${groups.length} groups without numbers.`);
    
    for (const group of groups) {
        const groupNumber = 'GP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
        group.groupNumber = groupNumber;
        await group.save();
        console.log(`Assigned ${groupNumber} to group: ${group.name}`);
    }
    
    mongoose.connection.close();
}

migrate();
