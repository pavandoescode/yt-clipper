import mongoose from 'mongoose';
import crypto from 'crypto';

const settingsSchema = new mongoose.Schema({
    pinHash: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Helper to hash PIN
settingsSchema.statics.hashPin = function (pin) {
    return crypto.createHash('sha256').update(pin).digest('hex');
};

// Get or create settings
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        // Default PIN is 1234
        settings = await this.create({
            pinHash: this.hashPin('1234')
        });
    }
    return settings;
};

// Verify PIN
settingsSchema.statics.verifyPin = async function (pin) {
    const settings = await this.getSettings();
    return settings.pinHash === this.hashPin(pin);
};

// Change PIN
settingsSchema.statics.changePin = async function (newPin) {
    const settings = await this.getSettings();
    settings.pinHash = this.hashPin(newPin);
    await settings.save();
    return settings;
};

const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
