import { MongooseError } from "mongoose";
import Chatroom from "../models/Chatroom";

class ChatRoomService {
    constructor() { }

    async createChatRoom(chatRoomDetails: any) {
        try {
            if (!chatRoomDetails) return { success: false, message: "Chat room details not provided" }

            const chatRoom = await Chatroom.create({ ...chatRoomDetails, participantCount: 0 });
            return {
                success: true,
                message: "Chat room created successfully",
                data: chatRoom
            };

        } catch (error) {
            console.log(error);
            if (error instanceof MongooseError) {
                return {
                    success: false,
                    message: error.message,
                };
            } else {
                console.log(error);
                return {
                    success: false,
                    message: "Internal Server Error",
                    error: error
                };
            }
        }
    }

    async getAllChatRooms() {
        try {
            const chatRooms = await Chatroom.find({}).sort({ participantCount: -1 });
            return { success: true, message: "Chat rooms fetched successfully", data: chatRooms };
        } catch (error) {
            console.log(error);
            return { success: false, message: "Internal Server Error", error: error };
        }
    }
}

export default ChatRoomService;
