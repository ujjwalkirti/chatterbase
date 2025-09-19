"use client";

import React, { useContext } from "react";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useSocket } from "@/contexts/SocketProvider";
import { authContext } from "@/contexts/AuthProvider";

interface MessageBoxProps {
	receiverId: string;
}

function MessageBox({ receiverId }: MessageBoxProps) {
	const { user } = useContext(authContext);
	const [message, setMessage] = React.useState("");
	const { sendMessage } = useSocket();

	const createMessage = (senderId: string, receiverId: string) => {
		sendMessage(message, senderId, receiverId);
	};

	const onkeydown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			createMessage(user?.username as string, receiverId);
			setMessage("");
		}
	};

	const onSubmit = () => {
		createMessage(user?.username as string, receiverId);
		setMessage("");
	};

	return (
		<div className="h-[180px] flex flex-col border border-md rounded-md p-2 gap-2">
			<Textarea value={message} onKeyDown={onkeydown} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className="resize-none border-none h-full" />
			<Button onClick={onSubmit} type="button">
				Send
			</Button>
		</div>
	);
}

export default MessageBox;
