import Navbar from "@/components/common/Navbar";
import { AuthProvider } from "@/contexts/AuthProvider";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<section>
			<Navbar />
			<AuthProvider>{children}</AuthProvider>
		</section>
	);
}
