"use client";

import { FileWarning, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import {
	REASON_CATEGORY_LABELS,
	type ExpirationReasonCategory,
} from "@/lib/approvals/expirationAttestation.types";

interface ExpirationAttestationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	entityType: "contract" | "license";
	entityId: string;
	entityName: string;
	priorExpiryDate?: string;
	attestationId?: string;
	phase?: "pre_expiry" | "post_expiry";
	onSuccess?: () => void;
}

export function ExpirationAttestationDialog({
	open,
	onOpenChange,
	entityType,
	entityId,
	entityName,
	priorExpiryDate,
	attestationId,
	phase = "pre_expiry",
	onSuccess,
}: ExpirationAttestationDialogProps) {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [reasonCategory, setReasonCategory] =
		useState<ExpirationReasonCategory>("missed_renewal");
	const [narrative, setNarrative] = useState("");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		if (!narrative.trim()) {
			toast({
				title: "Explanation required",
				description: "Say why this document expired.",
				variant: "destructive",
			});
			return;
		}
		setSaving(true);
		try {
			const url = attestationId
				? `/api/documents/expiration-attestations/${attestationId}`
				: `/api/documents/expiration-attestations?orgId=${encodeURIComponent(orgId || "")}`;
			const res = await fetch(url, {
				method: attestationId ? "PATCH" : "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgId,
					entityType,
					entityId,
					entityName,
					priorExpiryDate,
					reasonCategory,
					narrative: narrative.trim(),
					intent: phase === "pre_expiry" ? "intentional" : "unintentional",
				}),
			});
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw new Error(json.message || "Could not save attestation");
			}
			toast({ title: "Expiration recorded" });
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: "Could not save",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<FileWarning className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							{phase === "pre_expiry"
								? "Declare intentional expiration"
								: "Explain this expiration"}
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{entityName} — recorded for audit
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-2">
						<Label>Reason</Label>
						<Select
							value={reasonCategory}
							onValueChange={(value) =>
								setReasonCategory(value as ExpirationReasonCategory)
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300 bg-white">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(REASON_CATEGORY_LABELS).map(([value, label]) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>What happened</Label>
						<Textarea
							value={narrative}
							onChange={(e) => setNarrative(e.target.value)}
							placeholder="Name who owned the term, what alerts were seen, and why renewal did not happen."
							className="min-h-28 border-[0.25px] border-slate-300 bg-white"
						/>
					</div>
				</div>
				<div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void save()}
					>
						<Save className="h-4 w-4" />
						Save attestation
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
