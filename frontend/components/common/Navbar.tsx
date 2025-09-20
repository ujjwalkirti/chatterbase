'use client';
import React, { useContext } from "react";
import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import ChatroomsDialog from "./ChatroomsDialog";
import { authContext } from "@/contexts/AuthProvider";

function Navbar() {
	// const navLinks = [];
	const { user } = useContext(authContext);
	return (
		<section className="">
			<nav className="w-full lg:w-3/5 mx-auto flex items-center justify-between p-2">
				<Link href="/" className="font-bold text-2xl">Chatter-Base</Link>
				<div className="flex items-center gap-4">
					<ChatroomsDialog />
					{/* {navLinks.map((link) => {
						return (
							<Link href={link.href} key={link.href} className="flex items-center text-lg hover:cursor-pointer hover:underline hover:scale-105 transition-all duration-300 mx-auto">
								{link.label} <MoveUpRightIcon />
							</Link>
						);
					})} */}
					{user && (
						<Link href="/api/auth/signout" className="flex items-center w-full gap-2 hover:cursor-pointer hover:underline hover:scale-105 transition-all duration-300 mx-auto">
							Logout <LogOutIcon />
						</Link>
					)}
				</div>
			</nav>
		</section>
	);
}

export default Navbar;
