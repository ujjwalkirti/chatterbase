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
	const [activeUsers, setActiveUsers] = useState<string[]>([]);

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
		({ userId: joinedUserId }: { userId: string }) => {
			setMessages((prev) => [
				...prev,
				{
					senderId: joinedUserId,
					message: `User ${joinedUserId} joined the chat.`,
					type: "system",
				},
			]);
			setActiveUsers((prev) => (prev.includes(joinedUserId) ? prev : [...prev, joinedUserId]));
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
			setActiveUsers((prev) => prev.filter((id) => id !== joinedUserId));
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


	return <SocketContext.Provider value={{ sendMessage, messages, joinRooms, leaveRooms, isConnected }}>{children}</SocketContext.Provider>;
};
