import mongoose from 'mongoose';

const clipGroupSchema = new mongoose.Schema({
    groupNumber: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    clips: [{
        clipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Clip',
            required: true
        },
        order: {
            type: Number,
            required: true
        }
    }],
    userId: {
        type: String
    },
    isDone: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Prevent overwrite on hot reload
if (process.env.NODE_ENV !== 'production') {
    delete mongoose.models.ClipGroup;
}

const ClipGroup = mongoose.models.ClipGroup || mongoose.model('ClipGroup', clipGroupSchema);
export default ClipGroup;
