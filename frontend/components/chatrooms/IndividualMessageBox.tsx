import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface IndividualMessageBoxProps {
	message: Message;
	isSenderCurrentUser: boolean;
}

function IndividualMessageBox({ message, isSenderCurrentUser }: IndividualMessageBoxProps) {
	const formatTime = (timestamp?: string) => {
		if (!timestamp) return "";
		try {
			return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
		} catch {
			return "";
		}
	};

	const senderDisplay = message.senderUsername || message.senderId || "User";
	const initials = (senderDisplay.replace(/^guest-/i, "")).slice(0, 2).toUpperCase() || "U";

	if (isSenderCurrentUser) {
		return (
			<div className="flex flex-col items-end self-end max-w-[80%] sm:max-w-[70%] group mb-1">
				<div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 break-words shadow-xs hover:shadow-sm transition-shadow">
					<p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message}</p>
				</div>
				{message.timestamp && (
					<span className="text-[10px] text-muted-foreground/70 px-1 pt-0.5 select-none">
						{formatTime(message.timestamp)}
					</span>
				)}
			</div>
		);
	}

	return (
		<div className="flex items-end gap-2 self-start max-w-[85%] sm:max-w-[75%] group mb-1">
			<Avatar className="w-7 h-7 shrink-0 mb-4 ring-1 ring-border/40">
				<AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">
					{initials}
				</AvatarFallback>
			</Avatar>
			<div className="flex flex-col items-start min-w-0">
				<span className="text-[11px] font-medium text-muted-foreground px-1 mb-0.5 truncate max-w-[200px]">
					{senderDisplay}
				</span>
				<div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/50 dark:border-zinc-700/40 rounded-2xl rounded-bl-xs px-4 py-2.5 break-words shadow-xs">
					<p className="whitespace-pre-wrap text-sm leading-relaxed">{message.message}</p>
				</div>
				{message.timestamp && (
					<span className="text-[10px] text-muted-foreground/70 px-1 pt-0.5 select-none">
						{formatTime(message.timestamp)}
					</span>
				)}
			</div>
		</div>
	);
}

export default IndividualMessageBox;

