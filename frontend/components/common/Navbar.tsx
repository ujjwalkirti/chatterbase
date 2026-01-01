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
		await signOut({ callbackUrl: "/login" });
	};

	return (
		<section className="">
			<nav className="w-full lg:w-3/5 mx-auto flex items-center justify-between p-2">
				<Link href="/" className="font-bold text-2xl">Chatter-Base</Link>
				<div className="flex items-center gap-4">
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
