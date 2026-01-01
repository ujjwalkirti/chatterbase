"use client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAllChatRooms } from "@/utils/functions/chatrooms";
import { PlusCircleIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import React from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";

function ChatroomsDialog() {
	const [chatrooms, setChatRooms] = React.useState<ChatRoom[]>([]);
	const [isOpen, setIsOpen] = React.useState(false);
	const router = useRouter();

	React.useEffect(() => {
		if (isOpen) {
			getAllChatRooms()
				.then((rooms) => {
					setChatRooms(rooms);
				})
				.catch((error) => {
					console.error("Error fetching chat rooms:", error);
					setChatRooms([]);
				});
		}
	}, [isOpen]);

	const onEnterChatroom = (chatroomId: string) => {
		// Navigate directly to the chatroom
		setIsOpen(false);
		router.push(`/chatrooms/${chatroomId}`);
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant={"secondary"}>Chatrooms</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Available Chatrooms</DialogTitle>
					<DialogDescription asChild>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full mt-4">
							{chatrooms.length === 0 ? (
								<p className="text-gray-500 col-span-full text-center py-4">No chatrooms available</p>
							) : (
								chatrooms.map((chatroom) => (
									<Button
										onClick={() => onEnterChatroom(chatroom.id)}
										key={chatroom.id}
										variant="outline"
										className="mx-auto border border-accent-foreground hover:shadow-md hover:scale-105 duration-150 transition-all p-3 flex items-center justify-between gap-2 w-full"
									>
										{chatroom.name} ({chatroom.participantCount ?? 0}) <PlusCircleIcon className="w-4 h-4" />
									</Button>
								))
							)}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}

export default ChatroomsDialog;
