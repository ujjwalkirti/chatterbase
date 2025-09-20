"use client";
import MessageBox from "@/components/chatrooms/MessageBox";
import MessagesContainer from "@/components/chatrooms/MessagesContainer";
import OnlineMembers from "@/components/chatrooms/OnlineMembers";
import { authContext } from "@/contexts/AuthProvider";
import { useSocket } from "@/contexts/SocketProvider";
import { useParams } from "next/navigation";
import { useContext, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function Page() {
	const { id } = useParams();
	const { user } = useContext(authContext);
	const { joinRooms, isConnected, leaveRooms, joinedChatRooms } = useSocket();

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
			<Tabs defaultValue="account" className="w-[400px]">
				<TabsList>
					{joinedChatRooms?.map((joinedChatRoom) => {
						return <TabsTrigger key={joinedChatRoom._id} value={joinedChatRoom._id}>{joinedChatRoom.name}</TabsTrigger>
					})}
				</TabsList>
				{joinedChatRooms?.map((joinedChatRoom) => {
					return <TabsContent key={joinedChatRoom._id} value={joinedChatRoom._id}>
						<div className="flex flex-col gap-4 w-full">
							<MessagesContainer />
							<MessageBox receiverId={id as string} />
						</div>
					</TabsContent>
				})}
			</Tabs>
			<div className="border border-r-md mx-2"></div>
			<OnlineMembers />
		</div>
	);
}

export default Page;
