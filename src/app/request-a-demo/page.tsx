import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RequestDemoClient from "@/components/demo/RequestDemoClient";
import SmoothScrollProvider from "@/components/landing/SmoothScrollProvider";
import WaveLoopBackground from "@/components/landing/WaveLoopBackground";

export const metadata: Metadata = {
	title: "Book a demo | CAALM",
	description:
		"See how CAALM tracks agreements first, then donors, gifts, and grant worksheets in the same workspace.",
};

export default function RequestDemoPage() {
	return (
		<SmoothScrollProvider>
			<Header />
			<main className="relative bg-gradient-to-b from-white via-blue-50/40 to-white">
				<div
					className="pointer-events-none absolute inset-0 z-0 landing-grid-bg"
					aria-hidden
				/>
				<div className="relative z-10">
					<RequestDemoClient />
				</div>
			</main>
			<div className="relative">
				<WaveLoopBackground />
				<Footer />
			</div>
		</SmoothScrollProvider>
	);
}
