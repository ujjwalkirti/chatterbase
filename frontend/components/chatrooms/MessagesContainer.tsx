"use client";

import { useSocket } from "@/contexts/SocketProvider";
import { useContext, useEffect, useRef } from "react";
import IndividualMessageBox from "./IndividualMessageBox";
import { authContext } from "@/contexts/AuthProvider";
import { MessageSquareDashed, Sparkles } from "lucide-react";

interface MessagesContainerProps {
	roomId: string;
}

function MessagesContainer({ roomId }: MessagesContainerProps) {
	const { user } = useContext(authContext);
	const { getMessagesForRoom, isHistoryLoading, sendMessage } = useSocket();
	const containerRef = useRef<HTMLDivElement>(null);

	const messages = getMessagesForRoom(roomId);
	const isLoading = isHistoryLoading ? isHistoryLoading(roomId) : false;

	useEffect(() => {
		// Smoothly scroll to the latest message on new messages or hydration
		if (containerRef.current) {
			containerRef.current.scrollTop = containerRef.current.scrollHeight;
		}
	}, [messages]);

	const formattedRoomName = roomId ? roomId.replace(/-/g, " ") : "Chat Room";

	if (messages.length === 0) {
		if (isLoading) {
			return (
				<div
					ref={containerRef}
					className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto items-center justify-center text-muted-foreground p-6"
				>
					<div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-muted/50 border border-border/40 text-xs text-muted-foreground">
						<span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
						<p className="font-medium">Loading conversation history...</p>
					</div>
				</div>
			);
		}

		return (
			<div
				ref={containerRef}
				className="flex flex-col flex-1 min-h-0 overflow-y-auto items-center justify-center text-center p-6"
			>
				<div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-violet-600/20 flex items-center justify-center mb-3 ring-1 ring-blue-500/30 shadow-xs">
					<Sparkles className="w-7 h-7 text-blue-600 dark:text-blue-400" />
				</div>
				<h3 className="text-base font-semibold capitalize text-foreground mb-1">
					Welcome to {formattedRoomName}!
				</h3>
				<p className="text-xs text-muted-foreground max-w-xs mb-4">
					No messages here yet. Say hello or send a thumbs-up to kick off the conversation!
				</p>
				{user?.username && (
					<button
						type="button"
						onClick={() => sendMessage("Hello everyone! 👋", user.username, roomId)}
						className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800/60 transition-colors cursor-pointer active:scale-95"
					>
						Say Hello 👋
					</button>
				)}
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto px-2 sm:px-4 py-3"
		>
			{messages.map((message, index) => {
				if (message.type === "system") {
					return (
						<div
							className="mx-auto my-2 px-3.5 py-1 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/40 text-[11px] font-medium text-muted-foreground shadow-2xs select-none"
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

