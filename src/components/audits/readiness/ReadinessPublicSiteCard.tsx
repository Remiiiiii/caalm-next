"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NEUTRAL_PILL, PILL, RAG_PILL, RAG_STATUS_COPY } from "./readiness-ui";
import type { ReadinessResponse } from "./types";

type Payload = ReadinessResponse["data"];

function Row({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-t border-slate-200 py-2 text-sm text-slate-600">
			<span>{label}</span>
			<span className="font-semibold text-slate-700">{children}</span>
		</div>
	);
}

/** Compact, informational crawl summary. Never part of the readiness score. */
export function ReadinessPublicSiteCard({
	siteCrawl,
	org,
}: {
	siteCrawl: Payload["siteCrawl"];
	org: Payload["org"];
}) {
	const health = siteCrawl?.healthHint ?? "unavailable";
	return (
		<Card className="glass-card h-full">
			<div className="glass-card-cap" />
			<CardContent className="flex h-full flex-col gap-3 p-4 text-slate-700 sm:p-6">
				<div className="flex items-center justify-between gap-2">
					<p className="h5 sidebar-gradient-text">Public site</p>
					<span className={cn(PILL, NEUTRAL_PILL)}>
						Informational · not scored
					</span>
				</div>

				{siteCrawl ? (
					<>
						<a
							href={siteCrawl.websiteUrl}
							target="_blank"
							rel="noreferrer"
							className="break-all text-sm font-semibold text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
						>
							{siteCrawl.websiteUrl}
						</a>
						<span
							className={cn(
								PILL,
								"self-start",
								health === "ok" ? RAG_PILL.green : RAG_PILL.amber,
							)}
						>
							{RAG_STATUS_COPY[health] ?? "Needs attention"}
						</span>
						<div className="mt-auto">
							<Row label="Pages found">{siteCrawl.pages.length}</Row>
							<Row label="robots.txt">
								<span
									className={cn(
										PILL,
										siteCrawl.robotsTxtFound ? RAG_PILL.green : RAG_PILL.amber,
									)}
								>
									{siteCrawl.robotsTxtFound ? "Found" : "Not found"}
								</span>
							</Row>
							<Row label="sitemap.xml">
								<span
									className={cn(
										PILL,
										siteCrawl.sitemapFound ? RAG_PILL.green : RAG_PILL.amber,
									)}
								>
									{siteCrawl.sitemapFound ? "Found" : "Not found"}
								</span>
							</Row>
							<Row label="Org timezone for scheduled runs">{org.timezone}</Row>
						</div>
					</>
				) : (
					<>
						<p className="text-sm text-slate-600">
							No website URL is set for {org.name}, so the public site was not
							checked.
						</p>
						<div className="mt-auto">
							<Row label="Org timezone for scheduled runs">{org.timezone}</Row>
						</div>
					</>
				)}

				<Link
					href="/settings/organization"
					className="rounded-sm text-sm font-medium text-[#078FAB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
				>
					Set website URL in Organization settings →
				</Link>
			</CardContent>
		</Card>
	);
}
