import mongoose from 'mongoose';

const channelStreamSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true
    },
    thumbnail: {
        type: String
    },
    channelId: {
        type: String,
        required: true
    },
    channelTitle: {
        type: String
    },
    publishedAt: {
        type: Date,
        required: true
    },
    duration: {
        type: String
    },
    viewCount: {
        type: String
    },
    isAnalyzed: {
        type: Boolean,
        default: false
    },
    isDone: {
        type: Boolean,
        default: false
    },
    livestreamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Livestream'
    }
}, {
    timestamps: true
});

export default mongoose.models.ChannelStream || mongoose.model('ChannelStream', channelStreamSchema);
