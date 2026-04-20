import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String },
    address: { type: String },
    isVerified: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['customer', 'cashier', 'admin'],
        default: 'customer'
    },
    verificationCode: { type: String, default: null },
    verificationExpiry: { type: Date, default: null }
}, { timestamps: true });
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
export const UserModel = mongoose.model('User', UserSchema);
