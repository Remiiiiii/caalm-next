"use client";

import { FilePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ContractTemplate } from "@/types/contract-templates";

type ApplyTemplateDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template: ContractTemplate | null;
	applying: boolean;
	onApply: (contractName: string) => Promise<void>;
};

export function ApplyTemplateDialog({
	open,
	onOpenChange,
	template,
	applying,
	onApply,
}: ApplyTemplateDialogProps) {
	const [contractName, setContractName] = useState("");

	useEffect(() => {
		if (!open) return;
		setContractName(template?.title || "");
	}, [open, template]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:w-full">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<FilePlus className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Use template
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Creates a draft contract in Proposals & Approvals from this
						template&apos;s published clauses.
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-2">
						<Label htmlFor="apply-contract-name">Contract name</Label>
						<Input
							id="apply-contract-name"
							className="border-[0.25px] border-slate-300"
							value={contractName}
							onChange={(event) => setContractName(event.target.value)}
						/>
					</div>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						variant="outline"
						className="primary-btn px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4"
						disabled={applying || !contractName.trim()}
						onClick={() => void onApply(contractName.trim())}
					>
						{applying ? "Creating..." : "Create draft"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
