import { Server } from "socket.io";
import RedisService from "./redis";
import Chatroom from "../models/Chatroom";

class SocketService {
  private _io: Server;
  private redisService = new RedisService();

  sub = this.redisService.sub;
  pub = this.redisService.pub;

  constructor() {
    console.log("init socket server");
    this._io = new Server({
      cors: {
        origin: "*",
        allowedHeaders: ["*"],
      },
    });

    this.sub.subscribe("MESSAGES");
    this.sub.subscribe("JOIN-GROUPS");
    this.sub.subscribe("LEAVE-GROUPS");
  }

  public initListeners() {
    const io = this.io;
    console.log("Init Socket Listeners...");

    io.on("connect", (socket) => {
      console.log(`New Socket Connected`, socket.id);

      // Client joins one or more rooms
      socket.on(
        "join-rooms",
        ({ userId, groupIds }: { userId: string; groupIds: string[] }) => {
          console.log(`User ${userId} joining rooms: ${groupIds.join(", ")}`);
          groupIds.forEach((groupId) => {
            this.pub.publish(
              "JOIN-GROUPS",
              JSON.stringify({ userId, groupId })
            );
            socket.join(groupId); // Join group as room
          });
        }
      );

      // Handle message send
      socket.on("message", async (payload: string) => {
        try {
          const { message, senderId, receiverId } = JSON.parse(payload);
          if (!senderId || !receiverId || !message) return;

          await this.pub.publish(
            "MESSAGES",
            JSON.stringify({
              senderId,
              receiverId, // could be groupId or userId
              message,
            })
          );
        } catch (err) {
          console.error("Invalid message format:", err);
        }
      });

      // Handle leaving groups
      socket.on(
        "leave-rooms",
        ({ userId, groupIds }: { userId: string; groupIds: string[] }) => {
          console.log(`User ${userId} leaving rooms: ${groupIds.join(", ")}`);
          groupIds.forEach((groupId) => {
            this.pub.publish(
              "LEAVE-GROUPS",
              JSON.stringify({ userId, groupId })
            );
            socket.leave(groupId); // Leave group as room
          });
        }
      );

      socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`);
      });
    });

    // Handle Redis-published messages
    this.sub.on("message", async (channel, message) => {
      if (channel === "MESSAGES") {
        try {
          const { senderId, receiverId, message: msg } = JSON.parse(message);

          // Just emit to the room
          this.io.to(receiverId).emit("message", {
            senderId,
            groupId: receiverId,
            message: msg,
          });

          console.log(`Broadcasted message to room ${receiverId}`);
        } catch (err) {
          console.error("Failed to parse message from Redis:", err);
        }
      } else if (channel === "JOIN-GROUPS") {
        try {
          const { userId, groupId } = JSON.parse(message);
          const chatroom = await Chatroom.findById(groupId);
          if (!chatroom.participants.includes(userId)) {
            await Chatroom.updateOne(
              { _id: groupId },
              {
                $inc: { participantCount: 1 },
                $push: { participants: userId },
              }
            );
          }
          // Emit join-rooms event as before
          this.io
            .to(groupId)
            .emit("join-rooms", { userId, groupIds: [groupId] });
          console.log(`Broadcasted message to room ${groupId}`);
        } catch (err) {
          console.error("Failed to parse message from Redis:", err);
        }
      } else if (channel === "LEAVE-GROUPS") {
        try {
          const { userId, groupId } = JSON.parse(message);
          console.log(`${userId} is leaving the grroup: ${groupId}`);
          const chatroom = await Chatroom.findById(groupId);
          if (chatroom.participants.includes(userId)) {
            await Chatroom.updateOne(
              { _id: groupId },
              {
                $inc: { participantCount: -1 },
                $pull: { participants: userId },
              }
            );
          }
          // Optionally emit an event to the room
          this.io
            .to(groupId)
            .emit("leave-rooms", { userId, groupIds: [groupId] });
          console.log(`User ${userId} left room ${groupId}`);
        } catch (err) {
          console.error("Failed to parse message from Redis:", err);
        }
      }
    });
  }

  get io() {
    return this._io;
  }
}

export default SocketService;
