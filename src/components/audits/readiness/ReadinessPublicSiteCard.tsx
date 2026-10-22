"use client";

import { Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { NEUTRAL_PILL, PILL, RAG_PILL } from "./readiness-ui";
import type { ReadinessResponse } from "./types";

type Payload = ReadinessResponse["data"];
type SiteCrawl = NonNullable<Payload["siteCrawl"]>;
type Status = "healthy" | "needs_attention" | "unreachable" | "not_set_up";

const RE_CRAWL_COOLDOWN_MS = 5 * 60 * 1000;

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
	healthy: { label: "Healthy", className: RAG_PILL.green },
	needs_attention: { label: "Needs attention", className: RAG_PILL.amber },
	unreachable: { label: "Unreachable", className: RAG_PILL.red },
	not_set_up: { label: "Not set up", className: NEUTRAL_PILL },
};

interface CheckRow {
	key: string;
	name: string;
	iconOk: boolean;
	/** Counts toward "n of 3 checks needs attention" and drives the pill color. */
	badgeAmber: boolean;
	badgeText: string;
	badgeClass: string;
	explanation: string;
	action?: { label: string; href: string };
	helpText?: string;
}

function lowerFirst(text: string): string {
	return text.length ? text[0].toLowerCase() + text.slice(1) : text;
}

function buildChecks(siteCrawl: SiteCrawl): CheckRow[] {
	const robotsOk = siteCrawl.robotsTxtFound;
	const sitemapOk = siteCrawl.sitemapFound;
	const pagesCount = siteCrawl.pages.length;
	const pagesPlural = pagesCount === 1 ? "page" : "pages";
	const origin = (() => {
		try {
			return new URL(siteCrawl.websiteUrl).origin;
		} catch {
			return siteCrawl.websiteUrl;
		}
	})();

	const pagesCheck: CheckRow =
		pagesCount === 0
			? {
					key: "pages",
					name: "Pages found",
					iconOk: false,
					badgeAmber: true,
					badgeText: "0 pages",
					badgeClass: RAG_PILL.amber,
					explanation:
						"No pages could be read. Check that the site is public and the URL is correct.",
					action: { label: "Edit website URL", href: "/settings/organization" },
				}
			: {
					key: "pages",
					name: "Pages found",
					iconOk: pagesCount >= 2 && sitemapOk,
					badgeAmber: false,
					badgeText: `${pagesCount} ${pagesPlural}`,
					badgeClass: NEUTRAL_PILL,
					explanation:
						pagesCount === 1 || !sitemapOk
							? `${pagesCount} ${pagesPlural} discovered. Without a sitemap, only pages linked from the homepage are found, so this count may be incomplete.`
							: `${pagesCount} ${pagesPlural} discovered.`,
				};

	return [
		{
			key: "robots",
			name: "robots.txt",
			iconOk: robotsOk,
			badgeAmber: !robotsOk,
			badgeText: robotsOk ? "Found" : "Not found",
			badgeClass: robotsOk ? RAG_PILL.green : RAG_PILL.amber,
			explanation: robotsOk
				? "Found at /robots.txt. Tells search engines which pages they may crawl."
				: "Not found at /robots.txt. Crawlers will assume everything may be crawled.",
			helpText: robotsOk
				? undefined
				: `Add a robots.txt file at ${origin}/robots.txt that lists which paths crawlers may access, then re-crawl.`,
		},
		{
			key: "sitemap",
			name: "sitemap.xml",
			iconOk: sitemapOk,
			badgeAmber: !sitemapOk,
			badgeText: sitemapOk ? "Found" : "Not found",
			badgeClass: sitemapOk ? RAG_PILL.green : RAG_PILL.amber,
			explanation: sitemapOk
				? "Found at /sitemap.xml. Lists your pages for crawlers."
				: "Not found at /sitemap.xml. A sitemap lists every page so crawlers can find them. Add one, then re-crawl.",
			helpText: sitemapOk
				? undefined
				: `Generate a sitemap.xml listing your public pages and publish it at ${origin}/sitemap.xml, then re-crawl.`,
		},
		pagesCheck,
	];
}

function BrowserFrame({
	websiteUrl,
	caption,
	unreachable,
	errorReason,
	screenshot,
}: {
	websiteUrl: string;
	caption: string;
	unreachable: boolean;
	errorReason?: string | null;
	screenshot?: { src: string; capturedAt: string } | null;
}) {
	const [enlarged, setEnlarged] = useState(false);
	const alt = `Screenshot of ${websiteUrl} homepage`;

	return (
		<div className="lg:w-[560px] lg:shrink-0">
			<div className="overflow-hidden rounded-lg border border-slate-200">
				<div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-3 py-2">
					<span className="flex gap-1">
						<span className="h-2 w-2 rounded-full bg-slate-300" />
						<span className="h-2 w-2 rounded-full bg-slate-300" />
						<span className="h-2 w-2 rounded-full bg-slate-300" />
					</span>
					<div className="flex-1 truncate rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
						{websiteUrl}
					</div>
				</div>
				{screenshot && !unreachable ? (
					<button
						type="button"
						onClick={() => setEnlarged(true)}
						className="block h-[300px] w-full cursor-zoom-in overflow-hidden bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB] focus-visible:ring-inset"
					>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={screenshot.src}
							alt={alt}
							className="h-full w-full object-cover object-top"
						/>
					</button>
				) : (
					<div className="flex h-[300px] flex-col items-center justify-center gap-1 bg-slate-50 px-6 text-center text-sm text-slate-400">
						{unreachable ? (
							<>
								<p>Couldn't load the site</p>
								{errorReason && <p className="text-xs">{errorReason}</p>}
							</>
						) : (
							<p>Screenshot not available yet</p>
						)}
					</div>
				)}
			</div>
			<div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
				<span>{caption}</span>
				{!unreachable && (
					<a
						href={websiteUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="shrink-0 rounded-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
					>
						Open site ↗
					</a>
				)}
			</div>

			{screenshot && (
				<Dialog open={enlarged} onOpenChange={setEnlarged}>
					<DialogContent className="max-w-3xl p-2" aria-describedby={undefined}>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={screenshot.src} alt={alt} className="w-full rounded-md" />
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}

/** Informational crawl summary. Never part of the readiness score. */
export function ReadinessPublicSiteCard({
	siteCrawl,
	org,
	running,
	canManage,
	nextRunLabel,
	onReCrawl,
	onHighlightEvidence,
}: {
	siteCrawl: Payload["siteCrawl"];
	org: Payload["org"];
	/** A full readiness run (which includes the crawl) is in flight. */
	running: boolean;
	canManage: boolean;
	nextRunLabel?: string | null;
	onReCrawl: () => void;
	/** Scrolls to and highlights SITE-PUBLIC-PRESENCE in the Evidence map. */
	onHighlightEvidence: () => void;
}) {
	const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);

	useEffect(() => {
		if (!siteCrawl) {
			setCooldownUntil(null);
			return;
		}
		const until =
			new Date(siteCrawl.crawledAt).getTime() + RE_CRAWL_COOLDOWN_MS;
		const remaining = until - Date.now();
		if (remaining <= 0) {
			setCooldownUntil(null);
			return;
		}
		setCooldownUntil(until);
		const timer = setTimeout(() => setCooldownUntil(null), remaining);
		return () => clearTimeout(timer);
	}, [siteCrawl]);

	const notSetUp = !org.websiteUrl;
	const unreachable =
		!notSetUp && (!siteCrawl || siteCrawl.healthHint === "unavailable");
	const checks = siteCrawl ? buildChecks(siteCrawl) : [];
	const failingCheck = checks.find((check) => check.badgeAmber);
	const failingCount = checks.filter((check) => check.badgeAmber).length;

	const status: Status = notSetUp
		? "not_set_up"
		: unreachable
			? "unreachable"
			: failingCount === 0
				? "healthy"
				: "needs_attention";

	const badge = STATUS_BADGE[status];
	const cooldownActive = cooldownUntil !== null;

	const actions = canManage && !notSetUp && (
		<div className="flex flex-wrap items-center gap-2">
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<Button
								size="sm"
								className="btn-primary px-4 sm:px-4 shimmer-hover"
								disabled={running || cooldownActive}
								onClick={onReCrawl}
							>
								{running ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<RefreshCw className="h-4 w-4" />
								)}
								{running ? "Crawling…" : "Re-crawl now"}
							</Button>
						</span>
					</TooltipTrigger>
					{cooldownActive && cooldownUntil && (
						<TooltipContent>
							Next re-crawl available at{" "}
							{formatInTimezone(
								new Date(cooldownUntil),
								"h:mm a",
								org.timezone,
							)}
						</TooltipContent>
					)}
				</Tooltip>
			</TooltipProvider>
			<Button
				variant="ghost"
				size="sm"
				className="btn-primary px-4 sm:px-4 shimmer-hover"
				asChild
			>
				<Link href="/settings/organization">Edit website URL</Link>
			</Button>
		</div>
	);

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 text-slate-700 sm:p-6">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex items-center gap-2">
						<p className="h5 sidebar-gradient-text">Public site</p>
						<span className={cn(PILL, NEUTRAL_PILL)}>
							Informational · not scored
						</span>
					</div>
					{actions}
				</div>

				{notSetUp ? (
					<div className="mt-4 flex flex-col items-start gap-3 border-t border-slate-200 pt-4">
						<p className="text-sm text-slate-600">No website added yet.</p>
						<Link href="/settings/organization" className="btn-primary">
							Set website URL in Organization settings
						</Link>
					</div>
				) : (
					<>
						<div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
							<BrowserFrame
								websiteUrl={org.websiteUrl ?? ""}
								caption={
									running
										? "Updating…"
										: siteCrawl
											? `Last checked ${formatInTimezone(new Date(siteCrawl.crawledAt), "MMM d, h:mm a", org.timezone)}`
											: "Not checked yet"
								}
								unreachable={unreachable}
								errorReason={siteCrawl?.issues[0]}
								screenshot={siteCrawl?.screenshot}
							/>

							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className={cn(PILL, badge.className)}>
										{badge.label}
									</span>
									<span className="text-sm font-semibold text-slate-700">
										{unreachable
											? "Site unreachable"
											: failingCount === 0
												? "All checks passed"
												: `${failingCount} of ${checks.length} checks needs attention`}
									</span>
								</div>

								{unreachable ? (
									<p className="mt-2 text-sm text-slate-500">
										We couldn't reach {org.websiteUrl}. Check the address and
										that the site is public.
									</p>
								) : (
									<>
										{failingCheck && (
											<p className="mt-2 text-sm text-slate-500">
												Your site was reachable, but{" "}
												{lowerFirst(failingCheck.explanation)} This does not
												change your readiness score. It affects the{" "}
												<button
													type="button"
													onClick={onHighlightEvidence}
													className="rounded-sm font-medium text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
												>
													SITE-PUBLIC-PRESENCE
												</button>{" "}
												item in the Evidence map.
											</p>
										)}

										<ul className="mt-4 divide-y divide-slate-200 border-t border-slate-200">
											{checks.map((check) => (
												<li
													key={check.key}
													className="flex items-start gap-3 py-3"
												>
													<span
														className={cn(
															"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
															check.iconOk
																? "border-green/20 bg-green/10 text-green"
																: "border-orange/20 bg-orange/10 text-orange",
														)}
													>
														{check.iconOk ? (
															<Check className="h-3 w-3" />
														) : (
															<TriangleAlert className="h-3 w-3" />
														)}
													</span>
													<div className="min-w-0 flex-1">
														<div className="flex items-center justify-between gap-3">
															<p className="text-sm font-semibold text-slate-800">
																{check.name}
															</p>
															<span
																className={cn(
																	PILL,
																	"shrink-0",
																	check.badgeClass,
																)}
															>
																{check.badgeText}
															</span>
														</div>
														<p className="mt-0.5 text-[13px] text-slate-500">
															{check.explanation}
														</p>
														{check.action && (
															<Link
																href={check.action.href}
																className="mt-1 inline-block text-sm font-medium text-[#078FAB] hover:underline"
															>
																{check.action.label}
															</Link>
														)}
														{check.helpText && (
															<Popover>
																<PopoverTrigger className="mt-1 block rounded-sm text-sm font-medium text-[#078FAB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]">
																	How to fix →
																</PopoverTrigger>
																<PopoverContent className="w-lg text-sm text-slate-600">
																	{check.helpText}
																</PopoverContent>
															</Popover>
														)}
													</div>
												</li>
											))}
										</ul>
									</>
								)}
							</div>
						</div>

						<div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
							<span>Org timezone for scheduled crawls: {org.timezone}</span>
							{nextRunLabel && <span>Next crawl: {nextRunLabel}</span>}
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
}
