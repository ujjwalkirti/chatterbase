"use client";

import React, { useContext, useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "@/contexts/SocketProvider";
import { authContext } from "@/contexts/AuthProvider";
import { SendIcon, ThumbsUp, Smile, X } from "lucide-react";

interface MessageBoxProps {
	roomId: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🔥", "🎉", "👋", "🙌", "✨", "😍", "👏", "💯", "🚀"];

function MessageBox({ roomId }: MessageBoxProps) {
	const { user } = useContext(authContext);
	const [message, setMessage] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const { sendMessage, sendTyping, isConnected } = useSocket();

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const emojiPickerRef = useRef<HTMLDivElement>(null);
	const lastTypingTimeRef = useRef<number>(0);
	const typingStopTimerRef = useRef<NodeJS.Timeout | null>(null);

	const stopTyping = useCallback(() => {
		if (typingStopTimerRef.current) {
			clearTimeout(typingStopTimerRef.current);
			typingStopTimerRef.current = null;
		}
		sendTyping(roomId, false);
		lastTypingTimeRef.current = 0;
	}, [roomId, sendTyping]);

	const handleTyping = useCallback(() => {
		const now = Date.now();
		// Throttle emission to once every 2.5 seconds
		if (now - lastTypingTimeRef.current > 2500) {
			sendTyping(roomId, true);
			lastTypingTimeRef.current = now;
		}

		// Reset 3-second idle timer
		if (typingStopTimerRef.current) {
			clearTimeout(typingStopTimerRef.current);
		}
		typingStopTimerRef.current = setTimeout(() => {
			stopTyping();
		}, 3000);
	}, [roomId, sendTyping, stopTyping]);

	const adjustTextareaHeight = () => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setMessage(val);
		adjustTextareaHeight();

		if (!val.trim()) {
			stopTyping();
		} else {
			handleTyping();
		}
	};

	const handleSendMessage = () => {
		if (!message.trim() || !user?.username) return;
		stopTyping();
		sendMessage(message.trim(), user.username, roomId);
		setMessage("");
		setShowEmojiPicker(false);
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
		}
	};

	const handleQuickLike = () => {
		if (!user?.username || !isConnected) return;
		sendMessage("👍", user.username, roomId);
	};

	const handleInsertEmoji = (emoji: string) => {
		setMessage((prev) => prev + emoji);
		setShowEmojiPicker(false);
		if (textareaRef.current) {
			textareaRef.current.focus();
		}
		handleTyping();
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	// Close emoji picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
				setShowEmojiPicker(false);
			}
		};
		if (showEmojiPicker) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showEmojiPicker]);

	// Clean up typing indicator on unmount
	useEffect(() => {
		return () => {
			stopTyping();
		};
	}, [stopTyping]);

	const hasText = message.trim().length > 0;

	return (
		<div className="relative pt-2 pb-1">
			{/* Quick Emoji Popover */}
			{showEmojiPicker && (
				<div
					ref={emojiPickerRef}
					className="absolute bottom-full mb-2 left-2 z-30 bg-popover/95 backdrop-blur-md border border-border/60 rounded-2xl p-2.5 shadow-lg flex flex-wrap gap-1 max-w-[280px] animate-in fade-in zoom-in-95 duration-150"
				>
					<div className="flex items-center justify-between w-full pb-1.5 px-1 border-b border-border/40 text-xs text-muted-foreground font-medium">
						<span>Quick Reactions</span>
						<button
							type="button"
							onClick={() => setShowEmojiPicker(false)}
							className="hover:text-foreground p-0.5 rounded cursor-pointer"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
					<div className="grid grid-cols-6 gap-1 pt-1.5 w-full">
						{QUICK_EMOJIS.map((emoji) => (
							<button
								key={emoji}
								type="button"
								onClick={() => handleInsertEmoji(emoji)}
								className="text-xl p-1.5 hover:bg-muted rounded-xl transition-transform active:scale-125 hover:scale-110 flex items-center justify-center cursor-pointer"
								title={emoji}
							>
								{emoji}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Main Messenger Pill Bar */}
			<div className="flex items-center gap-2">
				{/* Pill container wrapping emoji trigger + textarea */}
				<div className="flex-1 flex items-center bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-full px-3 py-1 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/25 focus-within:border-blue-500/50 transition-all min-h-[44px]">
					<button
						type="button"
						onClick={() => setShowEmojiPicker((prev) => !prev)}
						className="text-muted-foreground hover:text-blue-500 dark:hover:text-blue-400 p-1.5 rounded-full hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50 transition-colors shrink-0 cursor-pointer"
						title="Add emoji"
					>
						<Smile className="w-5 h-5" />
					</button>

					<textarea
						ref={textareaRef}
						value={message}
						rows={1}
						onKeyDown={handleKeyDown}
						onChange={handleChange}
						placeholder={isConnected ? "Type a message..." : "Connecting to room..."}
						disabled={!isConnected}
						className="flex-1 bg-transparent border-0 focus:outline-hidden text-sm text-foreground placeholder:text-muted-foreground/70 py-2 px-2 resize-none max-h-24 min-h-[36px] leading-5"
					/>
				</div>

				{/* Action button: Circular Send or ThumbsUp */}
				{hasText ? (
					<button
						type="button"
						onClick={handleSendMessage}
						disabled={!isConnected}
						className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
						title="Send message (Enter)"
					>
						<SendIcon className="w-4 h-4 ml-0.5" />
					</button>
				) : (
					<button
						type="button"
						onClick={handleQuickLike}
						disabled={!isConnected}
						className="w-10 h-10 rounded-full text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center shrink-0 active:scale-90 transition-all cursor-pointer disabled:opacity-50"
						title="Send thumbs up"
					>
						<ThumbsUp className="w-5 h-5 fill-current" />
					</button>
				)}
			</div>
		</div>
	);
}

export default MessageBox;


