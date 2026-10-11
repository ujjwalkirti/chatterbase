"use client";

import React from "react";
import { useSocket } from "@/contexts/SocketProvider";

interface TypingIndicatorProps {
	roomId: string;
}

export function renderTypingText(users: string[]) {
	if (users.length === 0) return null;

	if (users.length === 1) {
		return (
			<span>
				<strong className="font-semibold text-foreground">{users[0]}</strong> is typing...
			</span>
		);
	}

	if (users.length === 2) {
		return (
			<span>
				<strong className="font-semibold text-foreground">{users[0]}</strong> and{" "}
				<strong className="font-semibold text-foreground">{users[1]}</strong> are typing...
			</span>
		);
	}

	if (users.length === 3) {
		return (
			<span>
				<strong className="font-semibold text-foreground">{users[0]}</strong>,{" "}
				<strong className="font-semibold text-foreground">{users[1]}</strong>, and{" "}
				<strong className="font-semibold text-foreground">{users[2]}</strong> are typing...
			</span>
		);
	}

	return (
		<span>
			<strong className="font-semibold text-foreground">Several people</strong> are typing...
		</span>
	);
}

export default function TypingIndicator({ roomId }: TypingIndicatorProps) {
	const { getTypingUsersForRoom } = useSocket();
	const typingUsers = getTypingUsersForRoom(roomId);
	const hasTypers = typingUsers.length > 0;

	return (
		<div
			aria-live="polite"
			className={`flex items-center px-2 py-1 transition-all duration-200 ${
				hasTypers
					? "opacity-100 max-h-12 translate-y-0"
					: "opacity-0 max-h-0 pointer-events-none -translate-y-1 overflow-hidden"
			}`}
		>
			{hasTypers && (
				<div className="inline-flex items-center gap-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/50 rounded-2xl rounded-bl-xs px-3.5 py-1.5 shadow-xs">
					<div className="flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:-0.32s]" />
						<span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce [animation-delay:-0.16s]" />
						<span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-bounce" />
					</div>
					<div className="text-xs text-muted-foreground font-medium">
						{renderTypingText(typingUsers)}
					</div>
				</div>
			)}
		</div>
	);
}

