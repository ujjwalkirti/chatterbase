'use client';
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

type User = {
	id?: string;
	username: string;
	dob?: string;
	gender?: string;
	accessToken?: string;
}

type authContextType = {
	user: User | null;
	isLoading: boolean;
}

const authContext = React.createContext<authContextType>({
	user: null,
	isLoading: true,
});

function AuthContextProvider({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const isLoading = status === "loading";

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push('/login');
		}
	}, [status, router]);

	const user: User | null = session?.user ? {
		id: session.user.id,
		username: session.user.username || session.user.name || '',
		dob: session.user.dob,
		gender: session.user.gender,
		accessToken: session.user.accessToken,
	} : null;

	useEffect(() => {
		if (!user?.username || !user?.accessToken) return;

		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

		// 1. Send heartbeat every 30 seconds to keep guest session presence active
		const interval = setInterval(async () => {
			try {
				await fetch(`${apiUrl}/api/auth/heartbeat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.accessToken}`,
					},
					body: JSON.stringify({ token: user.accessToken }),
				});
			} catch (err) {
				console.error("Presence heartbeat error:", err);
			}
		}, 30000);

		// 2. Beacon on tab/browser close to release guest lock immediately
		const handleBeforeUnload = () => {
			const payload = JSON.stringify({ token: user.accessToken });
			if (navigator.sendBeacon) {
				const blob = new Blob([payload], { type: "application/json" });
				navigator.sendBeacon(`${apiUrl}/api/auth/guest-logout`, blob);
			} else {
				fetch(`${apiUrl}/api/auth/guest-logout`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: payload,
					keepalive: true,
				});
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			clearInterval(interval);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [user?.username, user?.accessToken]);

	return (
		<authContext.Provider value={{ user, isLoading }}>
			{children}
		</authContext.Provider>
	);
}

function AuthProvider({ children }: { children: React.ReactNode }) {
	return (
		<SessionProvider>
			<AuthContextProvider>{children}</AuthContextProvider>
		</SessionProvider>
	);
}

export { AuthProvider, authContext };
