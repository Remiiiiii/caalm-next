"use client";

import { FileStack, FileText, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clauseCategoryLabel } from "@/components/clauses/ClauseEditorDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchField } from "@/components/ui/search-field";
import { cn } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import type { ContractTemplate } from "@/types/contract-templates";

type InjectLibraryDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onInjectTemplate: (template: ContractTemplate) => void;
	onInjectClause: (clause: Clause) => void;
	excludeFamilyIds: string[];
};

export function InjectLibraryDialog({
	open,
	onOpenChange,
	onInjectTemplate,
	onInjectClause,
	excludeFamilyIds,
}: InjectLibraryDialogProps) {
	const [tab, setTab] = useState<"templates" | "clauses">("clauses");
	const [search, setSearch] = useState("");
	const [templates, setTemplates] = useState<ContractTemplate[]>([]);
	const [clauses, setClauses] = useState<Clause[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		let cancelled = false;
		setLoading(true);
		void Promise.all([
			fetch("/api/contracts/wizard?publishedTemplates=1").then((r) => r.json()),
			fetch("/api/contracts/wizard?publishedClauses=1").then((r) => r.json()),
		])
			.then(([templateBody, clauseBody]) => {
				if (cancelled) return;
				setTemplates(templateBody.items || []);
				setClauses(clauseBody.items || []);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [open]);

	const q = search.trim().toLowerCase();
	const visibleTemplates = useMemo(
		() =>
			templates.filter((template) => {
				if (!q) return true;
				return (
					template.name.toLowerCase().includes(q) ||
					(template.description || "").toLowerCase().includes(q)
				);
			}),
		[templates, q],
	);
	const visibleClauses = useMemo(
		() =>
			clauses.filter((clause) => {
				if (excludeFamilyIds.includes(clause.familyId)) return false;
				if (!q) return true;
				return (
					clause.title.toLowerCase().includes(q) ||
					clause.category.toLowerCase().includes(q)
				);
			}),
		[clauses, excludeFamilyIds, q],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-[640px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 py-4">
					<div className="flex items-center gap-3 px-6">
						<Plus className="h-5 w-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Inject into this draft
						</DialogTitle>
					</div>
					<p className="ml-14 mt-1 text-sm text-slate-600">
						Add a published recipe or a single clause. This only changes the
						draft you are building.
					</p>
				</div>
				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					<div className="mb-4 flex gap-3">
						<Button
							type="button"
							variant={tab === "clauses" ? "default" : "outline"}
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => setTab("clauses")}
						>
							<FileText className="h-4 w-4" />
							Clauses
						</Button>
						<Button
							type="button"
							variant={tab === "templates" ? "default" : "outline"}
							className="primary-btn cursor-pointer px-3 sm:px-4"
							onClick={() => setTab("templates")}
						>
							<FileStack className="h-4 w-4" />
							Templates
						</Button>
					</div>
					<SearchField
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={
							tab === "templates"
								? "Search templates..."
								: "Search published clauses..."
						}
					/>
					<div className="mt-4 space-y-3">
						{loading && (
							<p className="text-sm text-slate-600">Loading library…</p>
						)}
						{!loading &&
							tab === "templates" &&
							visibleTemplates.length === 0 && (
								<p className="text-sm text-slate-600">
									No published templates match this search.
								</p>
							)}
						{!loading && tab === "clauses" && visibleClauses.length === 0 && (
							<p className="text-sm text-slate-600">
								No published clauses left to add.
							</p>
						)}
						{tab === "templates" &&
							visibleTemplates.map((template) => (
								<div
									key={template.$id}
									className="rounded-lg border border-slate-200 bg-white p-4"
								>
									<p className="font-medium text-slate-700">{template.name}</p>
									<p className="mt-1 text-sm text-slate-600">
										{template.clauseSlots.length} clauses ·{" "}
										{template.contractType}
									</p>
									<Button
										type="button"
										className="primary-btn mt-3 cursor-pointer px-3 sm:px-4"
										onClick={() => {
											onInjectTemplate(template);
											onOpenChange(false);
										}}
									>
										Inject template
									</Button>
								</div>
							))}
						{tab === "clauses" &&
							visibleClauses.map((clause) => (
								<div
									key={clause.$id}
									className={cn(
										"rounded-lg border border-slate-200 bg-white p-4",
									)}
								>
									<p className="font-medium text-slate-700">{clause.title}</p>
									<p className="mt-1 text-sm text-slate-600">
										{clauseCategoryLabel(clause.category)} · v{clause.version}
									</p>
									<Button
										type="button"
										className="primary-btn mt-3 cursor-pointer px-3 sm:px-4"
										onClick={() => {
											onInjectClause(clause);
											onOpenChange(false);
										}}
									>
										Inject clause
									</Button>
								</div>
							))}
					</div>
				</div>
				<div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
					<p className="text-xs text-slate-500">
						Injected language is snapshotted on submit, not live-linked.
					</p>
					<Button
						type="button"
						variant="outline"
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => onOpenChange(false)}
					>
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
