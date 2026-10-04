'use client';
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";

type User = {
	id?: string;
	username: string;
	dob?: string;
	gender?: string;
	accessToken?: string;
	userStatus?: string;
	email?: string | null;
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
	const pathname = usePathname();
	const isLoading = status === "loading";

	useEffect(() => {
		if (status === "unauthenticated") {
			const isPublicPage =
				pathname === "/login" ||
				pathname === "/guest-login" ||
				pathname === "/permanent-login" ||
				pathname === "/terms" ||
				pathname?.startsWith("/terms");
			if (!isPublicPage) {
				router.push('/guest-login');
			}
		}
	}, [status, pathname, router]);

	const user: User | null = session?.user ? {
		id: session.user.id,
		username: session.user.username || session.user.name || '',
		dob: session.user.dob,
		gender: session.user.gender,
		accessToken: session.user.accessToken,
		userStatus: session.user.userStatus,
		email: session.user.email,
	} : null;

	// Verify token validity with Go backend whenever token is hydrated
	useEffect(() => {
		if (!user?.accessToken) return;

		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
		const verifySession = async () => {
			try {
				const res = await fetch(`${apiUrl}/api/auth/verify`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ token: user.accessToken }),
				});

				if (!res.ok) {
					console.warn("Backend session validation failed (status " + res.status + "), clearing session");
					await signOut({ callbackUrl: "/guest-login" });
				}
			} catch (err) {
				console.error("Session verification network error:", err);
			}
		};

		verifySession();
	}, [user?.accessToken]);

	useEffect(() => {
		if (!user?.username || !user?.accessToken) return;

		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
		const isGuest = user.userStatus === "anonymous";

		// 1. Send heartbeat every 30 seconds to keep guest session presence active
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`${apiUrl}/api/auth/heartbeat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.accessToken}`,
					},
					body: JSON.stringify({ token: user.accessToken }),
				});
				if (isGuest && (res.status === 401 || res.status === 409)) {
					console.warn("Guest heartbeat rejected (session expired), signing out");
					clearInterval(interval);
					await signOut({ callbackUrl: "/guest-login" });
				}
			} catch (err) {
				console.error("Presence heartbeat error:", err);
			}
		}, 30000);

		// 2. Beacon on tab/browser close to release guest lock immediately (guests only)
		const handleBeforeUnload = () => {
			if (!isGuest) return;
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

		if (isGuest) {
			window.addEventListener("beforeunload", handleBeforeUnload);
		}

		return () => {
			clearInterval(interval);
			if (isGuest) {
				window.removeEventListener("beforeunload", handleBeforeUnload);
			}
		};
	}, [user?.username, user?.accessToken, user?.userStatus]);

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
