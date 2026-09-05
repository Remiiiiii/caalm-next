"use client";

import { FileWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { ExpirationAttestationDialog } from "@/components/approvals/ExpirationAttestationDialog";
import { ExpirationAttestationReviewDialog } from "@/components/approvals/ExpirationAttestationReviewDialog";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { ExpirationAttestation } from "@/lib/approvals/expirationAttestation.types";

export function AccountabilityAttentionStrip() {
	const { orgId } = useOrganization();
	const [pending, setPending] = useState<ExpirationAttestation[]>([]);
	const [submitted, setSubmitted] = useState<ExpirationAttestation[]>([]);
	const [attestTarget, setAttestTarget] = useState<ExpirationAttestation | null>(
		null,
	);
	const [reviewTarget, setReviewTarget] = useState<ExpirationAttestation | null>(
		null,
	);

	const reload = () => {
		if (!orgId) return;
		void Promise.all([
			fetch(
				`/api/documents/expiration-attestations?orgId=${encodeURIComponent(orgId)}&status=pending`,
			).then((res) => res.json()),
			fetch(
				`/api/documents/expiration-attestations?orgId=${encodeURIComponent(orgId)}&status=submitted`,
			).then((res) => res.json()),
		])
			.then(([pendingJson, submittedJson]) => {
				setPending(
					Array.isArray(pendingJson.attestations)
						? pendingJson.attestations
						: [],
				);
				setSubmitted(
					Array.isArray(submittedJson.attestations)
						? submittedJson.attestations
						: [],
				);
			})
			.catch(() => {
				setPending([]);
				setSubmitted([]);
			});
	};

	useEffect(() => {
		if (!orgId) return;
		let cancelled = false;
		void Promise.all([
			fetch(
				`/api/documents/expiration-attestations?orgId=${encodeURIComponent(orgId)}&status=pending`,
			).then((res) => res.json()),
			fetch(
				`/api/documents/expiration-attestations?orgId=${encodeURIComponent(orgId)}&status=submitted`,
			).then((res) => res.json()),
		])
			.then(([pendingJson, submittedJson]) => {
				if (cancelled) return;
				setPending(
					Array.isArray(pendingJson.attestations)
						? pendingJson.attestations
						: [],
				);
				setSubmitted(
					Array.isArray(submittedJson.attestations)
						? submittedJson.attestations
						: [],
				);
			})
			.catch(() => {
				if (!cancelled) {
					setPending([]);
					setSubmitted([]);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [orgId]);

	if (pending.length === 0 && submitted.length === 0) return null;

	return (
		<>
			<div className="mb-4 flex items-start gap-3 rounded-lg border border-red/20 bg-red/5 px-4 py-3">
				<FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-red" />
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-slate-700">
						Expiration accountability
					</p>
					<p className="mt-0.5 text-xs text-slate-600">
						{pending.length} need an explanation
						{submitted.length > 0
							? ` · ${submitted.length} waiting for review`
							: ""}
						.
					</p>
					<ul className="mt-2 space-y-1">
						{pending.slice(0, 4).map((item) => (
							<li key={item.$id}>
								<button
									type="button"
									className="text-xs text-[#0f5384] underline-offset-2 hover:underline"
									onClick={() => setAttestTarget(item)}
								>
									Explain {item.entityName}
								</button>
							</li>
						))}
						{submitted.slice(0, 3).map((item) => (
							<li key={item.$id}>
								<button
									type="button"
									className="text-xs text-[#0f5384] underline-offset-2 hover:underline"
									onClick={() => setReviewTarget(item)}
								>
									Review {item.entityName}
								</button>
							</li>
						))}
					</ul>
				</div>
			</div>
			<ExpirationAttestationDialog
				open={!!attestTarget}
				onOpenChange={(open) => {
					if (!open) setAttestTarget(null);
				}}
				entityType={attestTarget?.entityType || "contract"}
				entityId={attestTarget?.entityId || ""}
				entityName={attestTarget?.entityName || ""}
				attestationId={attestTarget?.$id}
				phase="post_expiry"
				onSuccess={() => {
					setAttestTarget(null);
					reload();
				}}
			/>
			<ExpirationAttestationReviewDialog
				open={!!reviewTarget}
				onOpenChange={(open) => {
					if (!open) setReviewTarget(null);
				}}
				attestation={reviewTarget}
				onSuccess={() => {
					setReviewTarget(null);
					reload();
				}}
			/>
		</>
	);
}
