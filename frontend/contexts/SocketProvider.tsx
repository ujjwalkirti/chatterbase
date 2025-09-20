"use client";
import React, { useCallback, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

interface SocketProviderProps {
	children?: React.ReactNode;
}

interface ISocketContext {
	sendMessage: (message: string, senderId: string, receiverId: string) => void;
	messages: Message[];
	joinRooms: (userId: string, groupIds: string[]) => void;
	leaveRooms: (userId: string, groupIds: string[]) => void;
	isConnected: boolean;
	joinedChatRooms?: ChatRoom[];
}

const SocketContext = React.createContext<ISocketContext | null>(null);

export const useSocket = () => {
	const state = useContext(SocketContext);
	if (!state) throw new Error(`Socket context is undefined`);
	return state;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
	const [socket, setSocket] = useState<Socket>();
	const [messages, setMessages] = useState<Message[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const [joinedChatRooms, setJoinedChatRooms] = useState<ChatRoom[]>([]);

	const sendMessage = useCallback(
		(message: string, senderId: string, receiverId: string) => {
			if (socket) {
				socket.emit("message", JSON.stringify({ message, senderId, receiverId }));
			}
		},
		[socket]
	);

	const joinRooms = useCallback(
		(userId: string, groupIds: string[]) => {
			if (socket) {
				socket.emit("join-rooms", { userId, groupIds });
			}
		},
		[socket]
	);

	const onJoinRooms = useCallback(
		({ Username: joinedUsername, chatRoom: joinedChatRoom }: { Username: string, chatRoom: ChatRoom }) => {
			console.log(`User ${joinedUsername} joined the chatroom ${joinedChatRoom.name}`);
			setMessages((prev) => [
				...prev,
				{
					senderId: joinedUsername,
					message: `User ${joinedUsername} joined the chat.`,
					type: "system",
				},
			]);
			// add joined chatroom to state if not already present
			if (joinedChatRoom && !joinedChatRooms.find((room) => room._id === joinedChatRoom._id)) {
				setJoinedChatRooms((prev) => [...prev, joinedChatRoom]);
			}
		},
		[socket]
	);

	const leaveRooms = useCallback(
		(userId: string, groupIds: string[]) => {
			if (socket) {
				socket.emit("leave-rooms", { userId, groupIds });
			}
		},
		[socket]
	);

	const onLeaveRooms = useCallback(
		({ userId: joinedUserId }: { userId: string }) => {
			setMessages((prev) => [
				...prev,
				{
					senderId: joinedUserId,
					message: `User ${joinedUserId} left the chat.`,
					type: "system",
				},
			]);
		},
		[socket]
	);

	const onMessageRec = useCallback((payload: Message) => {
		setMessages((prev) => [...prev, payload]);
	}, []);

	useEffect(() => {
		const _socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000", {
			autoConnect: false,
		});

		_socket.on("connect", () => setIsConnected(true));
		_socket.on("disconnect", () => setIsConnected(false));
		_socket.on("message", (payload: any) => {
			onMessageRec(payload);
		});
		_socket.on("join-rooms", onJoinRooms);
		_socket.on("leave-rooms", onLeaveRooms);

		_socket.connect();
		setSocket(_socket);

		return () => {
			_socket.off("message");
			_socket.off("join-rooms");
			_socket.off("leave-rooms");
			_socket.disconnect();
		};
	}, []);


	return <SocketContext.Provider value={{ sendMessage, messages, joinRooms, leaveRooms, isConnected, joinedChatRooms }}>{children}</SocketContext.Provider>;
};
