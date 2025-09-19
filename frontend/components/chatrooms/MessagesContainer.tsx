"use client";
import { useSocket } from "@/contexts/SocketProvider";
import { useContext, useEffect } from "react";
import IndividualMessageBox from "./IndividualMessageBox";
import { authContext } from "@/contexts/AuthProvider";

function MessagesContainer() {
	const { user } = useContext(authContext);
	const { messages } = useSocket();

	useEffect(() => {
		// always scroll to latest message
		const messageContainer = document.getElementById("message-container");
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}

		return () => {
			// reset message container
			const messageContainer = document.getElementById("message-container");
			if (messageContainer) {
				messageContainer.scrollTop = 0;
			}
		};
	}, [messages]);

	return (
		<div id="message-container" className="flex flex-col gap-2 h-[calc(100vh-250px)] overflow-y-scroll">
			{messages.map((message, index) => {
				if (message.type === "system")
					return (
						<div className="mx-auto bg-gray-200 p-2 rounded text-sm my-2" key={message.senderId + index.toString()}>
							<p>{message.message}</p>
						</div>
					);
				const isSenderCurrentUser = message.senderId === user?.username;
				return <IndividualMessageBox isSenderCurrentUser={isSenderCurrentUser} message={message} key={message.senderId + index.toString()} />;
			})}
		</div>
	);
}

export default MessagesContainer;
