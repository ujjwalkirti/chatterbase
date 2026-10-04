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
		<section className="">
			<nav className="w-full lg:w-3/5 mx-auto flex items-center justify-between p-2">
				<Link href="/" className="font-bold text-2xl">Chatter-Base</Link>
				<div className="flex items-center gap-3 sm:gap-4">
					<Link
						href="/terms"
						className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
					>
						Terms
					</Link>
					<ModeToggle />
					<ChatroomsDialog />
					{session?.user && (
						<Button
							variant="ghost"
							onClick={handleLogout}
							className="flex items-center gap-2 hover:cursor-pointer"
						>
							Logout <LogOutIcon className="w-4 h-4" />
						</Button>
					)}
				</div>
			</nav>
		</section>
	);
}

export default Navbar;
