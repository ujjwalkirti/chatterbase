"use client";
import MessageBox from "@/components/chatrooms/MessageBox";
import MessagesContainer from "@/components/chatrooms/MessagesContainer";
import OnlineMembers from "@/components/chatrooms/OnlineMembers";
import { authContext } from "@/contexts/AuthProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useParams } from "next/navigation";
import { useContext, useEffect } from "react";

function Page() {
	const { id } = useParams();
	const { user } = useContext(authContext);
	const { joinRooms, isConnected, leaveRooms } = useSocket();

	useEffect(() => {
		if (id) {
			joinRooms(user?.username as string, [id as string]);
		}
		return () => {
			console.log("Cleaning up...");
			leaveRooms(user?.username as string, [id as string]);
		}
	}, [id, isConnected]);

	useEffect(() => {
		const handleBeforeUnload = () => {
			if (isConnected && id) {

				leaveRooms(user?.username as string, [id as string]);
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [id, isConnected]);

	return (
		<div className="flex w-full lg:w-3/5 mx-auto px-3">
			<div className="flex flex-col gap-4 w-full">
				<MessagesContainer />
				<MessageBox receiverId={id as string} />
			</div>
			<div className="border border-r-md mx-2"></div>
			<OnlineMembers />
		</div>
	);
}

export default Page;
