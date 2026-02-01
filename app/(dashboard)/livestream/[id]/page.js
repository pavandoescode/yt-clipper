import { notFound } from 'next/navigation';
import connectDB from '@/lib/db';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import LivestreamClipsList from '@/components/LivestreamClipsList';
import { verifyAuth } from '@/lib/auth'; // Ensure we can verify auth if needed, usually middleware handles this, but here we can check if needed or just rely on layout. Assuming layout/middleware protects dashboard.

export default async function LivestreamDetailsPage({ params }) {
    const { id } = await params;
    await connectDB();

    const livestreamDoc = await Livestream.findOne({ _id: id }).lean();

    if (!livestreamDoc) {
        notFound();
    }

    const clipsDocs = await Clip.find({ livestreamId: id }).sort({ clipNumber: 1 }).lean();
    console.log(`[DEBUG] Fetched ${clipsDocs.length} clips for ${id}`);
    if (clipsDocs.length > 0) {
        console.log('[DEBUG] First clip:', JSON.stringify(clipsDocs[0], null, 2));
    }

    // Serialization helper
    const serialize = (doc) => {
        const { _id, createdAt, updatedAt, livestreamId, userId, ...rest } = doc;
        return {
            _id: _id.toString(),
            livestreamId: livestreamId ? livestreamId.toString() : undefined,
            userId: userId ? userId.toString() : undefined,
            createdAt: createdAt?.toISOString(),
            updatedAt: updatedAt?.toISOString(),
            ...rest
        };
    };

    const serializedLivestream = serialize(livestreamDoc);
    const serializedClips = clipsDocs.map(serialize);

    return (
        <LivestreamClipsList
            initialLivestream={serializedLivestream}
            initialClips={serializedClips}
            livestreamId={id}
        />
    );
}
