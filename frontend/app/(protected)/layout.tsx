import Navbar from "@/components/common/Navbar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthProvider";

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await auth();

	if (!session) {
		redirect("/login");
	}

	return (
		<section>
			<Navbar />
			<AuthProvider>{children}</AuthProvider>
		</section>
	);
}
