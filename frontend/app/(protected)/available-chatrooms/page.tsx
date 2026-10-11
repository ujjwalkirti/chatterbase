import CreateChatRoom from "@/components/landing-page/CreateChatRoom";
import { getAllChatRooms } from "@/utils/functions/chatrooms";
import { ArrowRight, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

async function Page() {
	const chatrooms = await getAllChatRooms();
	return (
		<div className="flex flex-col gap-6 min-h-[calc(100vh-80px)] w-full max-w-5xl mx-auto px-4 py-8 items-center justify-center">
			<div className="text-center space-y-1.5">
				<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-2">
					<MessageSquare className="w-3.5 h-3.5" />
					<span>Explore Community Channels</span>
				</div>
				<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
					Available Chat Rooms
				</h1>
				<p className="text-sm text-muted-foreground max-w-md mx-auto">
					Join an existing discussion room or create your own instant space.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
				{chatrooms.map((chatroom) => {
					const initials = chatroom.name.slice(0, 2).toUpperCase() || "CR";
					const count = chatroom.participantCount || 0;

					return (
						<Link
							href={`/chatrooms/${chatroom.id}`}
							key={chatroom.id}
							className="group relative bg-card hover:bg-card/90 border border-border/70 hover:border-blue-500/50 hover:shadow-md rounded-2xl p-4 flex items-center justify-between gap-3 transition-all duration-200 hover:-translate-y-0.5"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
									{initials}
								</div>
								<div className="flex flex-col min-w-0">
									<span className="font-semibold text-sm capitalize text-foreground truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
										{chatroom.name}
									</span>
									<span className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<span className="w-1.5 h-1.5 rounded-full bg-green-500" />
										<span>{count} online</span>
									</span>
								</div>
							</div>
							<div className="w-8 h-8 rounded-full bg-muted/60 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/60 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center justify-center transition-colors shrink-0">
								<ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
							</div>
						</Link>
					);
				})}
			</div>

			<div className="pt-4 w-full max-w-sm text-center">
				<CreateChatRoom />
			</div>
		</div>
	);
}

export default Page;

