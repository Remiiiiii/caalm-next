import dynamic from "next/dynamic";
import Footer from "../components/Footer";
import Header from "../components/Header";
import AboutMission from "../components/landing/AboutMission";
import BookCallCta from "../components/landing/BookCallCta";
import HowItWorks from "../components/landing/HowItWorks";
import IntegrationsSection from "../components/landing/IntegrationsSection";
import LandingHero from "../components/landing/LandingHero";
import PerformanceMetrics from "../components/landing/PerformanceMetrics";
import ProductSpotlight from "../components/landing/ProductSpotlight";
import SmoothScrollProvider from "../components/landing/SmoothScrollProvider";
import TestimonialsCarousel from "../components/landing/TestimonialsCarousel";
import WaveLoopBackground from "../components/landing/WaveLoopBackground";
import Pricing from "../components/Pricing";
import QA from "../components/QA";
import TextMarquee from "@/components/TextMarquee";
import { loadPricingFromMarkdown } from "../lib/pricing";

const FeaturesDynamic = dynamic(() => import("../components/Features"));

export default async function HomePage() {
	const pricing = await loadPricingFromMarkdown();
	return (
		<SmoothScrollProvider>
			<Header />
			<main className="relative bg-gradient-to-b from-white via-blue-50/40 to-white">
				{/* Global subtle grid — original landing design */}
				<div
					className="pointer-events-none absolute inset-0 z-0 landing-grid-bg"
					aria-hidden
				/>
				<div className="relative z-10">
					<LandingHero />
					<ProductSpotlight />
					<HowItWorks />
					<FeaturesDynamic />
					<IntegrationsSection />
					<PerformanceMetrics />
					<TextMarquee />
					<AboutMission />
					<TestimonialsCarousel />
					<Pricing plans={pricing.plans} />
					<QA />
					<BookCallCta />
				</div>
			</main>
			<div className="relative">
				<WaveLoopBackground />
				<Footer />
			</div>
		</SmoothScrollProvider>
	);
}
