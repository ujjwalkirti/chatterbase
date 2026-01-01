"use client";
import { useSocket } from "@/contexts/SocketProvider";
import { useContext, useEffect, useRef } from "react";
import IndividualMessageBox from "./IndividualMessageBox";
import { authContext } from "@/contexts/AuthProvider";

interface MessagesContainerProps {
	roomId: string;
}

function MessagesContainer({ roomId }: MessagesContainerProps) {
	const { user } = useContext(authContext);
	const { getMessagesForRoom } = useSocket();
	const containerRef = useRef<HTMLDivElement>(null);

	const messages = getMessagesForRoom(roomId);

	useEffect(() => {
		// Always scroll to latest message
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, [messages]);

	if (messages.length === 0) {
		return (
			<div
				ref={containerRef}
				className="flex flex-col gap-2 h-[calc(100vh-300px)] overflow-y-auto items-center justify-center text-gray-500"
			>
				<p>No messages yet. Start the conversation!</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="flex flex-col gap-2 h-[calc(100vh-300px)] overflow-y-auto p-2"
		>
			{messages.map((message, index) => {
				if (message.type === "system") {
					return (
						<div
							className="mx-auto bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400 my-1"
							key={`${message.timestamp}-${index}`}
						>
							<p>{message.message}</p>
						</div>
					);
				}
				const isSenderCurrentUser = message.senderId === user?.username;
				return (
					<IndividualMessageBox
						isSenderCurrentUser={isSenderCurrentUser}
						message={message}
						key={`${message.timestamp}-${message.senderId}-${index}`}
					/>
				);
			})}
		</div>
	);
}

export default MessagesContainer;
