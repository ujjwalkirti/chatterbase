"use client";
import React, { useCallback, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface SocketProviderProps {
	children?: React.ReactNode;
}

interface ISocketContext {
	sendMessage: (message: string, senderId: string, roomId: string) => void;
	messages: Map<string, Message[]>;
	joinRoom: (userId: string, roomId: string) => void;
	leaveRoom: (userId: string, roomId: string) => void;
	isConnected: boolean;
	currentRoomId: string | null;
	setCurrentRoomId: (roomId: string | null) => void;
	onlineMembers: Map<string, OnlineMember[]>;
	getMessagesForRoom: (roomId: string) => Message[];
	getOnlineMembersForRoom: (roomId: string) => OnlineMember[];
}

const SocketContext = React.createContext<ISocketContext | null>(null);

export const useSocket = () => {
	const state = useContext(SocketContext);
	if (!state) throw new Error(`Socket context is undefined`);
	return state;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
	const [socket, setSocket] = useState<Socket>();
	const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
	const [isConnected, setIsConnected] = useState(false);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
	const [onlineMembers, setOnlineMembers] = useState<Map<string, OnlineMember[]>>(new Map());
	const socketRef = useRef<Socket | null>(null);

	const sendMessage = useCallback(
		(message: string, senderId: string, roomId: string) => {
			if (socketRef.current && message.trim()) {
				const payload = {
					message,
					senderId,
					roomId,
					timestamp: new Date().toISOString()
				};
				socketRef.current.emit("message", payload);

				// Optimistically add message to local state
				const newMessage: Message = {
					senderId,
					message,
					roomId,
					type: "user",
					timestamp: payload.timestamp
				};
				setMessages((prev) => {
					const newMap = new Map(prev);
					const roomMessages = newMap.get(roomId) || [];
					newMap.set(roomId, [...roomMessages, newMessage]);
					return newMap;
				});
			}
		},
		[]
	);

	const joinRoom = useCallback(
		(userId: string, roomId: string) => {
			if (socketRef.current) {
				socketRef.current.emit("join-room", { userId, roomId });
				setCurrentRoomId(roomId);
			}
		},
		[]
	);

	const leaveRoom = useCallback(
		(userId: string, roomId: string) => {
			if (socketRef.current) {
				socketRef.current.emit("leave-room", { userId, roomId });
				if (currentRoomId === roomId) {
					setCurrentRoomId(null);
				}
			}
		},
		[currentRoomId]
	);

	const getMessagesForRoom = useCallback((roomId: string): Message[] => {
		return messages.get(roomId) || [];
	}, [messages]);

	const getOnlineMembersForRoom = useCallback((roomId: string): OnlineMember[] => {
		return onlineMembers.get(roomId) || [];
	}, [onlineMembers]);

	useEffect(() => {
		const _socket = io(process.env.NEXT_PUBLIC_WEB_SOCKET_URL || "http://localhost:8000", {
			autoConnect: false,
			transports: ["websocket"],
			path: "/socket.io"
		});

		socketRef.current = _socket;

		_socket.on("connect", () => {
			console.log("Socket connected");
			setIsConnected(true);
		});

		_socket.on("disconnect", () => {
			console.log("Socket disconnected");
			setIsConnected(false);
		});

		_socket.on("message", (payload: Message) => {
			// Avoid adding duplicate messages (from optimistic update)
			setMessages((prev) => {
				const newMap = new Map(prev);
				const roomMessages = newMap.get(payload.roomId) || [];

				// Check if message already exists (from optimistic update)
				const isDuplicate = roomMessages.some(
					(msg) =>
						msg.senderId === payload.senderId &&
						msg.message === payload.message &&
						msg.timestamp === payload.timestamp
				);

				if (!isDuplicate) {
					newMap.set(payload.roomId, [...roomMessages, { ...payload, type: "user" }]);
				}
				return newMap;
			});
		});

		_socket.on("user-joined", ({ username, roomId }: { username: string; roomId: string }) => {
			console.log(`User ${username} joined room ${roomId}`);
			// Add system message for user joining
			setMessages((prev) => {
				const newMap = new Map(prev);
				const roomMessages = newMap.get(roomId) || [];
				const joinMessage: Message = {
					senderId: "system",
					message: `${username} joined the chat`,
					roomId,
					type: "system",
					timestamp: new Date().toISOString()
				};
				newMap.set(roomId, [...roomMessages, joinMessage]);
				return newMap;
			});
		});

		_socket.on("user-left", ({ username, roomId }: { username: string; roomId: string }) => {
			console.log(`User ${username} left room ${roomId}`);
			// Add system message for user leaving
			setMessages((prev) => {
				const newMap = new Map(prev);
				const roomMessages = newMap.get(roomId) || [];
				const leaveMessage: Message = {
					senderId: "system",
					message: `${username} left the chat`,
					roomId,
					type: "system",
					timestamp: new Date().toISOString()
				};
				newMap.set(roomId, [...roomMessages, leaveMessage]);
				return newMap;
			});
		});

		_socket.on("online-members", ({ roomId, members }: { roomId: string; members: OnlineMember[] }) => {
			setOnlineMembers((prev) => {
				const newMap = new Map(prev);
				newMap.set(roomId, members);
				return newMap;
			});
		});

		_socket.on("error", (error: { message: string }) => {
			console.error("Socket error:", error.message);
		});

		_socket.connect();
		setSocket(_socket);

		return () => {
			_socket.off("connect");
			_socket.off("disconnect");
			_socket.off("message");
			_socket.off("user-joined");
			_socket.off("user-left");
			_socket.off("online-members");
			_socket.off("error");
			_socket.disconnect();
			socketRef.current = null;
		};
	}, []);

	return (
		<SocketContext.Provider
			value={{
				sendMessage,
				messages,
				joinRoom,
				leaveRoom,
				isConnected,
				currentRoomId,
				setCurrentRoomId,
				onlineMembers,
				getMessagesForRoom,
				getOnlineMembersForRoom
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};
