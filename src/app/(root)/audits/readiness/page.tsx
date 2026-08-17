"use client";

import {
	ClipboardCheck,
	SquareArrowRightExit,
	ExternalLink,
	FileText,
	Loader2,
	Play,
	RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { ReadinessAiPanel } from "@/components/audits/ReadinessAiPanel";
import { ReadinessCharts } from "@/components/audits/ReadinessCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { LoadingSpinner } from "@/components/ui/loading";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/swr-config";
import { cn } from "@/lib/utils";

interface ReadinessResponse {
	success: boolean;
	data: {
		summary: {
			readinessScore: number | null;
			ragStatus: "green" | "amber" | "red";
			kpis: {
				totalContracts: number;
				licensesAtRisk: number;
				expiringSoon: number;
				evidenceGaps: number;
			};
			severity: { critical: number; moderate: number; low: number };
			domains: Array<{
				label: string;
				readinessPercent: number;
				ragStatus: string;
				atRiskCount: number;
			}>;
			insights: Array<{
				id: string;
				title: string;
				description: string;
				severity: string;
				moduleLink: string;
				moduleLabel: string;
			}>;
			trends: {
				compliance: Array<{ label: string; value: number }>;
			};
		};
		sourcesUsed: string[];
		disclaimer: string;
		evidenceMapHits: Array<{
			requirementId: string;
			label: string;
			auditType: string;
			caalmModule: string;
		}>;
		siteCrawl: {
			websiteUrl: string;
			healthHint: string;
			issues: string[];
			pages: Array<{ url: string; status: number | null; title: string | null }>;
			robotsTxtFound: boolean;
			sitemapFound: boolean;
		} | null;
		org: {
			id: string;
			name: string;
			timezone: string;
			websiteUrl: string | null;
		};
		latestSnapshot: {
			id: string;
			cadence: string;
			score: number | null;
			aiSummary?: string;
			createdAt: string;
		} | null;
		history: Array<{
			id: string;
			cadence: string;
			score: number | null;
			ragStatus: string | null;
			createdAt: string;
		}>;
	};
}

export default function AuditReadinessPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const canView = permissions.includes(PERMISSIONS.AUDIT.VIEW);
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);
	const [running, setRunning] = useState(false);
	const [exporting, setExporting] = useState(false);
	const [cadenceFilter, setCadenceFilter] = useState<
		"all" | "weekly" | "monthly" | "quarterly"
	>("all");

	const { data, isLoading, mutate } = useSWR<ReadinessResponse>(
		canView ? "/api/audits/readiness" : null,
		fetcher,
		{ revalidateOnFocus: false },
	);

	const payload = data?.data;
	const summary = payload?.summary;

	const filteredHistory = useMemo(() => {
		const rows = payload?.history ?? [];
		if (cadenceFilter === "all") return rows;
		return rows.filter((row) => row.cadence === cadenceFilter);
	}, [payload?.history, cadenceFilter]);

	const runAudit = useCallback(async () => {
		setRunning(true);
		try {
			const res = await fetch("/api/audits/readiness", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ cadence: "weekly", force: true }),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Run failed");
			toast({
				title: "Readiness snapshot saved",
				description: body.data?.snapshot
					? `Score: ${body.data.snapshot.score ?? "N/A"}`
					: body.data?.skipped || "Done",
			});
			await mutate();
		} catch (error) {
			toast({
				title: "Could not run audit",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setRunning(false);
		}
	}, [mutate, toast]);

	const exportPdf = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch("/api/audits/readiness/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					snapshotId: payload?.latestSnapshot?.id,
					cadence: "weekly",
				}),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Export failed");
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `caalm-readiness-${new Date().toISOString().slice(0, 10)}.pdf`;
			link.click();
			URL.revokeObjectURL(url);
			toast({ title: "PDF downloaded" });
		} catch (error) {
			toast({
				title: "Export failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setExporting(false);
		}
	}, [payload?.latestSnapshot?.id, toast]);

	if (permissionsLoading || isLoading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading readiness…" />
			</div>
		);
	}

	if (!canView) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
				<p className="text-slate-600">
					You need Audit View permission to open readiness.
				</p>
			</div>
		);
	}

	const score = summary?.readinessScore;
	const rag = summary?.ragStatus ?? "red";

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-10">
			<div className="flex items-center gap-4 mb-4 justify-start self-start w-full">
				<h1 className="h1 capitalize sidebar-gradient-text">
					Audit readiness
				</h1>
			</div>

			<div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
				{payload?.disclaimer}
			</div>

			<div className="mb-6 flex flex-wrap items-center justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
					onClick={() => mutate()}
				>
					<RefreshCw className="h-4 w-4" />
					Refresh
				</Button>
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
					onClick={runAudit}
					disabled={running}
				>
					{running ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Play className="h-4 w-4" />
					)}
					Run weekly snapshot
				</Button>
				<Link href="/audits/readiness/preview">
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
					>
						<FileText className="h-4 w-4" />
						Packet preview
					</Button>
				</Link>
				{canExport && (
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={exportPdf}
						disabled={exporting}
					>
						{exporting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<SquareArrowRightExit className="h-4 w-4" />
						)}
						Download PDF
					</Button>
				)}
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Readiness score
						</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>{score === null || score === undefined ? "N/A" : score}</span>
							<span
								className={cn(
									"ml-3 text-xs px-2 py-1 rounded border uppercase",
									rag === "green" && "bg-green/10 text-green border-green/20",
									rag === "amber" && "bg-orange/10 text-orange border-orange/20",
									rag === "red" && "bg-red/10 text-red border-red/20",
								)}
							>
								{payload?.sourcesUsed?.length ? rag : "—"}
							</span>
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Sources: {payload?.sourcesUsed?.join(", ") || "None yet"}
						</p>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Critical items
						</p>
						<div className="flex items-center text-3xl font-bold text-slate-700 pt-2">
							<span>
								{summary?.severity.critical ?? 0}
							</span>
							<StatCardIcon className="ml-2" icon={ClipboardCheck} />
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Moderate {summary?.severity.moderate ?? 0} · Low{" "}
							{summary?.severity.low ?? 0}
						</p>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Contracts
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{summary?.kpis.totalContracts ?? 0}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Expiring soon: {summary?.kpis.expiringSoon ?? 0}
						</p>
					</CardContent>
				</Card>
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6">
						<p className="text-sm font-medium sidebar-gradient-text">
							Licenses at risk
						</p>
						<div className="text-3xl font-bold text-slate-700 pt-2">
							{summary?.kpis.licensesAtRisk ?? 0}
						</div>
						<p className="text-xs text-slate-600 mt-1">
							Evidence gaps: {summary?.kpis.evidenceGaps ?? 0}
						</p>
					</CardContent>
				</Card>
			</div>

			{summary && (
				<ReadinessCharts
					domains={summary.domains}
					severity={summary.severity}
					history={summary.trends.compliance}
				/>
			)}

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Priority insights
						</p>
						{(summary?.insights ?? []).map((insight) => (
							<Link
								key={insight.id}
								href={insight.moduleLink}
								className="block rounded-lg border border-slate-200 bg-white p-3 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer"
							>
								<p className="text-sm font-medium text-slate-700">
									[{insight.severity}] {insight.title}
								</p>
								<p className="text-xs text-slate-600 mt-1">
									{insight.description}
								</p>
								<p className="text-xs text-[#0f5384] mt-2 inline-flex items-center gap-1">
									{insight.moduleLabel} <ExternalLink className="h-3 w-3" />
								</p>
							</Link>
						))}
					</CardContent>
				</Card>

				<ReadinessAiPanel
					snapshotId={payload?.latestSnapshot?.id}
					initialSummary={payload?.latestSnapshot?.aiSummary}
				/>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Evidence map (CFCE segment)
						</p>
						<p className="text-xs text-slate-600">
							Tagged for HRSA OSV, child-welfare monitoring, and financial PBC.
						</p>
						<div className="max-h-72 overflow-y-auto space-y-2">
							{(payload?.evidenceMapHits ?? []).map((row) => (
								<div
									key={row.requirementId}
									className="rounded border border-slate-200 bg-white p-2"
								>
									<p className="text-xs font-medium text-slate-700">
										{row.requirementId} · {row.auditType}
									</p>
									<p className="text-xs text-slate-600">{row.label}</p>
									<p className="text-[11px] text-slate-500 mt-1">
										Module: {row.caalmModule}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="p-4 sm:p-6 space-y-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Public site (informational)
						</p>
						{payload?.siteCrawl ? (
							<>
								<p className="text-sm text-slate-700">
									{payload.siteCrawl.websiteUrl}
								</p>
								<p className="text-xs text-slate-600">
									Hint: {payload.siteCrawl.healthHint} · Pages:{" "}
									{payload.siteCrawl.pages.length} · robots.txt:{" "}
									{payload.siteCrawl.robotsTxtFound ? "yes" : "no"} · sitemap:{" "}
									{payload.siteCrawl.sitemapFound ? "yes" : "no"}
								</p>
								<ul className="text-xs text-slate-600 space-y-1">
									{payload.siteCrawl.issues.slice(0, 6).map((issue) => (
										<li key={issue}>• {issue}</li>
									))}
								</ul>
								<p className="text-xs text-slate-500">
									Not included in readiness score. Set website URL in
									Organization settings.
								</p>
							</>
						) : (
							<p className="text-sm text-slate-600">
								No website URL configured for {payload?.org.name}. Add one under
								Organization settings (timezone + website URL).
							</p>
						)}
						<p className="text-xs text-slate-500">
							Org timezone for scheduled runs: {payload?.org.timezone}
						</p>
					</CardContent>
				</Card>
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<p className="text-sm font-medium sidebar-gradient-text">
							Snapshot history
						</p>
						<div className="flex gap-2">
							{(["all", "weekly", "monthly", "quarterly"] as const).map(
								(value) => (
									<button
										key={value}
										type="button"
										onClick={() => setCadenceFilter(value)}
										className={cn(
											"text-xs px-2 py-1 rounded border cursor-pointer transition-all duration-200",
											cadenceFilter === value
												? "bg-blue-50 border-blue-300 text-[#0f5384]"
												: "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
										)}
									>
										{value}
									</button>
								),
							)}
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-left text-slate-500 border-b border-slate-200">
									<th className="py-2 pr-3">When</th>
									<th className="py-2 pr-3">Cadence</th>
									<th className="py-2 pr-3">Score</th>
									<th className="py-2">RAG</th>
								</tr>
							</thead>
							<tbody>
								{filteredHistory.map((row) => (
									<tr key={row.id} className="border-b border-slate-100">
										<td className="py-2 pr-3 text-slate-700">
											{new Date(row.createdAt).toLocaleString()}
										</td>
										<td className="py-2 pr-3 capitalize text-slate-600">
											{row.cadence}
										</td>
										<td className="py-2 pr-3 text-slate-700">
											{row.score ?? "N/A"}
										</td>
										<td className="py-2 text-slate-600">
											{row.ragStatus ?? "—"}
										</td>
									</tr>
								))}
								{filteredHistory.length === 0 && (
									<tr>
										<td colSpan={4} className="py-4 text-slate-600">
											No snapshots yet.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
