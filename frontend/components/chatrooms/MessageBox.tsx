"use client";

import React, { useContext, useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useSocket } from "@/contexts/SocketProvider";
import { authContext } from "@/contexts/AuthProvider";
import { SendIcon } from "lucide-react";

interface MessageBoxProps {
	roomId: string;
}

function MessageBox({ roomId }: MessageBoxProps) {
	const { user } = useContext(authContext);
	const [message, setMessage] = useState("");
	const { sendMessage, sendTyping, isConnected } = useSocket();

	const lastTypingTimeRef = useRef<number>(0);
	const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null);

	const stopTyping = useCallback(() => {
		if (typingStopTimerRef.current) {
			clearTimeout(typingStopTimerRef.current);
			typingStopTimerRef.current = null;
		}
		sendTyping(roomId, false);
		lastTypingTimeRef.current = 0;
	}, [roomId, sendTyping]);

	const handleTyping = useCallback(() => {
		const now = Date.now();
		// Throttle emission to once every 2.5 seconds
		if (now - lastTypingTimeRef.current > 2500) {
			sendTyping(roomId, true);
			lastTypingTimeRef.current = now;
		}

		// Reset 3-second idle timer
		if (typingStopTimerRef.current) {
			clearTimeout(typingStopTimerRef.current);
		}
		typingStopTimerRef.current = setTimeout(() => {
			stopTyping();
		}, 3000);
	}, [roomId, sendTyping, stopTyping]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setMessage(val);

		if (!val.trim()) {
			stopTyping();
		} else {
			handleTyping();
		}
	};

	const handleSendMessage = () => {
		if (!message.trim() || !user?.username) return;
		stopTyping();
		sendMessage(message, user.username, roomId);
		setMessage("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Clean up typing indicator on unmount
	useEffect(() => {
		return () => {
			stopTyping();
		};
	}, [stopTyping]);

	return (
		<div className="flex flex-col border rounded-lg p-3 gap-2 bg-white dark:bg-gray-900">
			<Textarea
				value={message}
				onKeyDown={handleKeyDown}
				onChange={handleChange}
				placeholder={isConnected ? "Type a message... (Enter to send)" : "Connecting..."}
				className="resize-none border-none h-24 focus-visible:ring-0"
				disabled={!isConnected}
			/>
			<div className="flex justify-end">
				<Button
					onClick={handleSendMessage}
					type="button"
					disabled={!message.trim() || !isConnected}
					className="gap-2"
				>
					<SendIcon className="w-4 h-4" />
					Send
				</Button>
			</div>
		</div>
	);
}

export default MessageBox;

