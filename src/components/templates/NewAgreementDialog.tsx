"use client";

import { FilePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CONTRACT_TYPE_CONFIGS } from "@/lib/contracts/contractTypeConfigs";
import { cn } from "@/lib/utils";

const FIELD =
	"border-[0.25px] border-slate-300 hover:border-blue-300 focus-visible:border-[#078FAB]";

type NewAgreementDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	saving: boolean;
	onCreate: (input: {
		name: string;
		description: string;
		contractType: string;
	}) => Promise<void>;
};

export function NewAgreementDialog({
	open,
	onOpenChange,
	saving,
	onCreate,
}: NewAgreementDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [contractType, setContractType] = useState("vendor");

	const reset = () => {
		setName("");
		setDescription("");
		setContractType("vendor");
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<FilePlus className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							New agreement
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Starts with your organization logo, contact details, and a signature
						block. Publish when you are ready to use it on Create contract.
					</p>
				</div>
				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div>
						<Label className="text-slate-700">Title</Label>
						<Input
							className={cn("mt-1", FIELD)}
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Community partner agreement"
						/>
					</div>
					<div>
						<Label className="text-slate-700">Category</Label>
						<Select value={contractType} onValueChange={setContractType}>
							<SelectTrigger className={cn("mt-1", FIELD)}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONTRACT_TYPE_CONFIGS.map((row) => (
									<SelectItem key={row.id} value={row.id}>
										{row.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="text-slate-700">Short description</Label>
						<Textarea
							className={cn("mt-1 min-h-[88px]", FIELD)}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="When to use this agreement"
						/>
					</div>
				</div>
				<div className="flex items-center justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						disabled={saving || !name.trim()}
						onClick={() =>
							void onCreate({
								name: name.trim(),
								description: description.trim(),
								contractType,
							})
						}
					>
						<FilePlus className="h-4 w-4" />
						Create agreement
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
