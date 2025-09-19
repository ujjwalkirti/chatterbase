'use client'
import CreateChatRoom from "@/components/landing-page/CreateChatRoom";
import { Button } from "@/components/ui/button";
import { authContext } from "@/contexts/AuthProvider";
import Link from "next/link";
import { useContext } from "react";

export default function Page() {
	const { user } = useContext(authContext);
	return (
		<div className="flex flex-col gap-4 w-full mx-auto px-3 lg:w-3/5 h-screen items-center justify-center text-lg">
			<p className="text-3xl font-bold">Welcome, {user?.username}</p>
			<p className="">100+ chat rooms active now. Wanna join one?</p>
			<div className="flex flex-col gap-4">
				<Link href="/available-chatrooms" className="mx-auto">
					<Button className="w-[100px] mx-auto cursor-pointer">Join Here</Button>
				</Link>
				<CreateChatRoom />
			</div>
		</div>
	);
}
