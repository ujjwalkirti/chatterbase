"use client";
import React, { useCallback, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { signOut } from "next-auth/react";
import { authContext } from "./AuthProvider";

interface SocketProviderProps {
	children?: React.ReactNode;
}

interface ISocketContext {
	sendMessage: (message: string, senderId: string, roomId: string) => void;
	messages: Map<string, Message[]>;
	joinRoom: (userId: string, roomId: string, type?: string) => void;
	leaveRoom: (userId: string, roomId: string) => void;
	isConnected: boolean;
	currentRoomId: string | null;
	setCurrentRoomId: (roomId: string | null) => void;
	onlineMembers: Map<string, OnlineMember[]>;
	getMessagesForRoom: (roomId: string) => Message[];
	getOnlineMembersForRoom: (roomId: string) => OnlineMember[];
	sendTyping: (roomId: string, isTyping: boolean) => void;
	typingUsers: Map<string, string[]>;
	getTypingUsersForRoom: (roomId: string) => string[];
}


const SocketContext = React.createContext<ISocketContext | null>(null);

export const useSocket = () => {
	const state = useContext(SocketContext);
	if (!state) throw new Error(`Socket context is undefined`);
	return state;
};

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
	const { user } = useContext(authContext);
	const userRef = useRef(user);
	useEffect(() => {
		userRef.current = user;
	}, [user]);

	const [socket, setSocket] = useState<Socket>();
	const [messages, setMessages] = useState<Map<string, Message[]>>(new Map());
	const [isConnected, setIsConnected] = useState(false);
	const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
	const [onlineMembers, setOnlineMembers] = useState<Map<string, OnlineMember[]>>(new Map());
	const [typingUsers, setTypingUsers] = useState<Map<string, string[]>>(new Map());

	const socketRef = useRef<Socket | null>(null);
	const typingTimeoutsRef = useRef<Map<string, Map<string, NodeJS.Timeout>>>(new Map());

	const removeTypingUser = useCallback((roomId: string, username: string) => {
		// Clear timer if exists
		const roomTimeouts = typingTimeoutsRef.current.get(roomId);
		if (roomTimeouts && roomTimeouts.has(username)) {
			clearTimeout(roomTimeouts.get(username));
			roomTimeouts.delete(username);
		}

		setTypingUsers((prev) => {
			const current = prev.get(roomId) || [];
			if (!current.includes(username)) return prev;
			const nextList = current.filter((u) => u !== username);
			const newMap = new Map(prev);
			newMap.set(roomId, nextList);
			return newMap;
		});
	}, []);

	const addTypingUser = useCallback(
		(roomId: string, username: string) => {
			if (!typingTimeoutsRef.current.has(roomId)) {
				typingTimeoutsRef.current.set(roomId, new Map());
			}
			const roomTimeouts = typingTimeoutsRef.current.get(roomId)!;
			if (roomTimeouts.has(username)) {
				clearTimeout(roomTimeouts.get(username));
			}

			// Discord-style 4 second auto-timeout if user stops typing without explicit false event
			const timer = setTimeout(() => {
				removeTypingUser(roomId, username);
			}, 4000);
			roomTimeouts.set(username, timer);

			setTypingUsers((prev) => {
				const current = prev.get(roomId) || [];
				if (current.includes(username)) return prev;
				const newMap = new Map(prev);
				newMap.set(roomId, [...current, username]);
				return newMap;
			});
		},
		[removeTypingUser]
	);

	const sendTyping = useCallback(
		(roomId: string, isTyping: boolean) => {
			if (socketRef.current && user?.username && roomId) {
				const isGuest =
					user.userStatus === "anonymous" ||
					user.userStatus === "guest" ||
					user.username.toLowerCase().startsWith("guest-");
				const displayName =
					isGuest && !user.username.toLowerCase().startsWith("guest-")
						? `guest-${user.username}`
						: user.username;

				socketRef.current.emit("typing", {
					roomId,
					username: displayName,
					isTyping,
				});
			}
		},
		[user?.username, user?.userStatus]
	);

	// Emit periodic guest heartbeat over socket while connected
	useEffect(() => {
		if (!isConnected || !socketRef.current || !user?.username) return;

		const hbInterval = setInterval(() => {
			if (socketRef.current?.connected) {
				socketRef.current.emit("guest-heartbeat", { username: user.username });
			}
		}, 30000);

		return () => {
			clearInterval(hbInterval);
		};
	}, [isConnected, user?.username]);

	const sendMessage = useCallback(
		(message: string, senderId: string, roomId: string) => {
			if (socketRef.current && message.trim()) {
				// Immediately stop typing indicator for current user
				sendTyping(roomId, false);

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
		[sendTyping]
	);

	const joinRoom = useCallback(
		(userId: string, roomId: string, type: string = "user") => {
			if (socketRef.current) {
				socketRef.current.emit("join-room", { userId, roomId, type });
				setCurrentRoomId(roomId);
			}
		},
		[]
	);

	const leaveRoom = useCallback(
		(userId: string, roomId: string) => {
			if (socketRef.current) {
				sendTyping(roomId, false);
				socketRef.current.emit("leave-room", { userId, roomId });
				setCurrentRoomId((prev) => (prev === roomId ? null : prev));
			}

			// Clear typing timeouts for the left room
			const roomTimeouts = typingTimeoutsRef.current.get(roomId);
			if (roomTimeouts) {
				roomTimeouts.forEach((timer) => clearTimeout(timer));
				roomTimeouts.clear();
			}
			setTypingUsers((prev) => {
				if (!prev.has(roomId)) return prev;
				const newMap = new Map(prev);
				newMap.delete(roomId);
				return newMap;
			});
		},
		[sendTyping]
	);

	const getMessagesForRoom = useCallback((roomId: string): Message[] => {
		return messages.get(roomId) || [];
	}, [messages]);

	const getOnlineMembersForRoom = useCallback((roomId: string): OnlineMember[] => {
		return onlineMembers.get(roomId) || [];
	}, [onlineMembers]);

	const getTypingUsersForRoom = useCallback(
		(roomId: string): string[] => {
			return typingUsers.get(roomId) || [];
		},
		[typingUsers]
	);

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
			// Clear typing indicator for message sender in this room
			if (payload.roomId && payload.senderId) {
				removeTypingUser(payload.roomId, payload.senderId);
				if (payload.senderUsername) {
					removeTypingUser(payload.roomId, payload.senderUsername);
				}
			}

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

		_socket.on("typing", (data: { roomId: string; username: string; isTyping: boolean }) => {
			if (!data || !data.roomId || !data.username) return;

			// Don't show typing indicator for oneself
			const currentUser = userRef.current;
			if (currentUser?.username) {
				const isSelf =
					data.username === currentUser.username ||
					data.username === `guest-${currentUser.username}`;
				if (isSelf) return;
			}

			if (data.isTyping) {
				addTypingUser(data.roomId, data.username);
			} else {
				removeTypingUser(data.roomId, data.username);
			}
		});

		_socket.on("user-joined", ({ username, roomId }: { username: string; roomId: string }) => {
			if (!username || !username.trim() || !roomId) {
				return;
			}
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
			if (!username || !username.trim() || !roomId) {
				return;
			}
			console.log(`User ${username} left room ${roomId}`);
			removeTypingUser(roomId, username);

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
				console.log(members);
				newMap.set(roomId, members);
				return newMap;
			});
		});

		_socket.on("error", async (error: { message: string }) => {
			console.error("Socket error:", error.message);
			if (error.message && error.message.toLowerCase().includes("expired")) {
				await signOut({ callbackUrl: "/guest-login" });
			}
		});

		_socket.connect();
		setSocket(_socket);

		return () => {
			_socket.off("connect");
			_socket.off("disconnect");
			_socket.off("message");
			_socket.off("typing");
			_socket.off("user-joined");
			_socket.off("user-left");
			_socket.off("online-members");
			_socket.off("error");
			_socket.disconnect();
			socketRef.current = null;

			// Clear all typing timers
			typingTimeoutsRef.current.forEach((roomMap) => {
				roomMap.forEach((timer) => clearTimeout(timer));
				roomMap.clear();
			});
			typingTimeoutsRef.current.clear();
		};
	}, [addTypingUser, removeTypingUser]);

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
				getOnlineMembersForRoom,
				sendTyping,
				typingUsers,
				getTypingUsersForRoom
			}}
		>
			{children}
		</SocketContext.Provider>
	);
};

