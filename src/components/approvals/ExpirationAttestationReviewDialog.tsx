"use client";

import { CheckCircle2, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
	REASON_CATEGORY_LABELS,
	type ExpirationAttestation,
} from "@/lib/approvals/expirationAttestation.types";

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
				description: error instanceof Error ? error.message : "Try again",
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<ClipboardCheck className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Review expiration explanation
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{attestation.entityName}
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
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
				<div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void accept()}
					>
						<CheckCircle2 className="h-4 w-4" />
						Accept explanation
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
