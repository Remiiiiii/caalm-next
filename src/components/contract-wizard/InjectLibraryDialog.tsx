"use client";

import { FileBox, FileText, Info, LayoutGrid } from "lucide-react";
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

const INJECT_TAB_BASE =
	"flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-colors duration-200 sm:text-[12.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

const INJECT_TAB_INACTIVE =
	"border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

const INJECT_TAB_ACTIVE = "border-blue/30 bg-blue/10 text-[#0f5384]";

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
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				closeButtonClassName="top-6 right-6 z-30"
				className="flex max-h-[90vh] max-w-[640px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl"
			>
				{/* Cap + mint header (image layout, CAALM green tint) */}
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-[#e8f2ef] py-4">
					<div className="flex items-center gap-3 px-6">
						<FileBox className="h-5 w-5 shrink-0 text-[#0f5384]" aria-hidden />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Inject into this draft
						</DialogTitle>
					</div>
					<p className="mt-1 ml-14 pr-6 text-sm text-slate-600">
						Add a published recipe or a single clause. This only changes the
						draft you are building.
					</p>
				</div>

				<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
					{/* Equal-width tab switch */}
					<div
						className="mb-4 flex gap-1.5"
						role="tablist"
						aria-label="Library source"
					>
						<button
							type="button"
							role="tab"
							aria-selected={tab === "clauses"}
							className={cn(
								INJECT_TAB_BASE,
								tab === "clauses" ? INJECT_TAB_ACTIVE : INJECT_TAB_INACTIVE,
							)}
							onClick={() => setTab("clauses")}
						>
							<FileText className="h-3.5 w-3.5" />
							Clauses
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={tab === "templates"}
							className={cn(
								INJECT_TAB_BASE,
								tab === "templates" ? INJECT_TAB_ACTIVE : INJECT_TAB_INACTIVE,
							)}
							onClick={() => setTab("templates")}
						>
							<LayoutGrid className="h-3.5 w-3.5" />
							Templates
						</button>
					</div>

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
											{clauseCategoryLabel(clause.category)} · v
											{clause.version}
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

				<div className="flex items-start gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Info
						className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
						aria-hidden
					/>
					<p className="text-sm text-slate-600">
						Injected language is snapshotted on submit, not live-linked.
					</p>
				</div>
			</DialogContent>
		</Dialog>
	);
}
