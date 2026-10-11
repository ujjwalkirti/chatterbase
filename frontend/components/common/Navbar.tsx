'use client';
import React from "react";
import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import ChatroomsDialog from "./ChatroomsDialog";
import { ModeToggle } from "@/components/mode-toggle";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

function Navbar() {
	const { data: session } = useSession();

	const handleLogout = async () => {
		try {
			if (session?.user?.accessToken) {
				const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
				await fetch(`${apiUrl}/api/auth/logout`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token: session.user.accessToken }),
				});
			}
		} catch (err) {
			console.error("Logout notification error:", err);
		}
		await signOut({ redirect: false });
		window.location.href = "/guest-login";
	};

	return (
		<header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
			<nav className="w-full max-w-7xl mx-auto flex items-center justify-between px-3 sm:px-4 py-2">
				<Link href="/" className="flex items-center gap-2 group">
					<div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
						C
					</div>
					<span className="font-bold text-lg sm:text-xl tracking-tight text-foreground">
						ChatterBase
					</span>
				</Link>

				<div className="flex items-center gap-2 sm:gap-3">
					<Link
						href="/available-chatrooms"
						className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1 rounded-md hover:bg-muted"
					>
						Rooms
					</Link>
					<Link
						href="/terms"
						className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium px-2 py-1 rounded-md hover:bg-muted"
					>
						Terms
					</Link>
					<ModeToggle />
					<ChatroomsDialog />
					{session?.user && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleLogout}
							className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer h-8 px-2.5"
						>
							<span className="hidden sm:inline">Logout</span>
							<LogOutIcon className="w-3.5 h-3.5" />
						</Button>
					)}
				</div>
			</nav>
		</header>
	);
}

export default Navbar;
