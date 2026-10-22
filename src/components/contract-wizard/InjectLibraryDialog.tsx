"use client";

import { FileBox, FileText, Info, LayoutGrid } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clauseCategoryLabel } from "@/components/clauses/ClauseEditorDialog";
import RoundedUnderlineTabs from "@/components/RoundedUnderlineTabs";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
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

	useEffect(() => {
		if (!open) {
			setSearch("");
			setTab("clauses");
		}
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
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] max-w-[640px]"
			pending={loading}
			icon={<FileBox className="h-5 w-5" aria-hidden />}
			title="Inject into this draft"
			description="Add a published recipe or a single clause. This only changes the draft you are building."
			footer={
				<div className="flex items-start gap-2">
					<Info
						className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
						aria-hidden
					/>
					<p className="text-sm text-slate-600">
						Injected language is snapshotted on submit, not live-linked.
					</p>
				</div>
			}
		>
			<div className="pb-1">
					<RoundedUnderlineTabs
						className="mb-4"
						aria-label="Library source"
						variant="bar"
						value={tab}
						onValueChange={(next) => setTab(next as "templates" | "clauses")}
						tabs={[
							{ value: "clauses", label: "Clauses", icon: FileText },
							{ value: "templates", label: "Templates", icon: LayoutGrid },
						]}
					/>

					<SearchField
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={
							tab === "templates"
								? "Search templates..."
								: "Search published clauses..."
						}
						containerClassName="bg-white"
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
									className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
								>
									<div className="min-w-0 flex-1">
										<p className="font-medium text-slate-700">
											{template.name}
										</p>
										<p className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
											{template.contractType} · {template.clauseSlots.length}{" "}
											clauses
										</p>
									</div>
									<Button
										type="button"
										className="primary-btn shrink-0 cursor-pointer px-3 sm:px-4"
										onClick={() => {
											onInjectTemplate(template);
											onOpenChange(false);
										}}
									>
										<FileBox className="h-4 w-4" />
										Inject
									</Button>
								</div>
							))}

						{tab === "clauses" &&
							visibleClauses.map((clause) => (
								<div
									key={clause.$id}
									className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
								>
									<div className="min-w-0 flex-1">
										<p className="font-medium text-slate-700">{clause.title}</p>
										<p className="mt-1 text-xs font-medium tracking-wide text-slate-500 uppercase">
											{clauseCategoryLabel(clause.category)} · v{clause.version}
										</p>
									</div>
									<Button
										type="button"
										className="primary-btn shrink-0 cursor-pointer px-3 sm:px-4"
										onClick={() => {
											onInjectClause(clause);
											onOpenChange(false);
										}}
									>
										<FileBox className="h-4 w-4" />
										Inject
									</Button>
								</div>
							))}
					</div>
			</div>
		</AppDialog>
	);
}
