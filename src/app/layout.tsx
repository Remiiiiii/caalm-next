import "./globals.css";

import { Poppins } from "next/font/google";
import type { ReactNode } from "react";
import DemoBanner from "@/components/DemoBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import SWRProvider from "@/components/providers/SWRProvider";

const poppins = Poppins({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-poppins",
});

export const metadata = {
	title: "CAALM Solutions",
	description: "Compliance and Agreement Lifecycle Management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
			<head>
				{/* <link
          rel="icon"
          href="/assets/images/logo.png"
          type="image/png"
          sizes="452x431"
        /> */}
				{/* <link
          rel="icon"
          href="/favicon.ico"
          type="image/x-icon"
          sizes="48x48"
        /> */}

				{/* <link
          rel="icon"
          href="/assets/images/logo.svg"
          type="image/svg+xml"
          sizes="96x96"
        /> */}
			</head>
			<body
				suppressHydrationWarning
				className={`${poppins.variable} font-poppins antialiased`}
			>
				<ErrorBoundary>
					<SWRProvider>
						<DemoBanner />
						{children}
					</SWRProvider>
				</ErrorBoundary>
			</body>
		</html>
	);
}
