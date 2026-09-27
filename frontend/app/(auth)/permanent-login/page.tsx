import PermanentAuthForm from "@/components/auth/PermanentAuthForm";
import { getIPAddress } from "@/utils/functions/user";
import React from "react";

export const metadata = {
	title: "Permanent Account | ChatterBase",
	description: "Sign in or register a permanent ChatterBase account.",
};

async function PermanentLoginPage() {
	const ipAddress = await getIPAddress();

	return (
		<div className="flex flex-col gap-4 w-full mx-auto px-3 lg:w-3/5 min-h-[calc(100vh-100px)] py-8 items-center justify-center">
			<PermanentAuthForm currentIPAddress={ipAddress} />
			{ipAddress && (
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<p>Your IP address is being recorded for security: {ipAddress}</p>
				</div>
			)}
		</div>
	);
}

export default PermanentLoginPage;
