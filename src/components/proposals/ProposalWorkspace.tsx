"use client";

import { Download, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PILL } from "@/components/audits/readiness/readiness-ui";
import { Button } from "@/components/ui/button";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_CELL,
	DATA_TABLE_CELL_FIRST,
	DATA_TABLE_CELL_LAST,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	LibraryKind,
	Proposal,
	ProposalLibraryEntry,
	ProposalRequirement,
	ProposalSection,
	ProposalStatus,
	ResponseType,
} from "@/lib/proposals/types";
import { LIBRARY_KINDS, RESPONSE_TYPES } from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

const STATUS_PILL: Record<ProposalStatus, string> = {
	draft: "bg-slate-100 text-slate-600 border-slate-200",
	in_review: "bg-orange/10 text-orange border-orange/20",
	final: "bg-green/10 text-green border-green/20",
};

const RESPONSE_PILL: Record<ResponseType, string> = {
	compliant: "bg-green/10 text-green border-green/20",
	partial: "bg-orange/10 text-orange border-orange/20",
	exception: "bg-red/10 text-red border-red/20",
	clarification: "bg-blue/10 text-blue border-blue/20",
	no_bid: "bg-slate-100 text-slate-600 border-slate-200",
};

const KIND_LABEL: Record<LibraryKind, string> = {
	past_performance: "Past performance",
	capability: "Capability",
	bio: "Bio",
	boilerplate: "Boilerplate",
};

function orgHeaders(orgId: string | null): HeadersInit {
	return orgId
		? { "Content-Type": "application/json", "x-org-id": orgId }
		: { "Content-Type": "application/json" };
}

function responseLabel(value: ResponseType): string {
	return value.replace("_", " ");
}

export function ProposalWorkspace({ proposalId }: { proposalId: string }) {
	const { orgId } = useOrganization();
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canEdit = permissions.includes(PERMISSIONS.PROPOSALS.EDIT);
	const canGenerate = permissions.includes(PERMISSIONS.PROPOSALS.GENERATE);
	const canExport = permissions.includes(PERMISSIONS.PROPOSALS.EXPORT);
	const canLibrary = permissions.includes(PERMISSIONS.PROPOSALS.LIBRARY_MANAGE);

	const [proposal, setProposal] = useState<Proposal | null>(null);
	const [requirements, setRequirements] = useState<ProposalRequirement[]>([]);
	const [sections, setSections] = useState<ProposalSection[]>([]);
	const [library, setLibrary] = useState<ProposalLibraryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState<string | null>(null);
	const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
	const [sectionDraft, setSectionDraft] = useState("");
	const [libTitle, setLibTitle] = useState("");
	const [libBody, setLibBody] = useState("");
	const [libKind, setLibKind] = useState<LibraryKind>("capability");
	const [libTags, setLibTags] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(`/api/proposals/${proposalId}`, {
				headers: orgHeaders(orgId),
			});
			if (!res.ok) throw new Error("Proposal not found");
			const data = (await res.json()) as {
				proposal: Proposal;
				requirements: ProposalRequirement[];
				sections: ProposalSection[];
				library: ProposalLibraryEntry[];
			};
			setProposal(data.proposal);
			setRequirements(data.requirements || []);
			setSections(data.sections || []);
			setLibrary(data.library || []);
			const first = data.sections?.[0];
			if (first) {
				setActiveSectionId(first.$id);
				setSectionDraft(first.bodyMarkdown);
			}
		} catch (error) {
			console.error("[CLIENT] ProposalWorkspace:", error);
			toast({
				title: "Could not load proposal",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [orgId, proposalId, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const certifiedCount = useMemo(
		() => requirements.filter((row) => row.status === "certified").length,
		[requirements],
	);
	const allCertified =
		requirements.length > 0 && certifiedCount === requirements.length;
	const activeSection = sections.find((row) => row.$id === activeSectionId);

	async function runShred() {
		setBusy("shred");
		try {
			const res = await fetch(`/api/proposals/${proposalId}/shred`, {
				method: "POST",
				headers: orgHeaders(orgId),
				body: JSON.stringify({}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				requirements?: ProposalRequirement[];
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || "Shred failed");
			setRequirements(data.requirements || []);
			toast({
				title: "Matrix ready for review",
				description: `${data.requirements?.length || 0} requirements. Certify each row before drafting.`,
			});
		} catch (error) {
			toast({
				title: "Could not shred solicitation",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setBusy(null);
		}
	}

	async function saveRequirement(
		id: string,
		patch: Partial<Pick<ProposalRequirement, "responseType" | "status">>,
	) {
		if (!canEdit) return;
		const res = await fetch(`/api/proposals/${proposalId}/requirements`, {
			method: "PUT",
			headers: orgHeaders(orgId),
			body: JSON.stringify({ updates: [{ id, ...patch }] }),
		});
		const data = (await res.json().catch(() => ({}))) as {
			requirements?: ProposalRequirement[];
			error?: string;
		};
		if (!res.ok) {
			toast({
				title: "Could not save row",
				description: data.error,
				variant: "destructive",
			});
			return;
		}
		setRequirements(data.requirements || []);
	}

	async function certifyAll() {
		if (!canEdit) return;
		setBusy("certify");
		try {
			const updates = requirements
				.filter((row) => row.status !== "certified")
				.map((row) => ({ id: row.$id, status: "certified" as const }));
			if (updates.length === 0) return;
			const res = await fetch(`/api/proposals/${proposalId}/requirements`, {
				method: "PUT",
				headers: orgHeaders(orgId),
				body: JSON.stringify({ updates }),
			});
			const data = (await res.json().catch(() => ({}))) as {
				requirements?: ProposalRequirement[];
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || "Certify failed");
			setRequirements(data.requirements || []);
		} catch (error) {
			toast({
				title: "Could not certify matrix",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setBusy(null);
		}
	}

	async function runDraft() {
		setBusy("draft");
		try {
			const res = await fetch(`/api/proposals/${proposalId}/draft`, {
				method: "POST",
				headers: orgHeaders(orgId),
				body: JSON.stringify({}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				sections?: ProposalSection[];
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || "Draft failed");
			setSections(data.sections || []);
			const first = data.sections?.[0];
			if (first) {
				setActiveSectionId(first.$id);
				setSectionDraft(first.bodyMarkdown);
			}
			toast({
				title: "Draft ready for review",
				description: "Edit every section before you export. Nothing is final yet.",
			});
		} catch (error) {
			toast({
				title: "Could not generate draft",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setBusy(null);
		}
	}

	async function saveActiveSection() {
		if (!canEdit || !activeSectionId) return;
		setBusy("section");
		try {
			const res = await fetch(`/api/proposals/${proposalId}/sections`, {
				method: "PUT",
				headers: orgHeaders(orgId),
				body: JSON.stringify({
					sectionId: activeSectionId,
					bodyMarkdown: sectionDraft,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				section?: ProposalSection;
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || "Save failed");
			if (data.section) {
				setSections((prev) =>
					prev.map((row) => (row.$id === data.section?.$id ? data.section : row)),
				);
			}
			toast({ title: "Section saved" });
		} catch (error) {
			toast({
				title: "Could not save section",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setBusy(null);
		}
	}

	async function addLibraryItem() {
		if (!canLibrary || !libTitle.trim() || !libBody.trim()) return;
		setBusy("library");
		try {
			const res = await fetch("/api/proposal-library", {
				method: "POST",
				headers: orgHeaders(orgId),
				body: JSON.stringify({
					kind: libKind,
					title: libTitle.trim(),
					bodyMarkdown: libBody.trim(),
					tags: libTags
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean),
				}),
			});
			const data = (await res.json().catch(() => ({}))) as {
				entry?: ProposalLibraryEntry;
				error?: string;
			};
			if (!res.ok) throw new Error(data.error || "Library save failed");
			if (data.entry) setLibrary((prev) => [data.entry as ProposalLibraryEntry, ...prev]);
			setLibTitle("");
			setLibBody("");
			setLibTags("");
		} catch (error) {
			toast({
				title: "Could not add library item",
				description: error instanceof Error ? error.message : undefined,
				variant: "destructive",
			});
		} finally {
			setBusy(null);
		}
	}

	function exportUrl(format: "pdf" | "doc") {
		const params = new URLSearchParams({ format });
		if (orgId) params.set("orgId", orgId);
		return `/api/proposals/${proposalId}/export?${params.toString()}`;
	}

	if (loading) {
		return (
			<p className="text-sm text-slate-500" data-testid="proposal-workspace">
				Loading proposal workspace…
			</p>
		);
	}

	if (!proposal) {
		return (
			<div data-testid="proposal-workspace">
				<p className="text-sm text-slate-500">
					This proposal was not found, or you do not have access.
				</p>
				<Link
					href="/contracts/proposals"
					className="mt-2 inline-block text-sm text-[#0f5384] hover:underline"
				>
					Back to proposals
				</Link>
			</div>
		);
	}

	return (
		<div data-testid="proposal-workspace">
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<h1 className="h1 capitalize sidebar-gradient-text">{proposal.title}</h1>
			</div>
			<p className="mb-4 max-w-4xl text-sm text-slate-600">
				<Link href="/contracts/proposals" className="text-[#0f5384] hover:underline">
					All proposals
				</Link>
				{proposal.solicitationRef ? ` · Notice ${proposal.solicitationRef}` : ""}
			</p>
			<div className="mb-6 flex flex-wrap items-center justify-end gap-2">
				<span className={cn(PILL, STATUS_PILL[proposal.status])}>
					{proposal.status.replace("_", " ")}
				</span>
				{canGenerate ? (
					<Button
						variant="outline"
						size="sm"
						disabled={busy !== null}
						onClick={() => void runShred()}
					>
						{busy === "shred" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
						Shred solicitation
					</Button>
				) : null}
				{canEdit ? (
					<Button
						variant="outline"
						size="sm"
						disabled={busy !== null || requirements.length === 0 || allCertified}
						onClick={() => void certifyAll()}
					>
						Certify all rows
					</Button>
				) : null}
				{canGenerate ? (
					<Button
						className="primary-btn"
						size="sm"
						disabled={busy !== null || !allCertified}
						onClick={() => void runDraft()}
						title={
							allCertified
								? "Generate a first draft from the certified matrix"
								: "Certify every matrix row first"
						}
					>
						{busy === "draft" ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Sparkles className="h-4 w-4" />
						)}
						Generate draft
					</Button>
				) : null}
				{canExport ? (
					<>
						<Button variant="outline" size="sm" asChild>
							<a href={exportUrl("pdf")}>
								<Download className="h-4 w-4" />
								PDF
							</a>
						</Button>
						<Button variant="outline" size="sm" asChild>
							<a href={exportUrl("doc")}>
								<Download className="h-4 w-4" />
								Word
							</a>
						</Button>
					</>
				) : null}
			</div>

			<div className="grid grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] gap-6">
				<div className="space-y-6">
					<div className="glass-card relative overflow-hidden">
						<div className="glass-card-cap" />
						<div className="px-4 py-3">
							<h2 className="text-sm font-semibold text-slate-800">
								Compliance matrix
							</h2>
							<p className="text-xs text-slate-500">
								{certifiedCount} of {requirements.length} certified. AI drafts
								wait until every row is marked by a person.
							</p>
						</div>
						{requirements.length === 0 ? (
							<CaalmDataTableEmpty
								title="No requirements yet"
								description="Shred the solicitation to pull shall/must/will rows into this table."
							/>
						) : (
							<CaalmDataTable>
								<TableHeader className="[&_tr]:border-b-0">
									<TableRow className={DATA_TABLE_HEADER_ROW}>
										<TableHead className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-2")}>
											Requirement
										</TableHead>
										<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
											Source
										</TableHead>
										<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
											Response
										</TableHead>
										<TableHead
											className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4")}
										>
											Certify
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{requirements.map((row) => (
										<TableRow key={row.$id} className={DATA_TABLE_BODY_ROW_BASE}>
											<TableCell
												className={cn(DATA_TABLE_CELL, DATA_TABLE_CELL_FIRST)}
											>
												<p className="max-w-xl text-sm text-slate-700">
													{row.requirementText}
												</p>
											</TableCell>
											<TableCell className={cn(DATA_TABLE_CELL, "px-3")}>
												<span className={cn(PILL, "bg-slate-100 text-slate-600 border-slate-200")}>
													{row.sourceSection}
													{row.sourcePage ? ` p.${row.sourcePage}` : ""}
												</span>
											</TableCell>
											<TableCell className={cn(DATA_TABLE_CELL, "px-3")}>
												<select
													className="glass-form-control h-8 rounded-md px-2 text-xs"
													value={row.responseType}
													disabled={!canEdit || busy !== null}
													onChange={(event) =>
														void saveRequirement(row.$id, {
															responseType: event.target.value as ResponseType,
														})
													}
												>
													{RESPONSE_TYPES.map((value) => (
														<option key={value} value={value}>
															{responseLabel(value)}
														</option>
													))}
												</select>
												<span
													className={cn(
														PILL,
														"ml-2",
														RESPONSE_PILL[row.responseType],
													)}
												>
													{responseLabel(row.responseType)}
												</span>
											</TableCell>
											<TableCell
												className={cn(DATA_TABLE_CELL, DATA_TABLE_CELL_LAST)}
											>
												<div className="flex items-center gap-2">
													<Switch
														checked={row.status === "certified"}
														disabled={!canEdit || busy !== null}
														onCheckedChange={(checked) =>
															void saveRequirement(row.$id, {
																status: checked ? "certified" : "pending",
															})
														}
														aria-label={`Certify ${row.requirementText.slice(0, 40)}`}
													/>
													<span className="text-xs text-slate-500">
														{row.status === "certified" ? "Certified" : "Pending"}
													</span>
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</CaalmDataTable>
						)}
					</div>

					<div className="glass-card relative overflow-hidden">
						<div className="glass-card-cap" />
						<div className="grid grid-cols-[220px_minmax(0,1fr)]">
							<nav className="border-r border-slate-200/80 p-3">
								<p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
									Outline
								</p>
								{sections.length === 0 ? (
									<p className="px-2 text-xs text-slate-500">
										Generate a draft after you certify the matrix.
									</p>
								) : (
									<ul className="space-y-1">
										{sections.map((section) => (
											<li key={section.$id}>
												<button
													type="button"
													className={cn(
														"w-full rounded-md px-2 py-1.5 text-left text-sm",
														section.$id === activeSectionId
															? "bg-white shadow-sm text-[#0f5384]"
															: "text-slate-600 hover:bg-white/60",
													)}
													onClick={() => {
														setActiveSectionId(section.$id);
														setSectionDraft(section.bodyMarkdown);
													}}
												>
													{section.heading}
												</button>
											</li>
										))}
									</ul>
								)}
							</nav>
							<div className="p-4">
								{activeSection ? (
									<>
										<div className="mb-3 flex items-center justify-between gap-2">
											<h2 className="text-sm font-semibold text-slate-800">
												{activeSection.heading}
											</h2>
											{canEdit ? (
												<Button
													size="sm"
													className="primary-btn"
													disabled={busy !== null}
													onClick={() => void saveActiveSection()}
												>
													{busy === "section" ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : null}
													Save section
												</Button>
											) : null}
										</div>
										<Textarea
											value={sectionDraft}
											onChange={(event) => setSectionDraft(event.target.value)}
											disabled={!canEdit}
											className="min-h-[320px] font-mono text-sm"
										/>
									</>
								) : (
									<p className="text-sm text-slate-500">
										No section selected. Certify the matrix, then generate a
										draft you can edit here.
									</p>
								)}
							</div>
						</div>
					</div>
				</div>

				<aside className="glass-card relative overflow-hidden self-start">
					<div className="glass-card-cap" />
					<div className="space-y-4 p-4">
						<div>
							<h2 className="text-sm font-semibold text-slate-800">
								Content library
							</h2>
							<p className="text-xs text-slate-500">
								Approved past performance and boilerplate the draft can cite.
							</p>
						</div>
						<div className="flex flex-wrap gap-1.5">
							{library.map((entry) => (
								<span
									key={entry.$id}
									className={cn(
										PILL,
										"bg-blue/10 text-blue border-blue/20",
									)}
									title={entry.title}
								>
									{KIND_LABEL[entry.kind]} · {entry.title}
								</span>
							))}
							{library.length === 0 ? (
								<span className="text-xs text-slate-500">
									No approved items yet.
								</span>
							) : null}
						</div>
						{canLibrary ? (
							<div className="space-y-2 border-t border-slate-200/80 pt-3">
								<Label htmlFor="lib-title">Add approved content</Label>
								<select
									className="glass-form-control h-9 w-full rounded-md px-2 text-sm"
									value={libKind}
									onChange={(event) =>
										setLibKind(event.target.value as LibraryKind)
									}
								>
									{LIBRARY_KINDS.map((kind) => (
										<option key={kind} value={kind}>
											{KIND_LABEL[kind]}
										</option>
									))}
								</select>
								<Input
									id="lib-title"
									value={libTitle}
									onChange={(event) => setLibTitle(event.target.value)}
									placeholder="Title"
								/>
								<Input
									value={libTags}
									onChange={(event) => setLibTags(event.target.value)}
									placeholder="Tags, comma separated"
								/>
								<Textarea
									value={libBody}
									onChange={(event) => setLibBody(event.target.value)}
									placeholder="Reusable paragraph"
									className="min-h-[100px]"
								/>
								<Button
									size="sm"
									className="primary-btn"
									disabled={
										busy !== null || !libTitle.trim() || !libBody.trim()
									}
									onClick={() => void addLibraryItem()}
								>
									{busy === "library" ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : null}
									Add to library
								</Button>
							</div>
						) : null}
					</div>
				</aside>
			</div>
		</div>
	);
}
