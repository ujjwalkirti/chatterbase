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
	const { getMessagesForRoom, isHistoryLoading } = useSocket();
	const containerRef = useRef<HTMLDivElement>(null);

	const messages = getMessagesForRoom(roomId);
	const isLoading = isHistoryLoading ? isHistoryLoading(roomId) : false;

	useEffect(() => {
		// Always scroll to latest message
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, [messages]);

	if (messages.length === 0) {
		if (isLoading) {
			return (
				<div
					ref={containerRef}
					className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto items-center justify-center text-muted-foreground p-2"
				>
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
						<p>Loading message history...</p>
					</div>
				</div>
			);
		}

		return (
			<div
				ref={containerRef}
				className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto items-center justify-center text-muted-foreground p-2"
			>
				<p>No messages yet. Start the conversation!</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto p-2"
		>
			{messages.map((message, index) => {
				if (message.type === "system") {
					return (
						<div
							className="mx-auto bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-600 dark:text-gray-400 my-1"
							key={`sys-${message.id ?? ''}-${message.timestamp}-${index}`}
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
						key={`usr-${message.id ?? ''}-${message.timestamp}-${message.senderId}-${index}`}
					/>
				);
			})}
		</div>
	);
}

export default MessagesContainer;
