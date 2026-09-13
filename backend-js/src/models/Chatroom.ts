import mongoose from "mongoose";


const ChatroomSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true,
        required: true,
    },
    type: {
        type: String,
        required: true,
    },
    lastMessageContent: {
        type: String,
        required: false,
    },
    participantCount: {
        type: Number,
        required: true,
    },
    participants: {
        type: [String],
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    isPermanent:{
        type: Boolean,
        default: false
    }
});

const Chatroom = mongoose.models.Chatroom || mongoose.model("Chatroom", ChatroomSchema);
export default Chatroom;
