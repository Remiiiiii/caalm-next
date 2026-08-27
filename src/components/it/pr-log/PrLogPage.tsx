"use client";

import { ChevronDown, GitPullRequest } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { RoadmapBranchRow } from "@/components/it/roadmap/RoadmapBranchRow";
import { RoadmapProgressBar } from "@/components/it/roadmap/RoadmapProgressBar";
import { PageIndex } from "@/components/ui/page-index";
import type { PrLogOverview, PrLogPullRequestDetail, PrLogSection } from "@/lib/it/pr-log/types";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

const SECTIONS_PAGE_SIZE = 5;

type PrDetailResponse = {
	pullRequest: PrLogPullRequestDetail;
};

function PrLogUnavailableState({ detail }: { detail?: string }) {
	return (
		<div className="flex flex-col items-center justify-center text-center py-12 px-4">
			<Image
				src="/assets/icons/no-data.svg"
				alt="No agent pull requests"
				width={250}
				height={250}
				className="mx-auto mb-4"
			/>
			<p className="body-1 text-slate-700">No agent pull requests</p>
			{detail ? (
				<p className="text-sm text-slate-500 mt-2 max-w-md">{detail}</p>
			) : (
				<p className="text-sm text-slate-500 mt-2 max-w-md">
					Open Cursor cloud agent PRs on branches named cursor/… show up here.
				</p>
			)}
		</div>
	);
}

function PrLogSectionCard({
	section,
	expanded,
	onToggle,
}: {
	section: PrLogSection;
	expanded: boolean;
	onToggle: () => void;
}) {
	const locked = section.status === "locked";
	const { data, isLoading } = useSWR<PrDetailResponse>(
		expanded ? `/api/it/pr-log/${section.prNumber}` : null,
		fetcher,
	);
	const pr = data?.pullRequest;

	return (
		<div
			className={cn(
				"w-full rounded-lg border p-3 transition-all duration-200",
				locked
					? "border-slate-200 bg-slate-100/80 text-slate-500"
					: "border-slate-200 bg-white",
				expanded ? "border-blue-300 ring-2 ring-[#0f5384]/20" : "",
			)}
		>
			<div
				className="flex items-start gap-2 cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				role="button"
				tabIndex={0}
				aria-expanded={expanded}
				aria-label={`${expanded ? "Collapse" : "Expand"} PR #${section.prNumber}`}
				onClick={onToggle}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onToggle();
					}
				}}
			>
				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between gap-2 mb-2">
						<span className="text-sm font-semibold text-slate-700">
							{section.sectionNumber}. {section.title}
						</span>
						<span className="text-[10px] uppercase text-slate-500">
							{section.status.replace("_", " ")}
						</span>
					</div>
					<RoadmapProgressBar percent={section.progressPercent} size="sm" />
					{section.mergeBlockReason && section.status !== "complete" ? (
						<p className="text-xs text-slate-600 mt-1 text-center">
							{section.mergeBlockReason}
						</p>
					) : null}
					{section.prLinks?.map((link) => (
						<p
							key={link.number}
							className="text-xs text-slate-600 mt-2 line-clamp-2"
						>
							#{link.number}
							{link.title ? (
								<span
									className={cn(
										link.state === "merged" && "line-through text-slate-500",
									)}
								>
									{" "}
									{link.title}
								</span>
							) : null}
							{link.state ? (
								<span className="text-slate-500"> · {link.state}</span>
							) : null}
						</p>
					))}
				</div>
				<span
					className="mt-0.5 shrink-0 rounded-md p-1 text-[#0f5384] pointer-events-none"
					aria-hidden
				>
					<ChevronDown
						className={cn(
							"h-4 w-4 transition-transform duration-200",
							expanded && "rotate-180",
						)}
					/>
				</span>
			</div>

			{expanded ? (
				<div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
					{section.headRef ? (
						<RoadmapBranchRow branch={section.headRef} />
					) : null}
					{isLoading ? (
						<p className="text-xs text-slate-600">Loading pull request…</p>
					) : pr ? (
						<div className="space-y-1.5">
							{pr.htmlUrl ? (
								<a
									href={pr.htmlUrl}
									className="text-[11px] text-[#0f5384] underline"
									target="_blank"
									rel="noreferrer"
								>
									View on GitHub
								</a>
							) : null}
							{pr.body ? (
								<div className="text-xs text-slate-600 [&_.docs-prose]:max-w-none [&_h1]:mb-2 [&_h1]:mt-1 [&_h1]:text-sm [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:text-sm [&_h3]:mb-1 [&_h3]:mt-2 [&_h3]:text-xs [&_ol]:my-2 [&_ol]:text-xs [&_ol]:leading-5 [&_p]:my-2 [&_p]:text-xs [&_p]:leading-5 [&_pre]:my-2 [&_pre]:p-2 [&_pre]:text-[11px] [&_ul]:my-2 [&_ul]:text-xs [&_ul]:leading-5">
									<DocsMarkdown markdown={pr.body} />
								</div>
							) : (
								<p className="text-xs text-slate-600">
									This PR has no description.
								</p>
							)}
						</div>
					) : (
						<p className="text-xs text-slate-600">
							Could not load this pull request.
						</p>
					)}
				</div>
			) : null}
		</div>
	);
}

export function PrLogPage() {
	const {
		data: overview,
		error: overviewError,
		isLoading: overviewLoading,
	} = useSWR<PrLogOverview>("/api/it/pr-log", fetcher, {
		refreshInterval: 30_000,
		revalidateOnFocus: true,
		keepPreviousData: true,
	});

	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [sectionPage, setSectionPage] = useState(1);

	const pagedSections = useMemo(() => {
		const sections = overview?.sections || [];
		const start = (sectionPage - 1) * SECTIONS_PAGE_SIZE;
		return sections.slice(start, start + SECTIONS_PAGE_SIZE);
	}, [overview?.sections, sectionPage]);

	const toggleSection = (sectionId: string) => {
		setExpandedIds((current) => {
			const next = new Set(current);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
	};

	return (
		<ITPageShell
			title="PR log"
			subtitle="Cloud agent pull requests — each open cursor/ branch appears as a section. Merge with green tests to complete it."
			icon={GitPullRequest}
		>
			{overviewLoading && !overview ? (
				<p className="text-sm text-slate-600">Loading PR log…</p>
			) : overview?.sections?.length ? (
				<div className="space-y-6">
					<ITGlassPanel>
						<RoadmapProgressBar
							percent={overview.overallProgressPercent}
							label="Agent PRs merged"
							size="md"
						/>
						<p className="text-xs text-slate-500 mt-2">
							Progress = merged agent PRs ÷ open agent PRs on this list.
						</p>
					</ITGlassPanel>

					<div className="space-y-3">
						{pagedSections.map((section) => (
							<PrLogSectionCard
								key={section.id}
								section={section}
								expanded={expandedIds.has(section.id)}
								onToggle={() => toggleSection(section.id)}
							/>
						))}
						<PageIndex
							page={sectionPage}
							totalItems={overview.sections.length}
							pageSize={SECTIONS_PAGE_SIZE}
							onPageChange={setSectionPage}
							hideWhenSinglePage
							showRange
							itemLabel="pull requests"
						/>
					</div>
				</div>
			) : (
				<PrLogUnavailableState
					detail={
						overviewError instanceof Error
							? overviewError.message
							: undefined
					}
				/>
			)}
		</ITPageShell>
	);
}
