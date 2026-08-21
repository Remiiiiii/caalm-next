import type { Metadata } from "next";
import { Mail } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
	title: "Contact Us - CAALM",
	description:
		"Contact CAALM for sales, onboarding, enterprise plans, and support.",
};

export default function ContactPage() {
	return (
		<>
			<Header />
			<main className="relative mt-10">
				<section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
					<div className="mx-auto max-w-4xl text-slate-700">
						<div className="mb-8 flex items-center gap-3">
							<Mail className="h-7 w-7 text-[#0f5384]" />
							<h1 className="text-3xl font-semibold sidebar-gradient-text sm:text-4xl">
								Contact Us
							</h1>
						</div>
						<p className="max-w-2xl text-sm text-slate-600 sm:text-base">
							Tell us about your team and what you need. This opens your email
							app with the details filled in so it goes straight to
							support@caalmsolutions.com.
						</p>

						<div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
							<ContactForm />
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</>
	);
}
