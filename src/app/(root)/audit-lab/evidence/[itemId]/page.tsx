import { Archive, FileText, MessageCircle } from "lucide-react";
import Link from "next/link";
import { AuditLabShell } from "@/components/audit-lab/AuditLabShell";
import { ConfirmEvidenceLinkButton } from "@/components/audit-lab/ConfirmEvidenceLinkButton";
import { getLabServerContext } from "@/lib/audit-lab/get-lab-server-context";
import {
	getEvidence,
	getEvidenceItem,
	listEvidenceLinks,
} from "@/lib/audit-lab/repository";
import type { AuditLabEvidenceLink } from "@/lib/audit-lab/types";
import {
	type EvidenceRecordTag,
	getTaggedRecord,
	listTagsForRequirement,
} from "@/lib/audits/readiness/record-tags";

/** One linked item/claim for this requirement, enriched with its file (if any). */
async function EvidenceLinkRow({
	orgId,
	link,
}: {
	orgId: string;
	link: AuditLabEvidenceLink;
}) {
	const item = link.itemId ? await getEvidenceItem(orgId, link.itemId) : null;
	const isDocumentary = link.evidenceType === "documentary";
	const unconfirmed = Boolean(link.aiSuggested) && !link.confirmedByUserId;

	return (
		<li className="flex items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
			{isDocumentary ? (
				<FileText
					className="mt-0.5 h-4 w-4 shrink-0 text-[#22c55e]"
					aria-hidden
				/>
			) : (
				<MessageCircle
					className="mt-0.5 h-4 w-4 shrink-0 text-[#eab308]"
					aria-hidden
				/>
			)}
			<div className="min-w-0 flex-1">
				<p className="font-medium text-slate-800">
					{isDocumentary
						? (item?.fileName ?? "Attached document")
						: "Spoken claim"}
					{link.relation === "contradicts" ? (
						<span className="ml-2 text-xs font-semibold text-[#b80000]">
							Contradicts
						</span>
					) : null}
				</p>
				<p className="text-xs text-slate-500">
					{isDocumentary ? "Documentary" : "Testimonial"} evidence
					{unconfirmed ? " · unconfirmed (AI-suggested)" : null}
				</p>
			</div>
			{unconfirmed ? <ConfirmEvidenceLinkButton linkId={link.$id} /> : null}
		</li>
	);
}

/** A contract/license already tagged org-wide as evidence for this requirement (readiness evidence map) — "collect once, reuse many," independent of any particular Audit Lab session. */
async function TaggedRecordRow({
	orgId,
	tag,
}: {
	orgId: string;
	tag: EvidenceRecordTag;
}) {
	const record = await getTaggedRecord(tag.recordKind, tag.recordId, orgId);
	if (!record) return null;
	return (
		<li className="flex items-start gap-2.5 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
			<Archive className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" aria-hidden />
			<div className="min-w-0 flex-1">
				<p className="font-medium text-slate-800">{record.title}</p>
				<p className="text-xs text-slate-500">
					Already on file · existing {tag.recordKind}
				</p>
			</div>
		</li>
	);
}

export default async function AuditLabEvidenceDetailPage({
	params,
}: {
	params: Promise<{ itemId: string }>;
}) {
	const { itemId } = await params;
	const ctx = await getLabServerContext();
	const item = await getEvidence(ctx.orgId, itemId);
	if (!item) {
		return (
			<AuditLabShell
				title="Evidence"
				description="Item not found"
				capabilities={ctx.capabilities}
			>
				<Link href="/audit-lab/evidence" className="text-[#0f5384] text-sm">
					Back to matrix
				</Link>
			</AuditLabShell>
		);
	}
	// `controlRef` doubles as the Evidence Readiness Matrix requirementId for
	// matrix-generated requests (see ReviewQuestion.controlRef's doc comment);
	// legacy (pre-matrix) requests have no requirementId, so nothing to show.
	const [links, tags] = item.controlRef
		? await Promise.all([
				listEvidenceLinks(ctx.orgId, item.sessionId, item.controlRef),
				listTagsForRequirement(ctx.orgId, item.controlRef),
			])
		: [[], []];
	return (
		<AuditLabShell
			title={item.title}
			description={`${item.controlRef ?? "Control"} · ${item.status}`}
			capabilities={ctx.capabilities}
		>
			<dl className="space-y-2 text-sm">
				<div>
					<dt className="text-slate-500">Department</dt>
					<dd>{item.department ?? "—"}</dd>
				</div>
				<div>
					<dt className="text-slate-500">Due</dt>
					<dd>{item.dueAt ?? "—"}</dd>
				</div>
			</dl>
			<div className="mt-6">
				<h2 className="mb-2 text-sm font-semibold text-slate-700">
					Already on file ({tags.length})
				</h2>
				{tags.length === 0 ? (
					<p className="text-sm text-slate-500">
						No contract or license is tagged to this requirement yet — tag one
						from the Evidence Readiness Matrix page.
					</p>
				) : (
					<ul className="space-y-1.5">
						{tags.map((tag) => (
							<TaggedRecordRow key={tag.$id} orgId={ctx.orgId} tag={tag} />
						))}
					</ul>
				)}
			</div>
			<div className="mt-6">
				<h2 className="mb-2 text-sm font-semibold text-slate-700">
					From this interview ({links.length})
				</h2>
				{links.length === 0 ? (
					<p className="text-sm text-slate-500">
						Nothing linked yet — a spoken claim or an attached document from a
						practice interview will show up here.
					</p>
				) : (
					<ul className="space-y-1.5">
						{links.map((link) => (
							<EvidenceLinkRow key={link.$id} orgId={ctx.orgId} link={link} />
						))}
					</ul>
				)}
			</div>
		</AuditLabShell>
	);
}
