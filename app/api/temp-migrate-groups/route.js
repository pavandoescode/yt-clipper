import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ClipGroup from '@/models/ClipGroup';

export async function GET() {
    try {
        await connectDB();
        const groups = await ClipGroup.find({ groupNumber: { $exists: false } });
        const results = [];
        
        for (const group of groups) {
            const groupNumber = 'GP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
            group.groupNumber = groupNumber;
            await group.save();
            results.push({ id: group._id, name: group.name, groupNumber });
        }
        
        return NextResponse.json({ message: `Migrated ${groups.length} groups`, results });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json({ message: 'Migration failed', error: error.message }, { status: 500 });
    }
}
