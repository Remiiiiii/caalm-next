"use client";

import { RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<RefreshCw className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Renew contract
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{contractName} — starts a new approval
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
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
				<div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={saving}
						onClick={() => void save()}
					>
						<Save className="h-4 w-4" />
						Renew and restart approval
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
