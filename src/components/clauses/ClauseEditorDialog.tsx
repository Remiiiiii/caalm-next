import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
	CLAUSE_CATEGORIES,
	type Clause,
	type ClauseCategory,
	type ClauseStatus,
	type CreateClauseInput,
	type UpdateClauseInput,
} from "@/types/clauses";

const CATEGORY_LABELS: Record<ClauseCategory, string> = {
	confidentiality: "Confidentiality",
	payment: "Payment",
	termination: "Termination",
	liability: "Liability",
	indemnification: "Indemnification",
	intellectual_property: "Intellectual property",
	data_protection: "Data protection",
	governing_law: "Governing law",
	other: "Other",
};

export function clauseCategoryLabel(category: ClauseCategory): string {
	return CATEGORY_LABELS[category];
}

/** Match Contracts / Licenses table badges (`ContractsTableView` statusBadge). */
export const CAALM_BADGE_BASE =
	"inline-flex w-fit items-center justify-center px-2 py-0.5 text-center text-xs rounded-full font-medium border";

export function clauseStatusBadgeClass(status: ClauseStatus): string {
	if (status === "active") return "bg-green/10 text-green border-green/20";
	if (status === "archived") {
		return "bg-slate-100 text-slate-600 border-slate-200";
	}
	return "bg-orange/10 text-orange border-orange/20";
}

export function clauseStatusLabel(status: ClauseStatus): string {
	if (status === "active") return "Active";
	if (status === "archived") return "Archived";
	return "Draft";
}

type ClauseEditorDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clause: Clause | null;
	saving: boolean;
	onSave: (input: CreateClauseInput | UpdateClauseInput) => Promise<void>;
};

export function ClauseEditorDialog({
	open,
	onOpenChange,
	clause,
	saving,
	onSave,
}: ClauseEditorDialogProps) {
	const isEdit = Boolean(clause);
	const isVersionBump = clause?.status === "active";

	const [title, setTitle] = useState("");
	const [category, setCategory] = useState<ClauseCategory>("other");
	const [body, setBody] = useState("");
	const [status, setStatus] = useState<ClauseStatus>("draft");
	const [changeNote, setChangeNote] = useState("");

	useEffect(() => {
		if (!open) return;
		setTitle(clause?.title || "");
		setCategory(clause?.category || "other");
		setBody(clause?.body || "");
		setStatus(clause?.status === "archived" ? "draft" : clause?.status || "draft");
		setChangeNote("");
	}, [open, clause]);

	const handleSubmit = async () => {
		await onSave({
			title,
			category,
			body,
			status,
			changeNote: changeNote.trim() || undefined,
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
								{isEdit ? "Edit clause" : "New clause"}
							</DialogTitle>
						</div>
					</div>
					<p className="mt-1 ml-14 text-sm text-slate-600">
						{isVersionBump
							? `Saving creates version ${(clause?.version || 1) + 1}. Version ${clause?.version} stays in history.`
							: isEdit
								? `Draft version ${clause?.version || 1} updates in place.`
								: "Starts as version 1. Publish when the wording is ready."}
					</p>
				</div>

				<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
					<div className="space-y-2">
						<Label htmlFor="clause-title">Title</Label>
						<Input
							id="clause-title"
							className="border-[0.25px] border-slate-300"
							value={title}
							onChange={(event) => setTitle(event.target.value)}
							placeholder="Confidentiality — mutual NDA"
						/>
					</div>
					<div className="space-y-2">
						<Label>Category</Label>
						<Select
							value={category}
							onValueChange={(value) =>
								setCategory(value as ClauseCategory)
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CLAUSE_CATEGORIES.map((item) => (
									<SelectItem key={item} value={item}>
										{CATEGORY_LABELS[item]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="clause-body">Clause text</Label>
						<Textarea
							id="clause-body"
							className="min-h-40 border-[0.25px] border-slate-300"
							value={body}
							onChange={(event) => setBody(event.target.value)}
							placeholder="Paste the standard wording..."
						/>
					</div>
					<div className="space-y-2">
						<Label>Status</Label>
						<Select
							value={status}
							onValueChange={(value) => setStatus(value as ClauseStatus)}
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
					{isVersionBump ? (
						<div className="space-y-2">
							<Label htmlFor="clause-note">Why this version</Label>
							<Input
								id="clause-note"
								className="border-[0.25px] border-slate-300"
								value={changeNote}
								onChange={(event) => setChangeNote(event.target.value)}
								placeholder="Optional note for reviewers"
							/>
						</div>
					) : null}
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
						disabled={saving || !title.trim() || !body.trim()}
						onClick={() => void handleSubmit()}
					>
						{saving ? "Saving..." : "Save"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
