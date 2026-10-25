"use client";

import { FileStack, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { clauseCategoryLabel } from "@/components/clauses/ClauseEditorDialog";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
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
import type { Clause } from "@/types/clauses";
import type {
	ClauseSlot,
	ContractTemplate,
	CreateTemplateInput,
	TemplateStatus,
} from "@/types/contract-templates";

const FIELD =
	"border-[0.25px] border-slate-300 hover:border-blue-300 focus-visible:border-[#078FAB]";

type TemplateEditorDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template: ContractTemplate | null;
	saving: boolean;
	onSave: (input: CreateTemplateInput) => Promise<void>;
};

export function TemplateEditorDialog({
	open,
	onOpenChange,
	template,
	saving,
	onSave,
}: TemplateEditorDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [contractType, setContractType] = useState("vendor");
	const [status, setStatus] = useState<TemplateStatus>("draft");
	const [slots, setSlots] = useState<ClauseSlot[]>([]);
	const [clauses, setClauses] = useState<Clause[]>([]);
	const [addFamilyId, setAddFamilyId] = useState("");

	useEffect(() => {
		if (!open) return;
		setName(template?.name || "");
		setDescription(template?.description || "");
		setContractType(template?.contractType || "vendor");
		setStatus(template?.status === "published" ? "published" : "draft");
		setSlots(template?.clauseSlots || []);
		void fetch("/api/clauses?status=active")
			.then((r) => r.json())
			.then((body) => setClauses(body.items || []))
			.catch(() => setClauses([]));
	}, [open, template]);

	const unused = clauses.filter(
		(clause) => !slots.some((slot) => slot.familyId === clause.familyId),
	);

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] max-w-[640px]"
			pending={saving}
			icon={<FileStack className="h-5 w-5" aria-hidden />}
			title={template ? "Edit template" : "New template"}
			description="A template is a recipe of published clauses. Using it always creates a new contract."
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
						onClick={() =>
							void onSave({
								name,
								description,
								contractType,
								status,
								clauseSlots: slots,
							})
						}
					>
						<Save className="h-4 w-4" />
						Save
					</Button>
				</>
			}
		>
			<div className="space-y-4 pb-1">
					<div>
						<Label className="text-slate-700">Name</Label>
						<Input
							className={cn("mt-1", FIELD)}
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</div>
					<div>
						<Label className="text-slate-700">Contract type</Label>
						<Select value={contractType} onValueChange={setContractType}>
							<SelectTrigger className={cn("mt-1", FIELD)}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONTRACT_TYPE_CONFIGS.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="text-slate-700">Status</Label>
						<Select
							value={status}
							onValueChange={(value) => setStatus(value as TemplateStatus)}
						>
							<SelectTrigger className={cn("mt-1", FIELD)}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="published">Published</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="text-slate-700">Description</Label>
						<Textarea
							className={cn("mt-1 min-h-20", FIELD)}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
						/>
					</div>
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<p className="text-sm font-medium text-slate-700">Clause recipe</p>
						<ul className="mt-3 space-y-2">
							{slots.map((slot, index) => {
								const clause = clauses.find(
									(row) => row.familyId === slot.familyId,
								);
								return (
									<li
										key={`${slot.familyId}-${index}`}
										className="flex items-center justify-between gap-3 text-sm text-slate-700"
									>
										<span>
											{index + 1}. {clause?.title || slot.familyId}
											{clause
												? ` · ${clauseCategoryLabel(clause.category)}`
												: ""}
										</span>
										<label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
											<input
												type="checkbox"
												className="cursor-pointer"
												checked={slot.required}
												onChange={(event) => {
													const next = slots.map((row, i) =>
														i === index
															? { ...row, required: event.target.checked }
															: row,
													);
													setSlots(next);
												}}
											/>
											Required
										</label>
										<button
											type="button"
											className="cursor-pointer text-xs text-red"
											onClick={() =>
												setSlots(slots.filter((_, i) => i !== index))
											}
										>
											Remove
										</button>
									</li>
								);
							})}
						</ul>
						<div className="mt-4 flex gap-2">
							<Select value={addFamilyId} onValueChange={setAddFamilyId}>
								<SelectTrigger className={cn("flex-1", FIELD)}>
									<SelectValue placeholder="Add a published clause" />
								</SelectTrigger>
								<SelectContent>
									{unused.map((clause) => (
										<SelectItem key={clause.$id} value={clause.familyId}>
											{clause.title}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Button
								type="button"
								className="primary-btn cursor-pointer px-3 sm:px-4"
								disabled={!addFamilyId}
								onClick={() => {
									setSlots([
										...slots,
										{ familyId: addFamilyId, required: true },
									]);
									setAddFamilyId("");
								}}
							>
								Add
							</Button>
						</div>
					</div>
			</div>
		</AppDialog>
	);
}
