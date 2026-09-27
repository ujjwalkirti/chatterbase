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
			className={`h-6 flex items-center px-1 text-xs text-muted-foreground transition-opacity duration-200 ${
				hasTypers ? "opacity-100" : "opacity-0 select-none pointer-events-none"
			}`}
		>
			{hasTypers && (
				<div className="flex items-center gap-1.5">
					<div className="flex items-center gap-0.5 mr-0.5">
						<span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.32s]" />
						<span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.16s]" />
						<span className="w-1.5 h-1.5 rounded-full bg-primary/70 animate-bounce" />
					</div>
					{renderTypingText(typingUsers)}
				</div>
			)}
		</div>
	);
}
