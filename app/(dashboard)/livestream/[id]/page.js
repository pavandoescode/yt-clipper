import { notFound } from 'next/navigation';
import connectDB from '@/lib/db';
import Livestream from '@/models/Livestream';
import Clip from '@/models/Clip';
import LivestreamClipsList from '@/components/LivestreamClipsList';
import { verifyAuth } from '@/lib/auth'; // Ensure we can verify auth if needed, usually middleware handles this, but here we can check if needed or just rely on layout. Assuming layout/middleware protects dashboard.

export default async function LivestreamDetailsPage({ params }) {
    const { id } = await params;
    await connectDB();

    // 1. Fetch the requested livestream to get the videoId
    const currentLivestream = await Livestream.findOne({ _id: id }).lean();

    if (!currentLivestream) {
        notFound();
    }

    // 2. Find ALL livestreams with the same videoId (duplicates)
    const videoId = currentLivestream.videoId;
    const allSiblingStreams = await Livestream.find({ videoId }).select('_id').lean();
    const allLivestreamIds = allSiblingStreams.map(s => s._id);

    console.log(`[DEBUG] Found ${allLivestreamIds.length} streams for videoId ${videoId}`);

    // 3. Fetch clips for ALL these livestreams
    const clipsDocs = await Clip.find({ livestreamId: { $in: allLivestreamIds } })
        .sort({ clipNumber: 1 }) // You might want to sort by sorting options or creation time if numbers overlap
        .lean();

    console.log(`[DEBUG] Fetched ${clipsDocs.length} aggregated clips`);

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

    const serializedLivestream = serialize(currentLivestream);
    const serializedClips = clipsDocs.map(serialize);

    return (
        <LivestreamClipsList
            initialLivestream={serializedLivestream}
            initialClips={serializedClips}
            livestreamId={id}
        />
    );
}
