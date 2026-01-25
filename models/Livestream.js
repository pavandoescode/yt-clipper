import mongoose from 'mongoose';

const livestreamSchema = new mongoose.Schema({
    url: {
        type: String,
        required: [true, 'YouTube URL is required']
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    videoId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    title: {
        type: String,
        default: 'Untitled Livestream'
    },
    videoTitle: {
        type: String,
        default: ''
    },
    thumbnail: {
        type: String,
        default: ''
    },
    videoUploadDate: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'analyzing', 'completed', 'failed'],
        default: 'pending'
    }
}, {
    timestamps: true
});

const Livestream = mongoose.models.Livestream || mongoose.model('Livestream', livestreamSchema);
export default Livestream;
