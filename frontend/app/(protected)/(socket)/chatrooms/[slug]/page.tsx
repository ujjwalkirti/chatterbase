"use client";

import React, { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Users, ChevronLeft, MessageSquare } from "lucide-react";

import MessageBox from "@/components/chatrooms/MessageBox";
import MessagesContainer from "@/components/chatrooms/MessagesContainer";
import OnlineMembers from "@/components/chatrooms/OnlineMembers";
import TypingIndicator from "@/components/chatrooms/TypingIndicator";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { authContext } from "@/contexts/AuthProvider";
import { useSocket } from "@/contexts/SocketProvider";

function Page() {
	const { slug } = useParams();
	const roomId = slug as string;
	const { user } = useContext(authContext);
	const { joinRoom, isConnected, leaveRoom, getOnlineMembersForRoom, hydrateRoomHistory } = useSocket();
	const [isMobile, setIsMobile] = useState(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
	const [showDesktopMembers, setShowDesktopMembers] = useState(true);

	const onlineMembers = getOnlineMembersForRoom(roomId);

	// Hydrate room message history on entrance
	useEffect(() => {
		if (roomId && user?.accessToken) {
			hydrateRoomHistory(roomId);
		}
	}, [roomId, user?.accessToken, hydrateRoomHistory]);

	// Detect mobile screen sizes (< 768px)
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Handle joining and leaving the room
	useEffect(() => {
		if (!roomId || !isConnected || !user?.username) return;

		const memberType =
			user.userStatus === "anonymous"
				? "guest"
				: user.userStatus || "guest";
		joinRoom(user.username, roomId, memberType);

		const handleBeforeUnload = () => {
			leaveRoom(user.username, roomId);
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
			leaveRoom(user.username, roomId);
		};
	}, [roomId, isConnected, user?.username, user?.userStatus, joinRoom, leaveRoom]);

	const toggleMembers = () => {
		if (isMobile) {
			setIsMobileSheetOpen((prev) => !prev);
		} else {
			setShowDesktopMembers((prev) => !prev);
		}
	};

	if (!user) {
		return (
			<div className="flex w-full lg:w-3/5 mx-auto px-3 items-center justify-center h-[calc(100vh-100px)]">
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
					<p>Authenticating session...</p>
				</div>
			</div>
		);
	}

	const formattedRoomTitle = roomId ? roomId.replace(/-/g, " ") : "Chat Room";
	const initials = formattedRoomTitle.slice(0, 2).toUpperCase() || "CB";

	return (
		<div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col h-[calc(100vh-68px)]">
			{/* Messenger Main Frame */}
			<div className="flex flex-1 border border-border/70 rounded-2xl bg-card shadow-xs overflow-hidden min-h-0">
				{/* Main Chat Column */}
				<div className="flex flex-col flex-1 min-w-0 min-h-0 bg-background/40">
					{/* Messenger Top Header */}
					<div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-border/60 bg-card/80 backdrop-blur-xs shrink-0">
						<div className="flex items-center gap-2.5 min-w-0">
							{/* Quick Back Button */}
							<Link
								href="/available-chatrooms"
								className="p-1.5 -ml-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
								title="Back to all chatrooms"
							>
								<ChevronLeft className="w-5 h-5" />
							</Link>

							{/* Room Avatar */}
							<div className="relative shrink-0">
								<div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs">
									{initials}
								</div>
								<span
									className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-background ${
										isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
									}`}
								/>
							</div>

							{/* Room Title & Online Presence */}
							<div className="flex flex-col min-w-0">
								<h1 className="text-sm sm:text-base font-semibold capitalize text-foreground truncate">
									{formattedRoomTitle}
								</h1>
								<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
									{isConnected ? (
										<span className="text-[11px] text-green-600 dark:text-green-400 font-medium">
											Active now • {onlineMembers.length} {onlineMembers.length === 1 ? "member" : "members"}
										</span>
									) : (
										<span className="text-[11px] text-red-500 font-medium">
											Disconnected
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Right Actions: Toggle Members / People */}
						<div className="flex items-center gap-1.5">
							<Button
								variant="ghost"
								size="sm"
								onClick={toggleMembers}
								className={`flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium cursor-pointer transition-colors ${
									(!isMobile && showDesktopMembers) || isMobileSheetOpen
										? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
										: "text-muted-foreground hover:text-foreground"
								}`}
								title={showDesktopMembers ? "Hide members panel" : "Show members panel"}
							>
								<Users className="w-4 h-4" />
								<span className="hidden sm:inline">People</span>
								<span className="bg-muted px-1.5 py-0.5 rounded-full text-[11px] font-semibold text-foreground">
									{onlineMembers.length}
								</span>
							</Button>
						</div>
					</div>

					{/* Messages Thread */}
					<div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-card/10">
						<MessagesContainer roomId={roomId} />
					</div>

					{/* Messenger Typing Speech Bubble */}
					<div className="px-3 shrink-0">
						<TypingIndicator roomId={roomId} />
					</div>

					{/* Messenger Bottom Pill Input Bar */}
					<div className="px-3 pb-2 pt-1 shrink-0 border-t border-border/40 bg-card/70 backdrop-blur-xs">
						<MessageBox roomId={roomId} />
					</div>
				</div>

				{/* Desktop Collapsible Details / Members Sidebar */}
				{!isMobile && showDesktopMembers && (
					<aside className="w-72 lg:w-80 border-l border-border/60 bg-card/50 backdrop-blur-xs p-3.5 overflow-y-auto shrink-0 transition-all duration-200">
						<OnlineMembers roomId={roomId} />
					</aside>
				)}
			</div>

			{/* Mobile Slide-Out Sheet for Online Members */}
			<Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
				<SheetContent side="right" className="w-80 p-4">
					<SheetHeader className="pb-3 border-b">
						<SheetTitle className="text-base">People Online ({onlineMembers.length})</SheetTitle>
					</SheetHeader>
					<div className="overflow-y-auto max-h-[calc(100vh-100px)] pt-3">
						<OnlineMembers roomId={roomId} />
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

export default Page;

