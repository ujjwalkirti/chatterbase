import React from "react";

interface IndividualMessageBoxProps {
	message: Message;
	isSenderCurrentUser: boolean;
}

function IndividualMessageBox({ message, isSenderCurrentUser }: IndividualMessageBoxProps) {
	const formatTime = (timestamp?: string) => {
		if (!timestamp) return "";
		return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	};

	return (
		<div className={`flex flex-col gap-1 max-w-[70%] ${isSenderCurrentUser ? "self-end items-end" : "self-start items-start"}`}>
			{!isSenderCurrentUser && (
				<span className="text-xs text-gray-500 px-2">{message.senderId}</span>
			)}
			<div
				className={`px-4 py-2 rounded-2xl break-words ${
					isSenderCurrentUser
						? "bg-blue-500 text-white rounded-br-md"
						: "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md"
				}`}
			>
				<p className="whitespace-pre-wrap">{message.message}</p>
			</div>
			{message.timestamp && (
				<span className="text-xs text-gray-400 px-2">{formatTime(message.timestamp)}</span>
			)}
		</div>
	);
}

export default IndividualMessageBox;
