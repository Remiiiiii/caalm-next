"use client";

import {
	AlertCircle,
	AlertTriangle,
	Download,
	FileText,
	Info,
	Loader2,
	Play,
	RefreshCw,
	ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { ReadinessAiPanel } from "@/components/audits/ReadinessAiPanel";
import { ReadinessCharts } from "@/components/audits/ReadinessCharts";
import { ReadinessEvidenceMap } from "@/components/audits/readiness/ReadinessEvidenceMap";
import { ReadinessExplainSheet } from "@/components/audits/readiness/ReadinessExplainSheet";
import { ReadinessFixNextTable } from "@/components/audits/readiness/ReadinessFixNextTable";
import { ReadinessPublicSiteCard } from "@/components/audits/readiness/ReadinessPublicSiteCard";
import { ReadinessScoreCard } from "@/components/audits/readiness/ReadinessScoreCard";
import { ReadinessSnapshotHistory } from "@/components/audits/readiness/ReadinessSnapshotHistory";
import { ReadinessStatRows } from "@/components/audits/readiness/ReadinessStatRows";
import {
	FALLBACK_RAG_THRESHOLDS,
	formatDay,
	plural,
	RECT_BADGE,
	ragFor,
} from "@/components/audits/readiness/readiness-ui";
import type { ReadinessResponse } from "@/components/audits/readiness/types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnimatedBar } from "@/components/ui/animated-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { usePermissions } from "@/hooks/usePermissions";
import { fetcher } from "@/lib/swr-config";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function LoadingState() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Loading readiness"
			className="space-y-6"
		>
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
				{[0, 1, 2, 3].map((key) => (
					<Skeleton key={key} className="h-72 rounded-lg" />
				))}
			</div>
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
				<Skeleton className="h-80 rounded-lg xl:col-span-2" />
				<Skeleton className="h-80 rounded-lg" />
			</div>
			<Skeleton className="h-64 rounded-lg" />
		</div>
	);
}

export default function AuditReadinessPage() {
	const timeZone = useOrgTimezone();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const canView = permissions.includes(PERMISSIONS.AUDIT.VIEW);
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);
	const [running, setRunning] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [exportingId, setExportingId] = useState<string | null>(null);
	const [highlightId, setHighlightId] = useState<string | null>(null);
	const [explainOpen, setExplainOpen] = useState(false);

	const { data, error, isLoading, isValidating, mutate } =
		useSWR<ReadinessResponse>(
			canView ? "/api/audits/readiness" : null,
			fetcher,
			{ revalidateOnFocus: false },
		);

	const payload = data?.data;
	const summary = payload?.summary;
	const thresholds = payload?.ragThresholds ?? FALLBACK_RAG_THRESHOLDS;
	const history = payload?.history ?? [];

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
			const newId: string | undefined = body.data?.snapshot?.$id;
			await mutate();
			if (newId) {
				setHighlightId(newId);
				window.setTimeout(() => setHighlightId(null), 4000);
			}
		} catch (runError) {
			toast({
				title: "Could not run audit",
				description: runError instanceof Error ? runError.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setRunning(false);
			setConfirmOpen(false);
		}
	}, [mutate, toast]);

	const exportPdf = useCallback(
		async (snapshotId?: string) => {
			const id = snapshotId ?? payload?.latestSnapshot?.id ?? "latest";
			setExportingId(id);
			try {
				const res = await fetch("/api/audits/readiness/export", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						snapshotId: snapshotId ?? payload?.latestSnapshot?.id,
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
			} catch (exportError) {
				toast({
					title: "Export failed",
					description:
						exportError instanceof Error ? exportError.message : "Try again",
					variant: "destructive",
				});
			} finally {
				setExportingId(null);
			}
		},
		[payload?.latestSnapshot?.id, toast],
	);

	const score = summary?.readinessScore ?? null;
	const rag =
		score === null ? null : (summary?.ragStatus ?? ragFor(score, thresholds));
	const severity = summary?.severity ?? { critical: 0, moderate: 0, low: 0 };
	const severityTotal = severity.critical + severity.moderate + severity.low;
	const contractsSnapshot = summary?.complianceSnapshot?.contracts ?? null;
	const licensesSnapshot = summary?.complianceSnapshot?.licenses ?? null;
	const gaps = summary?.kpis.evidenceGaps ?? 0;

	const nextActionDue = useMemo(() => {
		const dates = (summary?.insights ?? [])
			.map((insight) => insight.dueDate)
			.filter((value): value is string => Boolean(value))
			.map((value) => Date.parse(value))
			.filter((value) => !Number.isNaN(value));
		return dates.length
			? formatDay(new Date(Math.min(...dates)).toISOString())
			: "—";
	}, [summary?.insights]);

	const lastUpdated = summary?.lastUpdated ?? null;
	const stale =
		lastUpdated !== null &&
		Date.now() - Date.parse(lastUpdated) > STALE_AFTER_MS;
	const deltaVsLast =
		history.length >= 2 &&
		score !== null &&
		payload?.latestSnapshot?.score !== null &&
		payload?.latestSnapshot?.score !== undefined
			? score - payload.latestSnapshot.score
			: null;

	if (permissionsLoading) {
		return (
			<div className="w-full px-4 pb-10 sm:px-6 lg:px-8 xl:px-12">
				<LoadingState />
			</div>
		);
	}

	if (!canView) {
		return (
			<div className="w-full px-4 py-8 sm:px-6 lg:px-8 xl:px-12">
				<p className="text-slate-600">
					You need Audit View permission to open readiness.
				</p>
			</div>
		);
	}

	if (error && !payload) {
		return (
			<div className="w-full px-4 pb-10 sm:px-6 lg:px-8 xl:px-12">
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="flex flex-col items-center gap-3 p-6 text-center text-slate-700">
						<AlertCircle className="h-8 w-8 text-red" aria-hidden />
						<p>Unable to load audit readiness.</p>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							onClick={() => mutate()}
						>
							<RefreshCw className="h-4 w-4" />
							Retry
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="w-full space-y-6 px-4 pb-10 text-slate-700 sm:px-6 lg:px-8 xl:px-12">
			{/* Header */}
			<div className="space-y-2">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<h1 className="h1 capitalize sidebar-gradient-text">
						Audit readiness
					</h1>
					<div className="flex items-center gap-3">
						{lastUpdated ? (
							<span
								className={cn(
									"caption",
									stale ? "text-orange" : "text-slate-500",
								)}
							>
								Live data · refreshed{" "}
								{formatInTimezone(
									new Date(lastUpdated),
									"MMM d, yyyy · h:mm a",
									timeZone,
								)}
								{stale ? " · Data may be out of date." : ""}
							</span>
						) : null}
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="cursor-pointer"
							aria-label="Refresh live data"
							onClick={() => mutate()}
							disabled={isValidating}
						>
							<RefreshCw
								className={cn("h-4 w-4", isValidating && "animate-spin")}
							/>
							Refresh
						</Button>
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="body-2 max-w-3xl">
						A live health check of your contracts, licenses and evidence, scored
						red / amber / green, so you know where you stand before an inspector
						arrives.
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="button"
							variant="outline"
							className="cursor-pointer"
							onClick={() => setConfirmOpen(true)}
							disabled={running}
						>
							{running ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Play className="h-4 w-4" />
							)}
							Run weekly snapshot
						</Button>
						<Button asChild variant="outline" className="cursor-pointer">
							<Link href="/audits/readiness/preview">
								<FileText className="h-4 w-4" />
								Packet preview
							</Link>
						</Button>
						<TooltipProvider delayDuration={150}>
							<Tooltip>
								<TooltipTrigger asChild>
									<span tabIndex={canExport ? -1 : 0}>
										<Button
											type="button"
											className="btn-primary px-3 sm:px-4"
											onClick={() => void exportPdf()}
											disabled={!canExport || exportingId !== null}
										>
											{exportingId ? (
												<Loader2 className="h-4 w-4 animate-spin" />
											) : (
												<Download className="h-4 w-4" />
											)}
											Download PDF
										</Button>
									</span>
								</TooltipTrigger>
								{canExport ? null : (
									<TooltipContent>
										Requires Audit Export permission
									</TooltipContent>
								)}
							</Tooltip>
						</TooltipProvider>
					</div>
				</div>
			</div>

			{/* Slim disclaimer: a compliance statement, always visible */}
			<div
				role="note"
				className="flex items-center gap-2.5 rounded-lg border border-orange/20 bg-orange/10 px-4 py-2 text-xs text-slate-600"
			>
				<Info className="h-4 w-4 shrink-0 text-orange" aria-hidden />
				<span>{payload?.disclaimer}</span>
			</div>

			{isLoading || !summary || !payload ? (
				<LoadingState />
			) : (
				<>
					{/* Hero row */}
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr]">
						<ReadinessScoreCard
							score={score}
							rag={rag}
							thresholds={thresholds}
							domains={summary.domains}
							sourcesUsed={payload.sourcesUsed}
							deltaVsLast={deltaVsLast}
							onExplain={() => setExplainOpen(true)}
						/>

						<MetricStatCard
							title="Critical items"
							icon={AlertTriangle}
							iconTone={severity.critical > 0 ? "danger" : "default"}
							value={severity.critical}
							valueTone={severity.critical > 0 ? "danger" : "default"}
							description={
								severity.critical === 0
									? `Nothing critical${severity.moderate ? ` · ${plural(severity.moderate, "moderate item")} to schedule` : ""}`
									: `${plural(severity.critical, "critical item")} need attention`
							}
							pinFooter
							footer={
								<ReadinessStatRows
									top={
										<AnimatedBar
											label={`Severity: ${severity.critical} critical, ${severity.moderate} moderate, ${severity.low} low`}
											segments={[
												{
													pct: severityTotal
														? (severity.critical / severityTotal) * 100
														: 0,
													className: "bg-red",
												},
												{
													pct: severityTotal
														? (severity.moderate / severityTotal) * 100
														: 0,
													className: "bg-orange",
												},
												{
													pct: severityTotal
														? (severity.low / severityTotal) * 100
														: 0,
													className: "bg-slate-300",
												},
											]}
										/>
									}
									rows={[
										{
											label: "Critical",
											value: severity.critical,
											dot: "bg-red",
											href: "/audits/status",
										},
										{
											label: "Moderate",
											value: severity.moderate,
											dot: "bg-orange",
											href: "/audits/status",
										},
										{
											label: "Low",
											value: severity.low,
											dot: "bg-slate-300",
											href: "/audits/status",
										},
									]}
								/>
							}
						/>

						<MetricStatCard
							title="Contracts"
							icon={FileText}
							value={
								<>
									{summary.kpis.totalContracts}{" "}
									<span className="text-sm font-medium text-slate-600">
										monitored
									</span>
								</>
							}
							description={
								(contractsSnapshot?.expiringSoon ?? 0) > 0
									? `${plural(contractsSnapshot?.expiringSoon ?? 0, "contract")} expiring soon · needs a renewal plan`
									: "None expiring soon"
							}
							pinFooter
							footer={
								<ReadinessStatRows
									rows={[
										{
											label: "Expiring soon",
											href: "/contracts",
											value: (
												<span
													className={cn(
														RECT_BADGE,
														(contractsSnapshot?.expiringSoon ?? 0) > 0
															? "bg-orange/10 text-orange border-orange/20"
															: "bg-slate-100 text-slate-600 border-slate-200",
													)}
												>
													{contractsSnapshot?.expiringSoon ?? 0}
												</span>
											),
										},
										{
											label: "Moderate-severity items",
											value: severity.moderate,
											href: "/audits/status",
										},
										{ label: "Next action due", value: nextActionDue },
									]}
								/>
							}
						/>

						<MetricStatCard
							title="Licenses at risk"
							icon={ShieldAlert}
							iconTone={
								(summary.kpis.licensesAtRisk ?? 0) > 0 ? "warning" : "default"
							}
							value={
								<>
									{summary.kpis.licensesAtRisk}{" "}
									<span className="text-sm font-medium text-slate-600">
										at risk
									</span>
								</>
							}
							valueTone={
								summary.kpis.licensesAtRisk > 0 ? "warning" : "default"
							}
							description={`${summary.kpis.licensesAtRisk === 0 ? "No licenses at risk" : `${plural(summary.kpis.licensesAtRisk, "license")} at risk`}${gaps > 0 ? ` · ${plural(gaps, "evidence gap")} to close` : ""}`}
							pinFooter
							footer={
								<ReadinessStatRows
									rows={[
										{
											label: "Evidence gaps",
											href: "/licenses",
											value: (
												<span
													className={cn(
														RECT_BADGE,
														gaps > 0
															? "bg-orange/10 text-orange border-orange/20"
															: "bg-slate-100 text-slate-600 border-slate-200",
													)}
												>
													{gaps}
												</span>
											),
										},
										{
											label: "Expiring within 90 days",
											value: licensesSnapshot?.expiringSoon ?? 0,
											href: "/licenses",
										},
										{
											label: "Non-compliant",
											value:
												licensesSnapshot?.complianceBuckets?.[
													"non-compliant"
												] ?? 0,
											href: "/licenses",
										},
									]}
								/>
							}
						/>
					</div>

					{/* Fix next + AI assistant */}
					<div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
						<div className="xl:col-span-2">
							<ReadinessFixNextTable insights={summary.insights} />
						</div>
						<ReadinessAiPanel
							snapshotId={payload.latestSnapshot?.id}
							initialSummary={payload.latestSnapshot?.aiSummary}
							initialSummaryAt={payload.latestSnapshot?.createdAt}
						/>
					</div>

					<ReadinessCharts
						domains={summary.domains}
						sourcesUsed={payload.sourcesUsed}
						severity={severity}
						history={history}
						score={score}
						thresholds={thresholds}
					/>

					{/* Evidence map + public site */}
					<div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
						<div className="xl:col-span-2">
							<ReadinessEvidenceMap hits={payload.evidenceMapHits} />
						</div>
						<ReadinessPublicSiteCard
							siteCrawl={payload.siteCrawl}
							org={payload.org}
						/>
					</div>

					<ReadinessSnapshotHistory
						rows={history}
						latestId={payload.latestSnapshot?.id}
						timeZone={timeZone}
						canExport={canExport}
						downloadingId={exportingId}
						highlightId={highlightId}
						onDownload={(id) => void exportPdf(id)}
					/>

					<ReadinessExplainSheet
						open={explainOpen}
						onOpenChange={setExplainOpen}
						score={score}
						thresholds={thresholds}
						domains={summary.domains}
						sourcesUsed={payload.sourcesUsed}
					/>
				</>
			)}

			<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="sidebar-gradient-text">
							Run weekly snapshot?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Save a point-in-time snapshot of the current score? It is added to
							snapshot history and can be exported as a PDF packet.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={running}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="primary-btn px-3 sm:px-4"
							disabled={running}
							onClick={(event) => {
								event.preventDefault();
								void runAudit();
							}}
						>
							{running ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Save snapshot
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
