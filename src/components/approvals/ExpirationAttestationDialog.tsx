"use client";

import { FileWarning, Save } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
	type ExpirationReasonCategory,
	REASON_CATEGORY_LABELS,
} from "@/lib/approvals/expirationAttestation.types";
import { toUserFacingErrorMessage } from "@/lib/errors/user-facing";

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
				description: toUserFacingErrorMessage(
					error,
					"Could not save the attestation. Please try again.",
				),
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const title =
		phase === "pre_expiry"
			? "Declare intentional expiration"
			: "Explain this expiration";

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<FileWarning className="h-5 w-5" />}
			title={title}
			description={`${entityName} — recorded for audit`}
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
						onClick={() => void save()}
					>
						<Save className="h-4 w-4" />
						Save attestation
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
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
								{Object.entries(REASON_CATEGORY_LABELS).map(
									([value, label]) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									),
								)}
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
		</AppDialog>
	);
}
