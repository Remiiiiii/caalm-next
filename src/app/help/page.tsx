import type { Metadata } from "next";
import Link from "next/link";
import {
	BookOpen,
	CircleHelp,
	Mail,
	MessageCircleQuestionMark,
	MessageSquare,
	Ticket,
} from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import HelpTopicList from "./HelpTopicList";

export const metadata: Metadata = {
	title: "Get help - CAALM",
	description:
		"Find answers in CAALM Docs, open a support ticket, or contact the CAALM team.",
};

const helpCards = [
	{
		title: "CAALM Docs",
		body: "Guides for first login, permissions, contracts, licenses, and admin setup.",
		href: "/docs",
		icon: BookOpen,
		cta: "Open docs",
	},
	{
		title: "Report an issue",
		body: "Something broken in the app? Open a ticket so IT can track and fix it.",
		href: "/tickets/new",
		icon: Ticket,
		cta: "Create a ticket",
	},
	{
		title: "Email support",
		body: "Billing, onboarding, and account questions go to the support inbox.",
		href: "mailto:support@caalmsolutions.com",
		icon: Mail,
		cta: "Email support",
	},
	{
		title: "Contact us",
		body: "Sales, enterprise, or a walkthrough for your team — send a short note.",
		href: "/contact",
		icon: MessageSquare,
		cta: "Go to contact",
	},
];

export default function HelpPage() {
	return (
		<>
			<Header />
			<main className="relative mt-10">
				<section className="relative z-10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
					<div className="mx-auto max-w-4xl text-slate-700">
						<div className="mb-8 flex items-center gap-3">
							<MessageCircleQuestionMark className="h-7 w-7 text-[#0f5384]" />
							<h1 className="text-3xl font-semibold sidebar-gradient-text sm:text-4xl">
								Get help
							</h1>
						</div>
						<p className="max-w-2xl text-sm text-slate-600 sm:text-base">
							Start with docs for how CAALM works. If you are stuck on a
							specific screen, open a ticket or email support.
						</p>

						<div className="mt-10 grid gap-4 sm:grid-cols-2">
							{helpCards.map((card) => {
								const Icon = card.icon;
								const isExternal = card.href.startsWith("mailto:");
								const className =
									"flex h-full cursor-pointer flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40";
								const inner = (
									<>
										<Icon className="h-5 w-5 text-[#0f5384]" />
										<h2 className="mt-3 text-lg font-semibold text-slate-700">
											{card.title}
										</h2>
										<p className="mt-2 flex-1 text-sm text-slate-600">
											{card.body}
										</p>
										<span className="mt-4 text-sm font-medium text-[#0f5384]">
											{card.cta}
										</span>
									</>
								);
								return isExternal ? (
									<a key={card.href} href={card.href} className={className}>
										{inner}
									</a>
								) : (
									<Link key={card.href} href={card.href} className={className}>
										{inner}
									</Link>
								);
							})}
						</div>

						<HelpTopicList />

						<div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
							<div className="flex items-start gap-3">
								<CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-[#0f5384]" />
								<div>
									<h2 className="text-base font-semibold text-slate-700">
										Can&apos;t sign in?
									</h2>
									<p className="mt-1 text-sm text-slate-600">
										Check{" "}
										<Link
											href="/docs/troubleshooting/cant-sign-in"
											className="font-medium text-[#0f5384] underline-offset-2 hover:underline"
										>
											sign-in troubleshooting
										</Link>{" "}
										or email{" "}
										<a
											href="mailto:support@caalmsolutions.com"
											className="font-medium text-[#0f5384] underline-offset-2 hover:underline"
										>
											support@caalmsolutions.com
										</a>
										.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>
			<Footer />
		</>
	);
}
