"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
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
import type { Clause } from "@/types/clauses";
import type {
	ClauseRef,
	ContractTemplate,
	CreateTemplateInput,
	TemplateStatus,
	UpdateTemplateInput,
} from "@/types/contract-templates";

type TemplateEditorDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	template: ContractTemplate | null;
	clauses: Clause[];
	saving: boolean;
	onSave: (input: CreateTemplateInput | UpdateTemplateInput) => Promise<void>;
};

export function templateStatusLabel(status: TemplateStatus): string {
	if (status === "active") return "Active";
	if (status === "archived") return "Archived";
	return "Draft";
}

export function templateStatusBadgeClass(status: TemplateStatus): string {
	if (status === "active") return "bg-green/10 text-green border-green/20";
	if (status === "archived") {
		return "bg-slate-100 text-slate-600 border-slate-200";
	}
	return "bg-orange/10 text-orange border-orange/20";
}

export function TemplateEditorDialog({
	open,
	onOpenChange,
	template,
	clauses,
	saving,
	onSave,
}: TemplateEditorDialogProps) {
	const isEdit = Boolean(template);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [contractTypeId, setContractTypeId] = useState(
		CONTRACT_TYPE_CONFIGS[0]?.id || "vendor",
	);
	const [status, setStatus] = useState<TemplateStatus>("draft");
	const [selectedFamilyIds, setSelectedFamilyIds] = useState<string[]>([]);

	useEffect(() => {
		if (!open) return;
		setTitle(template?.title || "");
		setDescription(template?.description || "");
		setContractTypeId(
			template?.contractTypeId || CONTRACT_TYPE_CONFIGS[0]?.id || "vendor",
		);
		setStatus(
			template?.status === "archived"
				? "draft"
				: template?.status || "draft",
		);
		setSelectedFamilyIds(
			(template?.clauseRefs || [])
				.slice()
				.sort((a, b) => a.sortOrder - b.sortOrder)
				.map((ref) => ref.familyId),
		);
	}, [open, template]);

	const selectedSet = useMemo(
		() => new Set(selectedFamilyIds),
		[selectedFamilyIds],
	);

	const handleToggle = (familyId: string, checked: boolean) => {
		setSelectedFamilyIds((current) => {
			if (checked) {
				if (current.includes(familyId)) return current;
				return [...current, familyId];
			}
			return current.filter((id) => id !== familyId);
		});
	};

	const move = (familyId: string, direction: -1 | 1) => {
		setSelectedFamilyIds((current) => {
			const index = current.indexOf(familyId);
			const nextIndex = index + direction;
			if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
				return current;
			}
			const copy = [...current];
			const [item] = copy.splice(index, 1);
			copy.splice(nextIndex, 0, item);
			return copy;
		});
	};

	const clauseRefs: ClauseRef[] = selectedFamilyIds.map((familyId, sortOrder) => ({
		familyId,
		sortOrder,
	}));

	const handleSubmit = async () => {
		await onSave({
			title,
			description: description.trim() || undefined,
			status,
			contractTypeId,
			clauseRefs,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:w-full">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<FileText className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{isEdit ? "Edit template" : "New template"}
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						Stack published clauses in the order they should appear in a draft.
					</p>
				</div>

				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-2">
						<Label htmlFor="template-title">Title</Label>
						<Input
							id="template-title"
							className="border-[0.25px] border-slate-300"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="template-type">Contract type</Label>
						<Select value={contractTypeId} onValueChange={setContractTypeId}>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONTRACT_TYPE_CONFIGS.map((config) => (
									<SelectItem key={config.id} value={config.id}>
										{config.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="template-status">Status</Label>
						<Select
							value={status}
							onValueChange={(value) => setStatus(value as TemplateStatus)}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="active">Active</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="template-description">Short description</Label>
						<Textarea
							id="template-description"
							className="border-[0.25px] border-slate-300"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label>Clauses</Label>
						<p className="text-xs text-slate-500">
							Only published (active) clauses can go on a template.
						</p>
						<div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
							{clauses.length === 0 ? (
								<p className="text-sm text-slate-600">
									No active clauses yet. Publish wording in the clause library
									first.
								</p>
							) : (
								clauses.map((item) => {
									const checked = selectedSet.has(item.familyId);
									const order = selectedFamilyIds.indexOf(item.familyId);
									return (
										<div
											key={item.$id}
											className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-2"
										>
											<input
												type="checkbox"
												className="cursor-pointer"
												checked={checked}
												onChange={(event) =>
													handleToggle(item.familyId, event.target.checked)
												}
												aria-label={`Include ${item.title}`}
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-slate-700">
													{item.title}
												</p>
												<p className="text-xs text-slate-500">
													v{item.version}
												</p>
											</div>
											{checked ? (
												<div className="flex gap-1">
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="cursor-pointer"
														disabled={order <= 0}
														onClick={() => move(item.familyId, -1)}
													>
														Up
													</Button>
													<Button
														type="button"
														variant="ghost"
														size="sm"
														className="cursor-pointer"
														disabled={order === selectedFamilyIds.length - 1}
														onClick={() => move(item.familyId, 1)}
													>
														Down
													</Button>
												</div>
											) : null}
										</div>
									);
								})
							)}
						</div>
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
						disabled={
							saving || !title.trim() || selectedFamilyIds.length === 0
						}
						onClick={() => void handleSubmit()}
					>
						{saving ? "Saving..." : "Save"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
