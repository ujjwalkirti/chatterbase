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
