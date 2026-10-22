"use client";

import { RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { RenewalObligationsChecklist } from "@/components/contracts/RenewalObligationsChecklist";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";

interface ContractRenewalDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	contractId: string;
	contractName: string;
	onSuccess?: () => void;
}

export function ContractRenewalDialog({
	open,
	onOpenChange,
	contractId,
	contractName,
	onSuccess,
}: ContractRenewalDialogProps) {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [newExpiryDate, setNewExpiryDate] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);

	const save = async () => {
		if (!newExpiryDate) {
			toast({
				title: "Expiry date required",
				variant: "destructive",
			});
			return;
		}
		setSaving(true);
		try {
			const res = await fetch(
				`/api/contracts/${contractId}/renew?orgId=${encodeURIComponent(orgId || "")}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ newExpiryDate, notes }),
				},
			);
			const json = await res.json();
			if (!res.ok || !json.success) {
				throw new Error(json.message || "Renew failed");
			}
			toast({
				title: "Contract renewed",
				description: "Approval restarted from department review.",
			});
			onOpenChange(false);
			onSuccess?.();
		} catch (error) {
			toast({
				title: "Could not renew",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<RefreshCw className="h-5 w-5" />}
			title="Renew contract"
			description={`${contractName} — starts a new approval`}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
						Renew and restart approval
					</Button>
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
				<RenewalObligationsChecklist open={open} contractId={contractId} />
				<div className="space-y-2">
					<Label>New expiry date</Label>
					<Input
						type="date"
						value={newExpiryDate}
						onChange={(e) => setNewExpiryDate(e.target.value)}
						className="border-[0.25px] border-slate-300 bg-white"
					/>
				</div>
				<div className="space-y-2">
					<Label>Notes</Label>
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
