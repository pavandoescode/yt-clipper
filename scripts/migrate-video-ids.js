const mongoose = require('mongoose');
const URI = process.env.MONGODB_URI || 'mongodb+srv://pavandoescode_db_user:UOaZJzEfAeSeDGfY@cluster0.skejfmh.mongodb.net/yt-clipper';

const livestreamSchema = new mongoose.Schema({
    url: String,
    videoId: String
}, { strict: false });
const Livestream = mongoose.models.Livestream || mongoose.model('Livestream', livestreamSchema);

async function run() {
    await mongoose.connect(URI);
    console.log('Connected to DB');

    const streams = await Livestream.find({
        $or: [
            { videoId: { $exists: false } },
            { videoId: null },
            { videoId: "" }
        ]
    });

    console.log(`Found ${streams.length} streams to migrate.`);

    for (const stream of streams) {
        if (stream.url) {
            const match = stream.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\s?]+)/);
            if (match && match[1]) {
                const videoId = match[1];
                console.log(`Updating ${stream._id}: ${stream.url} -> ${videoId}`);
                await Livestream.updateOne({ _id: stream._id }, { $set: { videoId: videoId } });
            } else {
                console.log(`Could not extract videoId from ${stream._id}: ${stream.url}`);
            }
        }
    }

    console.log('Migration complete.');
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
