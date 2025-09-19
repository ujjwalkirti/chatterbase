import CreateChatRoom from "@/components/landing-page/CreateChatRoom";
import { getAllChatRooms } from "@/utils/functions/chatrooms";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";

async function Page() {
	const chatrooms = await getAllChatRooms();
	return (
		<div className="flex flex-col gap-4 lg:h-[calc(100vh-64px)] w-full mx-auto px-3 lg:w-3/5 items-center justify-center text-lg">
			<p className="text-3xl font-bold">Available Chat Rooms</p>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
				{chatrooms.map((chatroom) => {
					return (
						<Link href={`/chatrooms/${chatroom._id}`} key={chatroom._id} className="mx-auto border border-accent-foreground border-md hover:shadow-md hover:scale-105 duration-150 transition-all p-3 flex items-center justify-between gap-2 w-2/3 lg:w-full">
							{chatroom.name} ({chatroom.participantCount ? chatroom.participantCount : 0}) <ExternalLinkIcon />
						</Link>
					);
				})}
			</div>
			<CreateChatRoom />
		</div>
	);
}

export default Page;
