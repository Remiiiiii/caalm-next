"use client";

import {
	AlertTriangle,
	Camera,
	Download,
	FileText,
	Info,
	Loader2,
	Save,
	ShieldAlert,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { AuditsSectionNav } from "@/components/audits/AuditsSectionNav";
import {
	ReadinessAiLauncher,
	ReadinessAiPanel,
} from "@/components/audits/ReadinessAiPanel";
import { ReadinessCharts } from "@/components/audits/ReadinessCharts";
import { ReadinessEvidenceMap } from "@/components/audits/readiness/ReadinessEvidenceMap";
import { ReadinessExplainSheet } from "@/components/audits/readiness/ReadinessExplainSheet";
import { ReadinessFixNextTable } from "@/components/audits/readiness/ReadinessFixNextTable";
import { ReadinessPublicSiteCard } from "@/components/audits/readiness/ReadinessPublicSiteCard";
import { ReadinessScoreCard } from "@/components/audits/readiness/ReadinessScoreCard";
import { ReadinessSkeleton } from "@/components/audits/readiness/ReadinessSkeleton";
import { ReadinessSnapshotHistory } from "@/components/audits/readiness/ReadinessSnapshotHistory";
import { ReadinessStatRows } from "@/components/audits/readiness/ReadinessStatRows";
import {
	FALLBACK_RAG_THRESHOLDS,
	formatDay,
	PILL,
	plural,
	RAG_LABEL,
	RAG_PILL,
	RECT_BADGE,
	ragFor,
} from "@/components/audits/readiness/readiness-ui";
import type {
	ReadinessInsight,
	ReadinessResponse,
} from "@/components/audits/readiness/types";
import { LoadError } from "@/components/LoadError";
import { AnimatedBar } from "@/components/ui/animated-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MetricStatCard } from "@/components/ui/metric-stat-card";
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
import { useTaskPeople } from "@/hooks/useTaskPeople";
import { useUsersByIds } from "@/hooks/useUsersByIds";
import { assignContract } from "@/lib/actions/file.actions";
import { READINESS_DISCLAIMER } from "@/lib/audits/readiness/types";
import { fetcher } from "@/lib/swr-config";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export default function AuditReadinessPage() {
	const timeZone = useOrgTimezone();
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const canView = permissions.includes(PERMISSIONS.AUDIT.VIEW);
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);
	const canManagePublicSite = permissions.includes(PERMISSIONS.SETTINGS.EDIT);
	const [running, setRunning] = useState(false);
	const [crawling, setCrawling] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [exportingId, setExportingId] = useState<string | null>(null);
	const [highlightId, setHighlightId] = useState<string | null>(null);
	const [highlightRequirementId, setHighlightRequirementId] = useState<
		string | null
	>(null);
	const [explainOpen, setExplainOpen] = useState(false);
	const [aiOpen, setAiOpen] = useState(false);

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
					? `Score: ${body.data.snapshot.score == null ? "N/A" : `${body.data.snapshot.score}%`}`
					: body.data?.skipped || "Done",
			});
			const newId: string | undefined = body.data?.snapshot?.$id;
			await mutate();
			if (newId) {
				setHighlightId(newId);
				window.setTimeout(() => setHighlightId(null), 4000);
			}
		} finally {
			setRunning(false);
		}
	}, [mutate, toast]);

	const handleReCrawl = useCallback(async () => {
		setCrawling(true);
		try {
			const res = await fetch("/api/audits/readiness/crawl", {
				method: "POST",
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Re-crawl failed");
			toast({ title: "Public site checked" });
			await mutate();
		} catch (err) {
			toast({
				title: "Couldn't re-crawl. Try again.",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
		} finally {
			setCrawling(false);
		}
	}, [mutate, toast]);

	const canAssignAny = Boolean(
		payload?.canAssignOwners?.contract || payload?.canAssignOwners?.license,
	);
	// Contract / license managers are stored by account id.
	const people = useTaskPeople(canAssignAny, "accountId");
	const users = useUsersByIds(
		useMemo(
			() =>
				(payload?.summary.insights ?? []).flatMap((insight) => [
					...(insight.assignedManagers ?? []),
					...(insight.assignedBy ? [insight.assignedBy] : []),
				]),
			[payload?.summary.insights],
		),
	);

	/**
	 * Owner = the record's assigned manager, the same field /contracts and
	 * /licenses edit, so every screen reading it shows the new owner.
	 */
	const assignOwner = useCallback(
		async (row: ReadinessInsight, accountId: string | null) => {
			if (!accountId) {
				toast({
					title: "Pick a manager",
					description:
						"A record needs an owner. Choose someone to reassign it.",
				});
				return;
			}
			try {
				if (row.itemKind === "license") {
					const res = await fetch(`/api/licenses/${row.id}`, {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ assignedManagers: [accountId] }),
					});
					if (!res.ok) {
						const body = await res.json().catch(() => ({}));
						throw new Error(body?.error || body?.message || "Could not assign");
					}
				} else {
					await assignContract({
						fileId: row.id,
						managerAccountIds: [accountId],
						path: "/contracts",
					});
				}
				toast({
					title: "Owner updated",
					description: `${row.itemTitle ?? row.title} now has a new manager.`,
				});
				await mutate();
				// Refresh every cached list that shows managers.
				await globalMutate(
					(key) =>
						typeof key === "string" &&
						(key.startsWith("/api/contracts") ||
							key.startsWith("/api/licenses") ||
							key.startsWith("/api/dashboard") ||
							key.startsWith("/api/audits")),
				);
			} catch (assignError) {
				toast({
					title: "Could not assign owner",
					description:
						assignError instanceof Error ? assignError.message : "Try again",
					variant: "destructive",
				});
			}
		},
		[mutate, toast],
	);

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
	const nextRunLabel = payload?.nextRun
		? formatInTimezone(
				new Date(payload.nextRun.at),
				"EEE, MMM d, yyyy",
				timeZone,
			)
		: null;
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

	if (
		permissionsLoading ||
		(canView && !payload && (isLoading || isValidating))
	) {
		return (
			<div className="w-full px-4 pb-10 sm:px-6 lg:px-8 xl:px-12">
				<ReadinessSkeleton />
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
		const status = typeof error?.status === "number" ? error.status : undefined;
		// Spec 5.4: offline/401/403 get their own copy and never open an IT incident.
		const variant =
			error?.isNetworkError || status === 0
				? "offline"
				: status === 401 || status === 403
					? "no-access"
					: "error";
		return (
			<div className="w-full px-4 pb-10 sm:px-6 lg:px-8 xl:px-12 text-slate-700">
				<LoadError
					scale="page"
					variant={variant}
					title="We couldn't load Audit Readiness"
					description="Something went wrong on our side. Your data hasn't changed."
					elementKey="page"
					requiredPermission="Audit View"
					error={{
						status,
						requestPath: "/api/audits/readiness",
					}}
					onRetry={() => mutate()}
				/>
			</div>
		);
	}

	const helperText = (
		<div className="flex items-center justify-center gap-2 text-xs text-slate-500">
			<Info className="h-4 w-4 shrink-0" aria-hidden />
			<span>You can export any snapshot as a PDF packet later.</span>
		</div>
	);

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
					</div>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="body-2 max-w-3xl">
						A live health check of your contracts, licenses and evidence, scored
						red / amber / green, so you know where you stand before an inspector
						arrives.
					</p>
					<div className="flex flex-wrap items-center gap-3">
						<ReadinessAiLauncher onClick={() => setAiOpen(true)} />
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
				<span>{payload?.disclaimer ?? READINESS_DISCLAIMER}</span>
			</div>

			{isLoading || !summary || !payload ? (
				<ReadinessSkeleton />
			) : (
				<>
					{/* Section switch, directly above the score card */}
					<AuditsSectionNav className="" />

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
											label: "Expiring within 30 days",
											value: licensesSnapshot?.expiringSoon ?? 0,
											href: "/licenses",
										},
										{
											label: "Expired",
											value: licensesSnapshot?.expired ?? 0,
											href: "/licenses",
										},
									]}
								/>
							}
						/>
					</div>

					<ReadinessFixNextTable
						insights={summary.insights}
						users={users}
						canAssign={payload.canAssignOwners}
						people={people}
						onAssign={(row, assigneeId) => void assignOwner(row, assigneeId)}
					/>
					<ReadinessAiPanel
						snapshotId={
							payload.assistant?.snapshotId ?? payload.latestSnapshot?.id
						}
						initialSummary={
							payload.assistant?.summary ?? payload.latestSnapshot?.aiSummary
						}
						initialSummaryAt={
							payload.assistant?.createdAt ?? payload.latestSnapshot?.createdAt
						}
						initialStructured={payload.assistant?.structured}
						onSnapshotSaved={() => void mutate()}
						open={aiOpen}
						onOpenChange={setAiOpen}
					/>

					<ReadinessCharts
						domains={summary.domains}
						sourcesUsed={payload.sourcesUsed}
						severity={severity}
						history={history}
						score={score}
						thresholds={thresholds}
					/>

					<ReadinessEvidenceMap
						hits={payload.evidenceMapHits}
						scrollToRequirementId={highlightRequirementId}
						onScrolled={() => setHighlightRequirementId(null)}
					/>

					<ReadinessPublicSiteCard
						siteCrawl={payload.siteCrawl}
						org={payload.org}
						running={crawling}
						canManage={canManagePublicSite}
						nextRunLabel={nextRunLabel}
						onReCrawl={() => void handleReCrawl()}
						onHighlightEvidence={() =>
							setHighlightRequirementId("SITE-PUBLIC-PRESENCE")
						}
					/>

					<ReadinessSnapshotHistory
						rows={history}
						running={running}
						onRun={() => setConfirmOpen(true)}
						timeZone={timeZone}
						nextRunLabel={nextRunLabel}
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

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				icon={<Camera className="h-6 w-6 text-[#078fab]" />}
				confirmIcon={<Save className="h-4 w-4" />}
				showCancel={false}
				title="Run weekly snapshot?"
				description="Save a point-in-time snapshot of the current score."
				facts={[
					{
						label: "Captured",
						value: `Now (${formatInTimezone(new Date(), "MMM d, h:mm a", timeZone)})`,
					},
					{
						label: "Score at capture",
						value:
							score !== null ? (
								<span className="inline-flex items-center gap-1.5">
									{score}%
									{rag ? (
										<span className={cn(PILL, RAG_PILL[rag])}>
											{RAG_LABEL[rag]}
										</span>
									) : null}
								</span>
							) : (
								"—"
							),
					},
					{ label: "Saved to", value: "Snapshot history" },
				]}
				helperText={helperText}
				confirmLabel="Save snapshot"
				onConfirm={runAudit}
			/>
		</div>
	);
}
