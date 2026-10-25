"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	type ExpirationAttestation,
	REASON_CATEGORY_LABELS,
} from "@/lib/approvals/expirationAttestation.types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

interface ExpirationAttestationReviewDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	attestation: ExpirationAttestation | null;
	onSuccess?: () => void;
}

export function ExpirationAttestationReviewDialog({
	open,
	onOpenChange,
	attestation,
	onSuccess,
}: ExpirationAttestationReviewDialogProps) {
	const { toast } = useToast();
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	if (!attestation) return null;

	const accept = async () => {
		setSaving(true);
		try {
			const res = await fetch(
				`/api/documents/expiration-attestations/${attestation.$id}/review`,
				{
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ notes: notes.trim() || undefined }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw new Error(json.message || json.error || "Review failed");
			}
			toast({ title: "Attestation accepted" });
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: "Could not review",
				description: toUserFacingErrorMessage(
					error,
					"Could not complete the review. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const reason =
		attestation.reasonCategory &&
		REASON_CATEGORY_LABELS[attestation.reasonCategory];

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<ClipboardCheck className="h-5 w-5" />}
			title="Review expiration explanation"
			description={attestation.entityName}
			footer={
				<>
					<Button
						type="button"
						variant="ghost"
						className="rounded-full px-3 py-1.5 h-[1.65rem] justify-center text-slate-400 hover:text-slate-600 hover:bg-black/[.04]"
						disabled={saving}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="btn-primary px-3 sm:px-4"
						disabled={saving}
						onClick={() => void accept()}
					>
						<CheckCircle2 className="h-4 w-4" />
						Accept explanation
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
				<div className="rounded-lg border border-slate-200 bg-white p-4">
					<p className="text-xs font-medium text-slate-500">Reason</p>
					<p className="mt-1 text-sm text-slate-700">{reason || "—"}</p>
					<p className="mt-3 text-xs font-medium text-slate-500">Narrative</p>
					<p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
						{attestation.narrative || "—"}
					</p>
				</div>
				<div className="space-y-2">
					<Label>Reviewer notes (optional)</Label>
					<Textarea
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						className="min-h-20 border-[0.25px] border-slate-300 bg-white"
					/>
				</div>
			</div>
		</AppDialog>
	);
}
