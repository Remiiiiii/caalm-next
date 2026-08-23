"use client";

import { ChevronDown, Map } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { ITGlassPanel, ITPageShell } from "@/components/it/ITPageShell";
import { RoadmapProgressBar } from "@/components/it/roadmap/RoadmapProgressBar";
import { RoadmapTaskTree } from "@/components/it/roadmap/RoadmapTaskTree";
import { PageIndex } from "@/components/ui/page-index";
import type { RoadmapOverview, RoadmapTaskTreeNode } from "@/lib/roadmap/types";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

type SectionTasksResponse = {
	sectionId: string;
	tasks: RoadmapTaskTreeNode[];
};

type SectionPullRequestsResponse = {
	sectionId: string;
	pullRequests: Array<{
		number: number;
		title: string;
		state: string;
		htmlUrl: string;
		body: string;
	}>;
};

const SECTIONS_PAGE_SIZE = 5;

function RoadmapUnavailableState() {
	return (
		<div className="flex flex-col items-center justify-center text-center py-12 px-4">
			<Image
				src="/assets/icons/no-data.svg"
				alt="Roadmap not found"
				width={250}
				height={250}
				className="mx-auto mb-4"
			/>
			<p className="body-1 text-slate-700">Roadmap not found</p>
		</div>
	);
}

function RoadmapSectionCard({
	section,
	expanded,
	onToggle,
	detailExpanded,
	onToggleDetail,
}: {
	section: RoadmapOverview["sections"][number];
	expanded: boolean;
	onToggle: () => void;
	detailExpanded: boolean;
	onToggleDetail: () => void;
}) {
	const locked = section.status === "locked";
	const { data: sectionTasks, isLoading: tasksLoading } =
		useSWR<SectionTasksResponse>(
			expanded ? `/api/roadmap/sections/${section.id}/tasks` : null,
			fetcher,
			{ refreshInterval: 60_000, keepPreviousData: true },
		);
	const { data: prs, isLoading: prsLoading } =
		useSWR<SectionPullRequestsResponse>(
			expanded && detailExpanded
				? `/api/roadmap/sections/${section.id}/pull-requests`
				: null,
			fetcher,
		);

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
				aria-label={`${expanded ? "Collapse" : "Expand"} ${section.title} tasks`}
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
					<p className="text-xs text-slate-500 mt-1">
						{section.taskCounts.complete}/{section.taskCounts.total} complete
					</p>
					{section.mergeBlockReason && section.status !== "complete" ? (
						<p className="text-xs text-slate-600 mt-1">
							{section.mergeBlockReason}
						</p>
					) : null}
					{section.prLinks && section.prLinks.length > 0 ? (
						<ul className="mt-2 space-y-1">
							{section.prLinks.map((pr) => (
								<li
									key={pr.number}
									className="text-xs text-slate-600 line-clamp-2"
									title={`#${pr.number} ${pr.title}`}
								>
									#{pr.number} {pr.title}
									{pr.state ? (
										<span className="text-slate-500"> · {pr.state}</span>
									) : null}
								</li>
							))}
						</ul>
					) : section.prTitle ? (
						<p className="text-xs text-slate-600 mt-2">{section.prTitle}</p>
					) : null}
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
					{tasksLoading ? (
						<p className="text-sm text-slate-600">Loading tasks…</p>
					) : (
						<RoadmapTaskTree tasks={sectionTasks?.tasks || []} />
					)}
					<div
						className="flex items-center justify-between gap-2 cursor-pointer rounded-md pt-2 border-t border-slate-200 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						role="button"
						tabIndex={0}
						aria-expanded={detailExpanded}
						aria-label={`${detailExpanded ? "Collapse" : "Expand"} pull request detail`}
						onClick={onToggleDetail}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onToggleDetail();
							}
						}}
					>
						<span className="text-xs font-medium text-slate-500">
							Pull request
						</span>
						<span
							className="shrink-0 rounded-md p-1 text-[#0f5384] pointer-events-none"
							aria-hidden
						>
							<ChevronDown
								className={cn(
									"h-4 w-4 transition-transform duration-200",
									detailExpanded && "rotate-180",
								)}
							/>
						</span>
					</div>
					{detailExpanded ? (
						prsLoading ? (
							<p className="text-xs text-slate-600">Loading pull request…</p>
						) : !prs?.pullRequests.length ? (
							<p className="text-xs text-slate-600">
								No catalog PRs linked to this section.
							</p>
						) : (
							<div className="space-y-4">
								{prs.pullRequests.map((pr) => (
									<div key={pr.number} className="space-y-1.5">
										<p className="text-xs font-semibold text-slate-700">
											#{pr.number} {pr.title}
											<span className="ml-2 font-normal text-slate-500 capitalize">
												{pr.state}
											</span>
										</p>
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
								))}
							</div>
						)
					) : null}
				</div>
			) : null}
		</div>
	);
}

export function ClmRoadmapPage() {
	const { data: overview, isLoading: overviewLoading } =
		useSWR<RoadmapOverview>("/api/roadmap/overview", fetcher, {
			refreshInterval: 60_000,
			keepPreviousData: true,
		});

	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [detailOpenIds, setDetailOpenIds] = useState<Set<string>>(new Set());
	const seededExpand = useRef(false);
	const [sectionPage, setSectionPage] = useState(1);

	useEffect(() => {
		if (seededExpand.current || !overview?.sections?.length) return;
		const firstOpen =
			overview.sections.find((s) => s.status !== "locked") ||
			overview.sections[0];
		if (!firstOpen?.id) return;
		seededExpand.current = true;
		setExpandedIds(new Set([firstOpen.id]));
	}, [overview]);

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

	const toggleDetail = (sectionId: string) => {
		setDetailOpenIds((current) => {
			const next = new Set(current);
			if (next.has(sectionId)) next.delete(sectionId);
			else next.add(sectionId);
			return next;
		});
	};

	return (
		<ITPageShell
			title="CLM Completion Roadmap"
			subtitle="Interactive plan engine — A section completes only when every catalog PR merges to main with green tests."
			icon={Map}
		>
			{overviewLoading && !overview ? (
				<p className="text-sm text-slate-600">Loading roadmap…</p>
			) : overview?.sections?.length ? (
				<div className="space-y-6">
					<ITGlassPanel>
						<RoadmapProgressBar
							percent={overview.overallProgressPercent}
							label="Overall CLM buildout"
							size="md"
						/>
						<p className="text-xs text-slate-500 mt-2">
							Progress = complete tasks ÷ total tasks (derived, not stored).
						</p>
					</ITGlassPanel>

					<div className="space-y-3">
						{pagedSections.map((section) => (
							<RoadmapSectionCard
								key={section.id}
								section={section}
								expanded={expandedIds.has(section.id)}
								onToggle={() => toggleSection(section.id)}
								detailExpanded={detailOpenIds.has(section.id)}
								onToggleDetail={() => toggleDetail(section.id)}
							/>
						))}
						<PageIndex
							page={sectionPage}
							totalItems={overview.sections.length}
							pageSize={SECTIONS_PAGE_SIZE}
							onPageChange={setSectionPage}
							hideWhenSinglePage
							showRange
							itemLabel="sections"
						/>
					</div>
				</div>
			) : (
				<RoadmapUnavailableState />
			)}
		</ITPageShell>
	);
}
