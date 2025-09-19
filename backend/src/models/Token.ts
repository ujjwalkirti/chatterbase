import mongoose from "mongoose";

const TokenSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    deviceFingerprint: {
        type: String,
        required: true,
    },
    expired: {
        type: Boolean,
        required: true,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Token =  mongoose.models.Token || mongoose.model("Token", TokenSchema);
export default Token;
