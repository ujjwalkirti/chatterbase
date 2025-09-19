'use client';
import { jwtDecode } from "jwt-decode";
import { useRouter } from "next/navigation";
import React from "react";

type authContextType = {
	user: User | null;
}

const authContext = React.createContext<authContextType>({
	user: null
});

function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = React.useState<User | null>(null);
	const router = useRouter()
	React.useEffect(() => {
		const token = localStorage.getItem("chatter_base_token");
		if (token) {
			// verify the token
			fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ token }),
			}).then((res) => {
				if (!res.ok) {
					localStorage.removeItem("chatter_base_token");
					setUser(null);
					router.push('/login');
				}
			});
			// decode the token
			setUser(jwtDecode(token));
		} else {
			setUser(null);
			router.push('/login');
		}
	}, []);

	return <authContext.Provider value={{ user }}>{children}</authContext.Provider>;
}

export { AuthProvider, authContext };
