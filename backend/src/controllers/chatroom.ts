import express, { Request, Response } from "express";
import ChatRoomService from "../services/chatroom";

const chatroomRouter = express.Router()

const chatroomService = new ChatRoomService();
chatroomRouter.get('/', async (req: Request, res: Response) => {
    try {
        const response = await chatroomService.getAllChatRooms();
        if (response.success) {
            res.status(200).send(response);
        } else {
            res.status(400).send(response);
        }
    } catch (error) {
        res.status(500).send({ success: false, message: "Internal Server Error" });
    }
})
chatroomRouter.post('/create', async (req: Request, res: Response) => {
    try {
        const { chatRoomDetails } = req.body;
        const response = await chatroomService.createChatRoom(chatRoomDetails);
        if (response.success) {
            res.status(200).send(response);
        } else {
            res.status(400).send(response);
        }
    } catch (error) {
        res.status(500).send({ success: false, message: "Internal Server Error" });
    }
})


export default chatroomRouter;
