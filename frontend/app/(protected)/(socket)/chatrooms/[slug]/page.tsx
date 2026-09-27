"use client";

import React, { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { usePanelRef } from "react-resizable-panels";
import { Users, PanelRightClose, PanelRightOpen } from "lucide-react";

import MessageBox from "@/components/chatrooms/MessageBox";
import MessagesContainer from "@/components/chatrooms/MessagesContainer";
import OnlineMembers from "@/components/chatrooms/OnlineMembers";
import TypingIndicator from "@/components/chatrooms/TypingIndicator";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
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
	const { joinRoom, isConnected, leaveRoom, getOnlineMembersForRoom } = useSocket();
	const [hasJoined, setHasJoined] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);

	const membersPanelRef = usePanelRef();
	const onlineMembers = getOnlineMembersForRoom(roomId);

	// Detect mobile screen sizes (< 768px)
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (roomId && isConnected && user?.username && !hasJoined) {
			const memberType =
				user.userStatus === "anonymous"
					? "guest"
					: user.userStatus || "guest";
			joinRoom(user.username, roomId, memberType);
			setHasJoined(true);
		}
	}, [roomId, isConnected, user?.username, user?.userStatus, hasJoined, joinRoom]);

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

	const toggleMembers = () => {
		if (isMobile) {
			setIsMobileSheetOpen((prev) => !prev);
		} else {
			const panel = membersPanelRef.current;
			if (panel) {
				if (panel.isCollapsed()) {
					panel.expand();
					setIsCollapsed(false);
				} else {
					panel.collapse();
					setIsCollapsed(true);
				}
			}
		}
	};

	if (!user) {
		return (
			<div className="flex w-full lg:w-3/5 mx-auto px-3 items-center justify-center h-[calc(100vh-100px)]">
				<p>Loading...</p>
			</div>
		);
	}

	return (
		<div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-2 flex flex-col h-[calc(100vh-80px)]">
			{/* Mobile View (< 768px): clean full-width chat with slide-out sheet */}
			{isMobile ? (
				<div className="flex flex-col flex-1 border rounded-lg p-3 bg-card shadow-xs min-h-0">
					{/* Header */}
					<div className="flex items-center justify-between border-b pb-2 mb-2">
						<div className="flex items-center gap-2">
							<h1 className="text-lg font-semibold capitalize">
								{roomId ? roomId.replace(/-/g, " ") : "Chat Room"}
							</h1>
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<span
									className={`w-2 h-2 rounded-full ${
										isConnected ? "bg-green-500" : "bg-red-500"
									}`}
								/>
								<span>{isConnected ? "Connected" : "Disconnected"}</span>
							</div>
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() => setIsMobileSheetOpen(true)}
							className="flex items-center gap-1.5 text-xs h-8"
						>
							<Users className="w-3.5 h-3.5" />
							<span>Members</span>
							<span className="bg-muted px-1.5 py-0.5 rounded-full text-xs font-semibold">
								{onlineMembers.length}
							</span>
						</Button>

						{/* Mobile Sheet for Online Members */}
						<Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
							<SheetContent side="right" className="w-72 sm:w-80 p-4">
								<SheetHeader className="pb-4">
									<SheetTitle>Online Members ({onlineMembers.length})</SheetTitle>
								</SheetHeader>
								<div className="overflow-y-auto max-h-[calc(100vh-120px)]">
									<OnlineMembers roomId={roomId} />
								</div>
							</SheetContent>
						</Sheet>
					</div>

					{/* Messages Container */}
					<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
						<MessagesContainer roomId={roomId} />
					</div>

					{/* Discord-Style Typing Indicator */}
					<TypingIndicator roomId={roomId} />

					{/* Message Box */}
					<MessageBox roomId={roomId} />
				</div>
			) : (
				/* Desktop & Tablet View (>= 768px): Resizable Draggable Panels */
				<ResizablePanelGroup
					orientation="horizontal"
					className="flex-1 rounded-lg border bg-card text-card-foreground shadow-xs min-h-0"
				>
					{/* Chat Column Panel */}
					<ResizablePanel
						id="chat-main-panel"
						defaultSize="75%"
						minSize="50%"
						className="flex flex-col p-4 min-h-0"
					>
						<div className="flex flex-col h-full min-h-0">
							{/* Header */}
							<div className="flex items-center justify-between border-b pb-2 mb-2">
								<div className="flex items-center gap-3">
									<h1 className="text-xl font-semibold capitalize">
										{roomId ? roomId.replace(/-/g, " ") : "Chat Room"}
									</h1>
									<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
										<span
											className={`w-2 h-2 rounded-full ${
												isConnected ? "bg-green-500" : "bg-red-500"
											}`}
										/>
										<span>{isConnected ? "Connected" : "Disconnected"}</span>
									</div>
								</div>

								<Button
									variant="outline"
									size="sm"
									onClick={toggleMembers}
									className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
									title={isCollapsed ? "Expand members pane" : "Collapse members pane"}
								>
									{isCollapsed ? (
										<PanelRightOpen className="w-3.5 h-3.5" />
									) : (
										<PanelRightClose className="w-3.5 h-3.5" />
									)}
									<span>{isCollapsed ? "Show Members" : "Hide Members"}</span>
									<span className="bg-muted px-1.5 py-0.5 rounded-full text-xs font-semibold">
										{onlineMembers.length}
									</span>
								</Button>
							</div>

							{/* Messages */}
							<div className="flex-1 min-h-0 overflow-hidden flex flex-col">
								<MessagesContainer roomId={roomId} />
							</div>

							{/* Discord-Style Typing Indicator */}
							<TypingIndicator roomId={roomId} />

							{/* Message Box */}
							<MessageBox roomId={roomId} />
						</div>
					</ResizablePanel>

					{/* Draggable Divider Handle */}
					<ResizableHandle withHandle />

					{/* Online Members Panel (Draggable, Collapsible to 0) */}
					<ResizablePanel
						id="online-members-panel"
						panelRef={membersPanelRef}
						defaultSize="25%"
						minSize="15%"
						maxSize="45%"
						collapsible={true}
						onResize={(size) => {
							setIsCollapsed(size.asPercentage === 0 || size.inPixels <= 10);
						}}
						className="p-4 overflow-y-auto bg-muted/15 min-h-0"
					>
						<OnlineMembers roomId={roomId} />
					</ResizablePanel>
				</ResizablePanelGroup>
			)}
		</div>
	);
}

export default Page;
