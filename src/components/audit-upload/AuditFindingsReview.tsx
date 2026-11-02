"use client";

import {
	AlertTriangle,
	Check,
	ChevronLeft,
	Loader2,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Dispatch, type SetStateAction, useState } from "react";
import useSWR, { mutate } from "swr";
import { AuditFindingCard } from "@/components/audit-upload/AuditFindingCard";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	AuditCapRecord,
	AuditDocumentRecord,
	AuditFindingRecord,
} from "@/lib/audit-upload/types";
import { fetcher } from "@/lib/swr-config";
import { caalmToast } from "@/lib/ui/caalm-toast";
import { DIALOG_BACK_LINK_CLASS } from "@/lib/ui/modal-styles";
import { cn } from "@/lib/utils";

type Payload = {
	document: AuditDocumentRecord;
	findings: AuditFindingRecord[];
	caps: AuditCapRecord[];
};

type ReasonDialog = {
	kind: "dispute" | "accept_risk" | "close_cap";
	id: string;
} | null;

async function patchFinding(id: string, action: string, reason?: string) {
	const response = await fetch(`/api/audit/findings/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ action, reason }),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Update failed");
	return json;
}

async function patchCap(
	id: string,
	body: { status?: string; verificationEvidence?: string },
) {
	const response = await fetch(`/api/audit/caps/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Update failed");
	return json;
}

async function createCapForFinding(findingId: string) {
	const response = await fetch("/api/audit/caps", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ findingId }),
	});
	const json = await response.json();
	if (!response.ok) throw new Error(json.error || "Could not create CAP");
	return json;
}

export function AuditFindingsReview({ documentId }: { documentId: string }) {
	const router = useRouter();
	const { permissions } = usePermissions();
	const canManageFindings = permissions.includes(
		PERMISSIONS.AUDIT.MANAGE_FINDINGS,
	);
	const canManageCaps = permissions.includes(PERMISSIONS.AUDIT.MANAGE_CAPS);
	const canDelete = permissions.includes(PERMISSIONS.AUDIT.DELETE);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [reasonDialog, setReasonDialog] = useState<ReasonDialog>(null);
	const [reason, setReason] = useState("");
	const [activeTab, setActiveTab] = useState<"findings" | "report">("findings");
	const [openFindingIds, setOpenFindingIds] = useState<Set<string>>(new Set());
	/** Passage is shown by default when the drawer is open; ids here hide it. */
	const [hiddenPassageIds, setHiddenPassageIds] = useState<Set<string>>(
		new Set(),
	);

	const toggleInSet = (
		setter: Dispatch<SetStateAction<Set<string>>>,
		id: string,
	) => {
		setter((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const { data, isLoading } = useSWR<{ data?: Payload }>(
		`/api/audit/documents/${documentId}`,
		fetcher,
		{ refreshInterval: 4000 },
	);
	const payload = data?.data;
	const document = payload?.document;
	const findings = payload?.findings ?? [];
	const caps = payload?.caps ?? [];
	const classification = (document?.metadata?.classification ?? {}) as Record<
		string,
		unknown
	>;
	const frameworks = Array.isArray(classification.frameworks)
		? (classification.frameworks as string[])
		: [];
	const sefa = document?.metadata?.sefa as
		| {
				programs?: Array<{
					name: string;
					assistanceListing: string;
					amountUsd: number;
				}>;
				totalUsd?: number | null;
		  }
		| null
		| undefined;

	const run = async (id: string, work: () => Promise<unknown>) => {
		setBusyId(id);
		try {
			await work();
			await mutate(`/api/audit/documents/${documentId}`);
		} catch (error) {
			caalmToast.base({
				tone: "error",
				title: "Could not save",
				message: error instanceof Error ? error.message : "Try again.",
			});
		} finally {
			setBusyId(null);
		}
	};

	if (isLoading) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<h1 className="h1 mb-1 sidebar-gradient-text">Uploaded audit</h1>
				<div className="flex items-center gap-2 text-sm text-slate-500">
					<Loader2 className="h-4 w-4 animate-spin text-[#078fab]" />
					Reading this report…
				</div>
			</div>
		);
	}
	if (!document) {
		return (
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
				<h1 className="h1 mb-1 sidebar-gradient-text">Uploaded audit</h1>
				<p className="mb-3 text-sm text-slate-600">This audit was not found.</p>
				<button
					type="button"
					onClick={() => router.push("/audits/uploads")}
					className={DIALOG_BACK_LINK_CLASS}
				>
					<ChevronLeft className="h-[15px] w-[15px]" aria-hidden />
					Back to uploads
				</button>
			</div>
		);
	}

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<nav aria-label="Breadcrumb" className="pt-1 text-xs text-slate-500">
				<Link href="/audits" className="hover:text-slate-700">
					Audits
				</Link>{" "}
				›{" "}
				<Link href="/audits/uploads" className="hover:text-slate-700">
					Uploaded audits
				</Link>{" "}
				› <span className="text-slate-600">{document.fileName}</span>
			</nav>
			<div className="flex flex-col gap-3 pb-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 flex-1">
					<h1 className="h1 truncate sidebar-gradient-text">
						{document.fileName}
					</h1>
					<p className="mt-0.5 max-w-3xl text-sm text-slate-600">
						{document.summary ||
							"Draft findings stay unofficial until someone confirms them."}
					</p>
				</div>
				{canDelete ? (
					<Button
						type="button"
						className="delete-btn shrink-0 px-3 sm:px-4"
						onClick={() => setDeleteOpen(true)}
					>
						<Trash2 className="h-4 w-4" />
						Delete
					</Button>
				) : null}
			</div>
			<div role="tablist" className="flex gap-6 border-b border-slate-200/80">
				{(
					[
						{ id: "findings", label: "Findings" },
						{ id: "report", label: "Report" },
					] as const
				).map((tab) => (
					<button
						key={tab.id}
						type="button"
						role="tab"
						aria-selected={activeTab === tab.id}
						id={`audit-tab-${tab.id}`}
						aria-controls={`audit-tabpanel-${tab.id}`}
						onClick={() => setActiveTab(tab.id)}
						className={cn(
							"cursor-pointer border-b-2 px-0.5 pb-2.5 text-sm font-semibold transition-colors duration-200",
							activeTab === tab.id
								? "border-[#0f5384] text-[#0f5384]"
								: "border-transparent text-slate-500 hover:text-slate-700",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			<div
				role="region"
				aria-label="Audit summary"
				className="-mx-4 flex flex-col gap-2 border-b border-slate-200/70 bg-white/60 px-4 py-3 text-sm sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-12 xl:px-12"
			>
				<div className="flex flex-wrap items-center gap-2">
					<span
						className={cn(
							"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
							document.status === "complete"
								? "border-green/20 bg-green/10 text-green"
								: document.status === "failed"
									? "border-red/20 bg-red/10 text-red"
									: "border-slate-200 bg-slate-100 text-slate-600",
						)}
					>
						{document.status.replaceAll("_", " ")}
					</span>
					<span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
						{findings.length} finding{findings.length === 1 ? "" : "s"}
					</span>
					{classification.auditType ? (
						<span className="inline-flex items-center rounded-full border border-[#a0c4db] bg-[#e1f3ff] px-2.5 py-0.5 text-xs font-semibold text-[#0f5384]">
							{String(classification.auditType).replaceAll("_", " ")}
						</span>
					) : null}
					{frameworks.map((framework) => (
						<span
							key={framework}
							className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
						>
							{framework}
						</span>
					))}
				</div>
				{(classification.auditorName ||
					classification.period ||
					classification.reportNumber) && (
					<p className="text-xs text-slate-500">
						{[
							classification.auditorName,
							classification.period,
							classification.reportNumber,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
				)}
			</div>

			<div className="w-full py-6 sm:py-7">
				{sefa?.programs?.length ? (
					<table className="mb-6 w-full overflow-hidden rounded-lg border border-slate-200 text-sm">
						<caption className="sr-only">Schedule of federal awards</caption>
						<thead>
							<tr className="border-b border-slate-200 bg-slate-50">
								<th
									colSpan={2}
									className="px-3 py-2 text-left text-xs font-semibold text-slate-600"
								>
									Schedule of federal awards
									{sefa.totalUsd ? ` · $${sefa.totalUsd.toLocaleString()}` : ""}
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-xs text-slate-600">
							{sefa.programs.map((program) => (
								<tr key={`${program.assistanceListing}-${program.name}`}>
									<td className="px-3 py-1.5 text-left">
										{program.name} ({program.assistanceListing})
									</td>
									<td className="px-3 py-1.5 text-right tabular-nums">
										${program.amountUsd.toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : null}

				{activeTab === "report" ? (
					<div
						id="audit-tabpanel-report"
						role="tabpanel"
						aria-labelledby="audit-tab-report"
						className="rounded-lg border border-slate-200 bg-white/60 px-4 py-6 text-sm text-slate-500"
					>
						The extracted report view isn't available yet.
					</div>
				) : (
					<div
						id="audit-tabpanel-findings"
						role="tabpanel"
						aria-labelledby="audit-tab-findings"
					>
						<section className="mb-8" aria-label="Findings">
							<Card className="glass-card overflow-hidden">
								<div className="glass-card-cap" />
								<CardContent className="p-4 sm:p-6">
									<h2 className="h5 sidebar-gradient-text mb-3">Findings</h2>
									{findings.length === 0 ? (
										<p className="text-sm text-slate-500">
											{document.status === "complete"
												? "No findings were extracted."
												: "Still reading the file…"}
										</p>
									) : (
										<div role="list" className="space-y-3">
											{findings.map((finding) => {
												const detailsOpen = openFindingIds.has(finding.$id);
												const passageOpen = !hiddenPassageIds.has(
													finding.$id,
												);
												const repeatOfCode = finding.repeatOfFindingId
													? (findings.find(
															(f) => f.$id === finding.repeatOfFindingId,
														)?.findingCode ?? null)
													: null;
												const findingCap =
													caps.find((row) => row.findingId === finding.$id) ??
													null;
												return (
													<div key={finding.$id} role="listitem">
														<AuditFindingCard
															finding={finding}
															cap={findingCap}
															repeatOfCode={repeatOfCode}
															detailsOpen={detailsOpen}
															passageOpen={passageOpen}
															busy={
																busyId === finding.$id ||
																(findingCap
																	? busyId === findingCap.$id
																	: false)
															}
															canManageFindings={canManageFindings}
															canManageCaps={canManageCaps}
															onToggleDetails={() =>
																toggleInSet(setOpenFindingIds, finding.$id)
															}
															onTogglePassage={() =>
																toggleInSet(
																	setHiddenPassageIds,
																	finding.$id,
																)
															}
															onConfirm={() =>
																void run(finding.$id, () =>
																	patchFinding(finding.$id, "confirm"),
																)
															}
															onDispute={() => {
																setReason("");
																setReasonDialog({
																	kind: "dispute",
																	id: finding.$id,
																});
															}}
															onRectify={() =>
																void run(finding.$id, () =>
																	patchFinding(finding.$id, "rectify"),
																)
															}
															onAcceptRisk={() => {
																setReason("");
																setReasonDialog({
																	kind: "accept_risk",
																	id: finding.$id,
																});
															}}
															onStartCap={
																findingCap
																	? () =>
																			void run(findingCap.$id, () =>
																				patchCap(findingCap.$id, {
																					status: "in_progress",
																				}),
																			)
																	: undefined
															}
															onCloseCap={
																findingCap
																	? () => {
																			setReason("");
																			setReasonDialog({
																				kind: "close_cap",
																				id: findingCap.$id,
																			});
																		}
																	: undefined
															}
															onCreateCap={() =>
																void run(finding.$id, () =>
																	createCapForFinding(finding.$id),
																)
															}
														/>
													</div>
												);
											})}
										</div>
									)}
								</CardContent>
							</Card>
						</section>
					</div>
				)}
			</div>

			<ConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				variant="destructive"
				icon={<Trash2 className="h-5 w-5" />}
				title="Delete this audit?"
				description="The report leaves Active Uploaded Audits. Someone with delete permission can restore it from the Removed list. Findings and corrective actions get closed and stay closed after restore."
				confirmLabel="Delete"
				onConfirm={async () => {
					const response = await fetch(`/api/audit/documents/${documentId}`, {
						method: "DELETE",
					});
					if (!response.ok) throw new Error("Delete failed");
					router.push("/audits/uploads");
				}}
			/>

			<AppDialog
				open={Boolean(reasonDialog)}
				onOpenChange={(next) => {
					if (!next) setReasonDialog(null);
				}}
				size="form"
				icon={
					reasonDialog?.kind === "close_cap" ? (
						<Check className="h-5 w-5" />
					) : (
						<AlertTriangle className="h-5 w-5" />
					)
				}
				title={
					reasonDialog?.kind === "dispute"
						? "Dispute this finding"
						: reasonDialog?.kind === "accept_risk"
							? "Accept this risk"
							: "Close corrective action"
				}
				description={
					reasonDialog?.kind === "close_cap"
						? "Add verification notes. High and critical items need this before close."
						: "Write a short reason so the audit trail stays clear."
				}
				footer={
					<>
						<Button
							type="button"
							variant="outline"
							onClick={() => setReasonDialog(null)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary px-3 sm:px-4"
							disabled={
								busyId === reasonDialog?.id ||
								(reasonDialog?.kind !== "close_cap" && !reason.trim())
							}
							onClick={() => {
								if (!reasonDialog) return;
								if (reasonDialog.kind === "close_cap") {
									void run(reasonDialog.id, () =>
										patchCap(reasonDialog.id, {
											status: "closed",
											verificationEvidence: reason,
										}),
									).then(() => setReasonDialog(null));
									return;
								}
								void run(reasonDialog.id, () =>
									patchFinding(
										reasonDialog.id,
										reasonDialog.kind,
										reason.trim(),
									),
								).then(() => setReasonDialog(null));
							}}
						>
							<Check className="h-4 w-4" />
							Save
						</Button>
					</>
				}
			>
				<div className="py-4">
					<Textarea
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder={
							reasonDialog?.kind === "close_cap"
								? "What evidence shows this is fixed?"
								: "Reason"
						}
					/>
				</div>
			</AppDialog>
		</div>
	);
}
