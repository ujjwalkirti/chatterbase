import express from "express";
import authRouter from "./auth";
import chatroomRouter from "./chatroom";


const router = express.Router();

router.use('/auth', authRouter);
router.use('/chatroom', chatroomRouter);

export default router;
