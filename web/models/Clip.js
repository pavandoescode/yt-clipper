import mongoose from 'mongoose';

const clipSchema = new mongoose.Schema({
    livestreamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Livestream',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    clipNumber: {
        type: Number,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    timestampStart: {
        type: String,
        required: true
    },
    timestampEnd: {
        type: String,
        required: true
    },
    category: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    keyLine: {
        type: String,
        default: ''
    },
    whyItWorks: {
        type: String,
        default: ''
    },
    suggestedLength: {
        type: String,
        default: ''
    },
    suggestedTitles: [{
        type: String
    }],
    isSaved: {
        type: Boolean,
        default: false
    },
    customTitle: {
        type: String,
        default: ''
    },
    thumbnailTopText: {
        type: String,
        default: ''
    },
    thumbnailMainText: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Prevent overwrite on hot reload
const Clip = mongoose.models.Clip || mongoose.model('Clip', clipSchema);
export default Clip;
