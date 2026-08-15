"use client";

import { Download, Loader2, Printer } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import useSWR from "swr";
import { ReadinessCharts } from "@/components/audits/ReadinessCharts";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { fetcher } from "@/lib/swr-config";

interface PreviewResponse {
	success: boolean;
	data: {
		summary: {
			readinessScore: number | null;
			ragStatus: string;
			severity: { critical: number; moderate: number; low: number };
			domains: Array<{ label: string; readinessPercent: number }>;
			insights: Array<{
				id: string;
				title: string;
				description: string;
				severity: string;
			}>;
			kpis: {
				totalContracts: number;
				licensesAtRisk: number;
				expiringSoon: number;
				evidenceGaps: number;
			};
			trends: { compliance: Array<{ label: string; value: number }> };
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
			pages: Array<{ url: string; status: number | null }>;
			robotsTxtFound: boolean;
			sitemapFound: boolean;
		} | null;
		org: { name: string; timezone: string };
		latestSnapshot: { id: string; aiSummary?: string; cadence: string } | null;
	};
}

export default function AuditReadinessPreviewPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const canExport = permissions.includes(PERMISSIONS.AUDIT.EXPORT);
	const { toast } = useToast();
	const [exporting, setExporting] = useState(false);

	const { data, isLoading } = useSWR<PreviewResponse>(
		permissions.includes(PERMISSIONS.AUDIT.VIEW)
			? "/api/audits/readiness"
			: null,
		fetcher,
	);

	const payload = data?.data;

	const exportPdf = useCallback(async () => {
		setExporting(true);
		try {
			const res = await fetch("/api/audits/readiness/export", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ snapshotId: payload?.latestSnapshot?.id }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Export failed");
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `caalm-readiness-packet.pdf`;
			link.click();
			URL.revokeObjectURL(url);
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
			<div className="py-12 flex justify-center">
				<LoadingSpinner size="sm" label="Loading packet preview…" />
			</div>
		);
	}

	if (!payload) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
				<p className="text-slate-600">Unable to load readiness packet.</p>
			</div>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pb-12">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
				<div>
					<h1 className="h1 capitalize sidebar-gradient-text">
						Readiness packet preview
					</h1>
					<p className="text-sm text-slate-600 mt-1">
						Print-ready enterprise layout. Charts match the downloadable PDF.
					</p>
				</div>
				<div className="flex gap-3">
					<Link href="/audits/readiness">
						<Button variant="outline" className="primary-btn px-3 sm:px-4">
							Back
						</Button>
					</Link>
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={() => window.print()}
					>
						<Printer className="h-4 w-4" />
						Print
					</Button>
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
								<Download className="h-4 w-4" />
							)}
							Download PDF
						</Button>
					)}
				</div>
			</div>

			<article className="mx-auto max-w-4xl bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden print:shadow-none print:border-0">
				<header className="bg-[#0f5384] text-white px-8 py-6">
					<p className="text-xs uppercase tracking-wide text-blue-100">
						CAALM Solutions
					</p>
					<h2 className="text-2xl font-semibold mt-1">
						Audit Readiness Packet
					</h2>
					<p className="text-sm text-blue-100 mt-2">
						{payload.org.name} ·{" "}
						{(payload.latestSnapshot?.cadence || "live").toUpperCase()} ·{" "}
						{new Date().toLocaleString()}
					</p>
				</header>

				<div className="px-8 py-6 space-y-8 bg-slate-50">
					<section className="rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
						{payload.disclaimer}
					</section>

					<section className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{[
							{
								label: "Score",
								value:
									payload.summary.readinessScore === null
										? "N/A"
										: String(payload.summary.readinessScore),
							},
							{
								label: "RAG",
								value: payload.sourcesUsed.length
									? payload.summary.ragStatus
									: "—",
							},
							{
								label: "Sources",
								value: payload.sourcesUsed.join(", ") || "None",
							},
							{
								label: "Critical",
								value: String(payload.summary.severity.critical),
							},
						].map((item) => (
							<div
								key={item.label}
								className="rounded-md border border-slate-200 bg-white p-3"
							>
								<p className="text-xs text-slate-500">{item.label}</p>
								<p className="text-lg font-semibold text-slate-700 mt-1">
									{item.value}
								</p>
							</div>
						))}
					</section>

					<section>
						<h3 className="text-lg font-semibold text-[#0f5384] mb-3">
							1. Executive summary
						</h3>
						<p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
							{payload.latestSnapshot?.aiSummary ||
								"Run a weekly snapshot to generate an AI auto-summary for this packet."}
						</p>
					</section>

					<section>
						<h3 className="text-lg font-semibold text-[#0f5384] mb-3">
							2. Charts
						</h3>
						<ReadinessCharts
							domains={payload.summary.domains}
							severity={payload.summary.severity}
							history={payload.summary.trends.compliance}
						/>
					</section>

					<section>
						<h3 className="text-lg font-semibold text-[#0f5384] mb-3">
							3. Priority insights
						</h3>
						<ul className="space-y-3">
							{payload.summary.insights.map((insight) => (
								<li
									key={insight.id}
									className="rounded-md border border-slate-200 bg-white p-3"
								>
									<p className="text-sm font-medium text-slate-700">
										[{insight.severity}] {insight.title}
									</p>
									<p className="text-xs text-slate-600 mt-1">
										{insight.description}
									</p>
								</li>
							))}
						</ul>
					</section>

					<section>
						<h3 className="text-lg font-semibold text-[#0f5384] mb-3">
							4. Evidence map
						</h3>
						<div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
							<table className="w-full text-xs">
								<thead className="bg-blue-50 text-slate-600">
									<tr>
										<th className="text-left p-2">Requirement</th>
										<th className="text-left p-2">Label</th>
										<th className="text-left p-2">Type</th>
										<th className="text-left p-2">Module</th>
									</tr>
								</thead>
								<tbody>
									{payload.evidenceMapHits.map((row) => (
										<tr key={row.requirementId} className="border-t border-slate-100">
											<td className="p-2">{row.requirementId}</td>
											<td className="p-2">{row.label}</td>
											<td className="p-2">{row.auditType}</td>
											<td className="p-2">{row.caalmModule}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					<section>
						<h3 className="text-lg font-semibold text-[#0f5384] mb-3">
							5. Public site (informational)
						</h3>
						{payload.siteCrawl ? (
							<div className="text-sm text-slate-700 space-y-1">
								<p>{payload.siteCrawl.websiteUrl}</p>
								<p className="text-xs text-slate-600">
									Hint: {payload.siteCrawl.healthHint} · Pages:{" "}
									{payload.siteCrawl.pages.length}
								</p>
								{payload.siteCrawl.issues.slice(0, 6).map((issue) => (
									<p key={issue} className="text-xs text-slate-600">
										• {issue}
									</p>
								))}
							</div>
						) : (
							<p className="text-sm text-slate-600">
								No website configured for crawl.
							</p>
						)}
					</section>

					<footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
						Org timezone: {payload.org.timezone}. Confidential — for authorized
						organization users only.
					</footer>
				</div>
			</article>
		</div>
	);
}
