import { SocketProvider } from "@/contexts/SocketProvider";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<section>
			<SocketProvider>{children}</SocketProvider>
		</section>
	);
}
