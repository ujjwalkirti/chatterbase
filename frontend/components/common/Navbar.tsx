import React from "react";
import NavbarDrawer from "./NavbarDrawer";
import Link from "next/link";
import { MoveUpRightIcon } from "lucide-react";

function Navbar() {
	const navLinks = [
		{ label: "Chatrooms", href: "/available-chatrooms" },
		{ label: "Profile", href: "/profile" },
	];
	return (
		<section className="">
			<nav className="w-full lg:w-3/5 mx-auto flex items-center justify-between p-2">
				<Link href="/" className="font-bold text-2xl">Chatter-Base</Link>
				<div className="hidden md:flex items-center gap-4">
					{navLinks.map((link) => {
						return (
							<Link href={link.href} key={link.href} className="flex items-center text-lg hover:cursor-pointer hover:underline hover:scale-105 transition-all duration-300 mx-auto">
								{link.label} <MoveUpRightIcon />
							</Link>
						);
					})}
				</div>
				<NavbarDrawer />
			</nav>
		</section>
	);
}

export default Navbar;
