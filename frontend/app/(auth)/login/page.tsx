import LoginForm from "@/components/auth/LoginForm";
import { getIPAddress } from "@/utils/functions/user";
import React from "react";

async function Page() {
	const ipAddress = await getIPAddress();
	return (
		<div className="flex flex-col gap-4 w-full mx-auto px-3 lg:w-3/5 h-[calc(100vh-100px)] items-center justify-center">
			<LoginForm currentIPAddress={ipAddress} />
			{ipAddress && (
				<div className="flex items-center gap-1 text-sm">
					<p>Your IP address is also being recorded: {ipAddress}</p>
				</div>
			)}
		</div>
	);
}

export default Page;
