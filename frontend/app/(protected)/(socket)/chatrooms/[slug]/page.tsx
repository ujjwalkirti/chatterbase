"use client";
import MessageBox from "@/components/chatrooms/MessageBox";
import MessagesContainer from "@/components/chatrooms/MessagesContainer";
import OnlineMembers from "@/components/chatrooms/OnlineMembers";
import { authContext } from "@/contexts/AuthProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useParams } from "next/navigation";
import { useContext, useEffect, useState } from "react";

function Page() {
	const { slug } = useParams();
	const roomId = slug as string;
	const { user } = useContext(authContext);
	const { joinRoom, isConnected, leaveRoom } = useSocket();
	const [hasJoined, setHasJoined] = useState(false);

	useEffect(() => {
		if (roomId && isConnected && user?.username && !hasJoined) {
			joinRoom(user.username, roomId);
			setHasJoined(true);
		}
	}, [roomId, isConnected, user?.username, hasJoined, joinRoom]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (isConnected && roomId && user?.username) {
				leaveRoom(user.username, roomId);
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			if (isConnected && roomId && user?.username && hasJoined) {
				leaveRoom(user.username, roomId);
			}
		};
	}, [roomId, isConnected, user?.username, hasJoined, leaveRoom]);

	if (!user) {
		return (
			<div className="flex w-full lg:w-3/5 mx-auto px-3 items-center justify-center h-[calc(100vh-100px)]">
				<p>Loading...</p>
			</div>
		);
	}

	return (
		<div className="flex w-full lg:w-4/5 mx-auto px-3 gap-4">
			<div className="flex flex-col gap-4 flex-1">
				<div className="flex items-center justify-between border-b pb-2">
					<h1 className="text-xl font-semibold">Chat Room</h1>
					<div className="flex items-center gap-2">
						<span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
						<span className="text-sm text-gray-600">{isConnected ? "Connected" : "Disconnected"}</span>
					</div>
				</div>
				<MessagesContainer roomId={roomId} />
				<MessageBox roomId={roomId} />
			</div>
			<div className="border-l pl-4 w-64 hidden lg:block">
				<OnlineMembers roomId={roomId} />
			</div>
		</div>
	);
}

export default Page;
