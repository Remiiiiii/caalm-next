"use client";

import { FilePlus } from "lucide-react";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
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
		<AppDialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
			size="form"
			className="max-h-[90vh]"
			pending={saving}
			icon={<FilePlus className="h-5 w-5" />}
			title="New agreement"
			description="Starts with your organization logo, contact details, and a signature block. Publish when you are ready to use it on Create contract."
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
						className="btn-primary cursor-pointer px-3 sm:px-4"
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
				</>
			}
		>
			<div className="flex flex-col gap-4 pb-1">
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
		</AppDialog>
	);
}
