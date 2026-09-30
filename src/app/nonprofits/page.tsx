import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BoardReportingBand from "@/components/landing/nonprofits/BoardReportingBand";
import DonorJourney from "@/components/landing/nonprofits/DonorJourney";
import NonprofitCta from "@/components/landing/nonprofits/NonprofitCta";
import NonprofitHero from "@/components/landing/nonprofits/NonprofitHero";
import NonprofitPillars from "@/components/landing/nonprofits/NonprofitPillars";
import PlatformScope from "@/components/landing/nonprofits/PlatformScope";
import SmoothScrollProvider from "@/components/landing/SmoothScrollProvider";
import WaveLoopBackground from "@/components/landing/WaveLoopBackground";

export const metadata: Metadata = {
	title: "Nonprofit suite | CAALM",
	description:
		"Donors, gifts, restricted funds, volunteers, events, and board reporting next to the grant contracts that fund your programs.",
};

export default function NonprofitsPage() {
	return (
		<SmoothScrollProvider>
			<Header />
			<main className="relative bg-gradient-to-b from-white via-blue-50/40 to-white">
				<div
					className="pointer-events-none absolute inset-0 z-0 landing-grid-bg"
					aria-hidden
				/>
				<div className="relative z-10">
					<NonprofitHero />
					<DonorJourney />
					<NonprofitPillars />
					<BoardReportingBand />
					<PlatformScope />
					<NonprofitCta />
				</div>
			</main>
			<div className="relative">
				<WaveLoopBackground />
				<Footer />
			</div>
		</SmoothScrollProvider>
	);
}
