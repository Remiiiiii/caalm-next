import { DOCS_NAV } from "@/lib/docs/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, LifeBuoy, Shield } from "lucide-react";

export const metadata: Metadata = {
	title: "CAALM Docs",
	description:
		"Learn CAALM end to end — concepts, role guides, feature reference, admin playbooks, and troubleshooting.",
};

const highlights = [
	{
		title: "Learn the product",
		body: "What CAALM is for, how to get in, and what to do in your first week.",
		href: "/docs/learn/what-is-caalm",
		icon: BookOpen,
	},
	{
		title: "Internalize the model",
		body: "Permissions, ownership, deadlines, and the lifecycle that keeps compliance calm.",
		href: "/docs/concepts/mental-model",
		icon: Compass,
	},
	{
		title: "Run the org",
		body: "Invite users, design access, require 2FA, and connect billing/integrations.",
		href: "/docs/admin/standup",
		icon: Shield,
	},
	{
		title: "Unstick a problem",
		body: "Sign-in, missing records, locks, quiet alerts, and demo vs production.",
		href: "/docs/troubleshooting/cant-sign-in",
		icon: LifeBuoy,
	},
];

export default function DocsHomePage() {
	return (
		<div className="pb-16">
			<section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-6 py-10 sm:px-10 sm:py-14 dark:border-slate-700 dark:bg-slate-900">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,83,132,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.08),_transparent_40%)] dark:bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.06),_transparent_40%)]"
				/>
				<div className="relative max-w-3xl">
					<p className="text-sm font-semibold uppercase tracking-wider text-[#0f5384] dark:text-sky-300">
						Documentation
					</p>
					<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-700 sm:text-5xl dark:text-slate-50">
						Everything you need to run CAALM with confidence
					</h1>
					<p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
						CAALM Docs is the in-depth guide for every role — from first login
						to renewals, approvals, analytics, and admin governance. Built like
						a product manual you can live in, not a brochure.
					</p>
					<div className="mt-6 flex flex-wrap gap-3">
						<Link
							href="/docs/learn/quick-start"
							className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0f5384] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90"
						>
							Start with Quick start
							<ArrowRight className="h-4 w-4" />
						</Link>
						<Link
							href="/docs/reference/permissions-catalog"
							className="inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:bg-slate-800"
						>
							Permissions catalog
						</Link>
					</div>
				</div>
			</section>

			<section className="mt-10 grid gap-4 sm:grid-cols-2">
				{highlights.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.href}
							href={item.href}
							className="group rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700 dark:hover:bg-slate-800/50"
						>
							<div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-[#0f5384] group-hover:bg-white dark:bg-slate-800 dark:text-sky-300 dark:group-hover:bg-slate-950">
								<Icon className="h-4 w-4" />
							</div>
							<h2 className="text-base font-semibold text-slate-700 dark:text-slate-100">
								{item.title}
							</h2>
							<p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
								{item.body}
							</p>
						</Link>
					);
				})}
			</section>

			<section className="mt-12 space-y-8">
				{DOCS_NAV.map((group) => (
					<div key={group.id}>
						<div className="mb-3">
							<h2 className="text-xl font-semibold text-slate-700 dark:text-slate-100">
								{group.title}
							</h2>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								{group.description}
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
							{group.items.map((item) => (
								<Link
									key={item.slug}
									href={`/docs/${item.slug}`}
									className="rounded-lg border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-sky-700 dark:hover:bg-slate-800/50"
								>
									<p className="text-sm font-medium text-slate-700 dark:text-slate-100">
										{item.title}
									</p>
									{item.summary ? (
										<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
											{item.summary}
										</p>
									) : null}
								</Link>
							))}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}
