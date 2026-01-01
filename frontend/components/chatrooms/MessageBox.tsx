"use client";

import React, { useContext, useState } from "react";
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
	const { sendMessage, isConnected } = useSocket();

	const handleSendMessage = () => {
		if (!message.trim() || !user?.username) return;
		sendMessage(message, user.username, roomId);
		setMessage("");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div className="flex flex-col border rounded-lg p-3 gap-2 bg-white dark:bg-gray-900">
			<Textarea
				value={message}
				onKeyDown={handleKeyDown}
				onChange={(e) => setMessage(e.target.value)}
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
