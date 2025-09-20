import { MongooseError } from "mongoose";
import Chatroom from "../models/Chatroom";
import RedisService from "./redis";

class ChatRoomService {
    private redisService = new RedisService();
    private pub;
    constructor() {
        this.pub = this.redisService.pub;
    }

    async createChatRoom(chatRoomDetails: any) {
        try {
            if (!chatRoomDetails)
                return { success: false, message: "Chat room details not provided" };

            const chatRoom = await Chatroom.create({
                ...chatRoomDetails,
                participantCount: 0,
            });
            return {
                success: true,
                message: "Chat room created successfully",
                data: chatRoom,
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
                    error: error,
                };
            }
        }
    }

    async getAllChatRooms() {
        try {
            const chatRooms = await Chatroom.find({}).sort({ participantCount: -1 });
            return {
                success: true,
                message: "Chat rooms fetched successfully",
                data: chatRooms,
            };
        } catch (error) {
            console.log(error);
            return { success: false, message: "Internal Server Error", error: error };
        }
    }

    async enterChatRoom(chatRoomId: string, username: string) {
        try {
            if (!chatRoomId)
                return { success: false, message: "Chat room ID not provided" };
            const chatRoom = await Chatroom.findById(chatRoomId);
            if (!chatRoom) return { success: false, message: "Chat room not found" };

            chatRoom.participantCount += 1;
            chatRoom.participants.push(username);
            await chatRoom.save();

            // redis publish join-groups event
            this.pub.publish(
                "JOIN-GROUPS",
                JSON.stringify({ username, chatRoom: chatRoom.toObject() })
            );

            return {
                success: true,
                message: "Entered chat room successfully",
                data: chatRoom.toObject(),
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
                    error: error,
                };
            }
        }
    }
}

export default ChatRoomService;
