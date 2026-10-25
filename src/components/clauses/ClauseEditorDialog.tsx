import { FileText, Save } from "lucide-react";
import { useEffect, useState } from "react";
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
	"inline-flex w-fit items-center justify-center px-2 py-0.5 text-center text-xs rounded-full border";

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
		setStatus(
			clause?.status === "archived" ? "draft" : clause?.status || "draft",
		);
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

	const versionDescription = isVersionBump
		? `Saving creates version ${(clause?.version || 1) + 1}. Version ${clause?.version} stays in history.`
		: isEdit
			? `Draft version ${clause?.version || 1} updates in place.`
			: "Starts as version 1. Publish when the wording is ready.";

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[600px] sm:w-full"
			pending={saving}
			icon={<FileText className="h-5 w-5" aria-hidden />}
			title={isEdit ? "Edit clause" : "New clause"}
			description={versionDescription}
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
						disabled={saving || !title.trim() || !body.trim()}
						onClick={() => void handleSubmit()}
					>
						<Save className="h-4 w-4" />
						{saving ? "Saving..." : "Save"}
					</Button>
				</>
			}
		>
			<div className="space-y-4 pb-1">
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
							onValueChange={(value) => setCategory(value as ClauseCategory)}
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
		</AppDialog>
	);
}
