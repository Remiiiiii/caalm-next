"use client";

import { Archive, FileText, FunnelX, Plus, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	ClauseEditorDialog,
	clauseCategoryLabel,
	CAALM_BADGE_BASE,
	clauseStatusBadgeClass,
	clauseStatusLabel,
} from "@/components/clauses/ClauseEditorDialog";
import { ClauseLibraryDetail } from "@/components/clauses/ClauseLibraryDetail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PageIndex } from "@/components/ui/page-index";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import { cn } from "@/lib/utils";
import {
	CLAUSE_CATEGORIES,
	CLAUSE_STATUSES,
	type Clause,
	type ClauseCategory,
	type ClauseStatus,
	type CreateClauseInput,
	type UpdateClauseInput,
} from "@/types/clauses";

const PAGE_SIZE = 20;
const LIST_GRID =
	"grid grid-cols-[1.25rem_minmax(0,1fr)_auto_auto_auto] items-center gap-x-3";

function matchesLastModified(updatedAt: string, windowDays: string): boolean {
	if (windowDays === "all") return true;
	const days = Number(windowDays);
	if (!Number.isFinite(days) || days <= 0) return true;
	const updated = new Date(updatedAt).getTime();
	if (Number.isNaN(updated)) return false;
	return Date.now() - updated <= days * 24 * 60 * 60 * 1000;
}

export function ClauseLibraryPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const canCreate = permissions.includes(PERMISSIONS.CLAUSES.CREATE);
	const canEdit = permissions.includes(PERMISSIONS.CLAUSES.EDIT);
	const canDelete = permissions.includes(PERMISSIONS.CLAUSES.DELETE);

	const [items, setItems] = useState<Clause[]>([]);
	const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("all");
	const [status, setStatus] = useState("all");
	const [version, setVersion] = useState("all");
	const [modified, setModified] = useState("all");
	const [owner, setOwner] = useState("all");
	const [page, setPage] = useState(1);
	const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<Clause | null>(null);
	const [saving, setSaving] = useState(false);
	const [bulkBusy, setBulkBusy] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (category !== "all") params.set("category", category);
			if (status !== "all") params.set("status", status);
			const response = await fetch(`/api/clauses?${params.toString()}`);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Could not load clauses");
			}
			setItems(body.items || []);
		} catch (error) {
			toast({
				title: "Could not load clauses",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [category, status, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const ids = [...new Set(items.map((clause) => clause.createdBy).filter(Boolean))];
		if (ids.length === 0) {
			setOwnerNames({});
			return;
		}
		let cancelled = false;
		void fetchUserNamesByIds(ids).then((users) => {
			if (cancelled) return;
			const next: Record<string, string> = {};
			for (const user of users) {
				next[user.$id] = user.fullName;
			}
			setOwnerNames(next);
		});
		return () => {
			cancelled = true;
		};
	}, [items]);

	const versionOptions = useMemo(() => {
		const values = [...new Set(items.map((clause) => clause.version))].sort(
			(a, b) => a - b,
		);
		return values;
	}, [items]);

	const ownerOptions = useMemo(() => {
		const ids = [...new Set(items.map((clause) => clause.createdBy).filter(Boolean))];
		return ids.map((id) => ({
			id,
			label: ownerNames[id] || "Unknown",
		}));
	}, [items, ownerNames]);

	const filteredItems = useMemo(() => {
		const q = search.trim().toLowerCase();
		return items.filter((clause) => {
			if (
				q &&
				!clause.title.toLowerCase().includes(q) &&
				!clause.body.toLowerCase().includes(q) &&
				!clause.category.toLowerCase().includes(q)
			) {
				return false;
			}
			if (version !== "all" && String(clause.version) !== version) return false;
			if (!matchesLastModified(clause.$updatedAt, modified)) return false;
			if (owner !== "all" && clause.createdBy !== owner) return false;
			return true;
		});
	}, [items, search, version, modified, owner]);

	useEffect(() => {
		setPage(1);
	}, [search, category, status, version, modified, owner]);

	const totalItems = filteredItems.length;
	const pagedItems = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return filteredItems.slice(start, start + PAGE_SIZE);
	}, [filteredItems, page]);

	useEffect(() => {
		if (
			selectedFamilyId &&
			filteredItems.some((clause) => clause.familyId === selectedFamilyId)
		) {
			return;
		}
		setSelectedFamilyId(pagedItems[0]?.familyId ?? null);
	}, [filteredItems, pagedItems, selectedFamilyId]);

	const selectedClause =
		filteredItems.find((clause) => clause.familyId === selectedFamilyId) ??
		null;

	const pageIds = pagedItems.map((clause) => clause.$id);
	const allPageSelected =
		pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
	const somePageSelected = pageIds.some((id) => selectedIds.includes(id));

	const extraFilterCount = [version, modified, owner].filter(
		(value) => value !== "all",
	).length;
	const activeFilterCount = [
		search.trim() !== "",
		category !== "all",
		status !== "all",
		version !== "all",
		modified !== "all",
		owner !== "all",
	].filter(Boolean).length;
	const filtersActive = activeFilterCount > 0;

	const clearFilters = () => {
		setSearch("");
		setCategory("all");
		setStatus("all");
		setVersion("all");
		setModified("all");
		setOwner("all");
	};

	const handleSave = async (input: CreateClauseInput | UpdateClauseInput) => {
		setSaving(true);
		try {
			const isEdit = Boolean(editing);
			const response = await fetch(
				isEdit ? `/api/clauses/${editing?.$id}` : "/api/clauses",
				{
					method: isEdit ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				},
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Save failed");
			}
			const saved: Clause | undefined = body.clause;
			if (saved?.familyId) setSelectedFamilyId(saved.familyId);
			toast({
				title: isEdit ? "Clause saved" : "Clause created",
			});
			setEditorOpen(false);
			setEditing(null);
			await load();
		} catch (error) {
			toast({
				title: "Could not save",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handleArchive = async (clause: Clause) => {
		try {
			const response = await fetch(`/api/clauses/${clause.$id}`, {
				method: "DELETE",
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Archive failed");
			}
			toast({ title: "Clause archived" });
			setSelectedIds((ids) => ids.filter((id) => id !== clause.$id));
			await load();
		} catch (error) {
			toast({
				title: "Could not archive",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const handlePublish = async (clause: Clause) => {
		try {
			const response = await fetch(`/api/clauses/${clause.$id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "active" }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Publish failed");
			}
			toast({ title: "Clause published" });
			await load();
		} catch (error) {
			toast({
				title: "Could not publish",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const handleBulkArchive = async () => {
		const targets = items.filter(
			(clause) =>
				selectedIds.includes(clause.$id) && clause.status !== "archived",
		);
		if (targets.length === 0) return;
		setBulkBusy(true);
		let failed = 0;
		for (const clause of targets) {
			const response = await fetch(`/api/clauses/${clause.$id}`, {
				method: "DELETE",
			});
			if (!response.ok) failed += 1;
		}
		setBulkBusy(false);
		setSelectedIds([]);
		await load();
		if (failed === 0) {
			toast({ title: `Archived ${targets.length} clauses` });
		} else {
			toast({
				title: "Bulk archive finished with errors",
				description: `${targets.length - failed} archived, ${failed} failed`,
				variant: "destructive",
			});
		}
	};

	const toggleSelectAllPage = (checked: boolean) => {
		setSelectedIds((current) => {
			if (checked) {
				return [...new Set([...current, ...pageIds])];
			}
			return current.filter((id) => !pageIds.includes(id));
		});
	};

	const toggleSelect = (id: string, checked: boolean) => {
		setSelectedIds((current) =>
			checked ? [...current, id] : current.filter((item) => item !== id),
		);
	};

	const selectRow = (clause: Clause) => {
		setSelectedFamilyId(clause.familyId);
	};

	const filterSelectClass = "h-10 w-44 shrink-0";

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-end gap-3">
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							className="primary-btn shrink-0 px-3 sm:px-4"
						>
							<SlidersHorizontal className="h-4 w-4" />
							More filters
							{extraFilterCount > 0 ? (
								<span
									className={`${CAALM_BADGE_BASE} bg-orange/10 text-orange border-orange/20`}
								>
									{extraFilterCount}
								</span>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						align="end"
						className="w-80 space-y-3 bg-slate-50"
					>
						<div className="space-y-1">
							<p className="text-xs font-medium text-slate-600">Version</p>
							<Select value={version} onValueChange={setVersion}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Version" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All versions</SelectItem>
									{versionOptions.map((value) => (
										<SelectItem key={value} value={String(value)}>
											v{value}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium text-slate-600">
								Last modified
							</p>
							<Select value={modified} onValueChange={setModified}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Last modified" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Any date</SelectItem>
									<SelectItem value="7">Last 7 days</SelectItem>
									<SelectItem value="30">Last 30 days</SelectItem>
									<SelectItem value="90">Last 90 days</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-1">
							<p className="text-xs font-medium text-slate-600">Owner</p>
							<Select value={owner} onValueChange={setOwner}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Owner" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All owners</SelectItem>
									{ownerOptions.map((item) => (
										<SelectItem key={item.id} value={item.id}>
											{item.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</PopoverContent>
				</Popover>
				<Button
					type="button"
					variant="outline"
					className="primary-btn shrink-0 px-3 sm:px-4"
					onClick={clearFilters}
					disabled={!filtersActive}
				>
					<FunnelX className="h-4 w-4" />
					Clear filters
				</Button>
				{filtersActive ? (
					<span
						className={`${CAALM_BADGE_BASE} bg-orange/10 text-orange border-orange/20`}
					>
						{activeFilterCount}{" "}
						{activeFilterCount === 1 ? "filter" : "filters"} active
					</span>
				) : null}
				{!permissionsLoading && canCreate ? (
					<Button
						className="primary-btn shrink-0 px-3 sm:px-4"
						onClick={() => {
							setEditing(null);
							setEditorOpen(true);
						}}
					>
						<Plus className="h-4 w-4" />
						New clause
					</Button>
				) : null}
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 pt-8 sm:p-6 sm:pt-8">
					<div className="flex min-w-0 flex-wrap items-center gap-3">
						<SearchField
							containerClassName="min-w-[16rem] flex-1"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search titles and wording…"
							aria-label="Search clauses"
						/>
						<Select value={category} onValueChange={setCategory}>
							<SelectTrigger className={filterSelectClass}>
								<SelectValue placeholder="Category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All categories</SelectItem>
								{CLAUSE_CATEGORIES.map((item) => (
									<SelectItem key={item} value={item}>
										{clauseCategoryLabel(item as ClauseCategory)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className={filterSelectClass}>
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								{CLAUSE_STATUSES.map((item) => (
									<SelectItem key={item} value={item}>
										{clauseStatusLabel(item as ClauseStatus)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			{selectedIds.length > 0 ? (
				<div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
					<p className="text-sm font-medium text-slate-700">
						{selectedIds.length} selected
					</p>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="cursor-pointer"
							onClick={() => setSelectedIds([])}
						>
							<X className="h-4 w-4" />
							Clear
						</Button>
						{canDelete ? (
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3 sm:px-4"
								disabled={bulkBusy}
								onClick={() => void handleBulkArchive()}
							>
								<Archive className="h-4 w-4" />
								{bulkBusy ? "Archiving..." : "Archive"}
							</Button>
						) : null}
					</div>
				</div>
			) : null}

			<div className="flex min-h-[calc(100vh-16rem)] flex-col gap-4 lg:flex-row">
				<Card
					className="glass-card flex min-h-0 flex-1 flex-col lg:max-w-[52%]"
				>
					<div className="glass-card-cap" />
					<CardContent className="flex min-h-0 flex-1 flex-col p-0 pt-4">
						<div
							className={cn(
								LIST_GRID,
								"border-b border-slate-200 px-3 py-2 text-xs font-semibold sidebar-gradient-text",
							)}
						>
							<Checkbox
								aria-label="Select all on this page"
								checked={
									allPageSelected
										? true
										: somePageSelected
											? "indeterminate"
											: false
								}
								onCheckedChange={(checked) =>
									toggleSelectAllPage(checked === true)
								}
								disabled={pagedItems.length === 0}
							/>
							<span>Title</span>
							<span>Category</span>
							<span>Ver</span>
							<span>Status</span>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto">
							{loading ? (
								<p className="p-6 text-sm text-slate-600">Loading clauses…</p>
							) : pagedItems.length === 0 ? (
								<div className="flex flex-col items-center gap-3 p-8 text-center">
									<FileText className="h-8 w-8 text-[#0f5384]" />
									<p className="text-sm font-medium text-slate-700">
										No matching clauses
									</p>
									<p className="max-w-md text-sm text-slate-600">
										{filtersActive
											? "Try clearing filters or adding a new clause."
											: "Add org-owned wording here. Later reviews can score drafts against this library."}
									</p>
								</div>
							) : (
								<div>
									{pagedItems.map((clause) => {
										const selected = clause.familyId === selectedFamilyId;
										return (
												<div
													key={clause.$id}
													className={cn(
														LIST_GRID,
														"h-10 overflow-hidden cursor-pointer border-b border-slate-200/80 px-3 text-sm transition-colors duration-200",
														selected
															? "bg-blue-50"
															: "hover:bg-white/40",
													)}
													onClick={() => selectRow(clause)}
													onKeyDown={(event) => {
														if (event.key === "Enter" || event.key === " ") {
															event.preventDefault();
															selectRow(clause);
														}
													}}
													role="button"
													tabIndex={0}
												>
													<div
														onClick={(event) => event.stopPropagation()}
														onKeyDown={(event) => event.stopPropagation()}
													>
														<Checkbox
															aria-label={`Select ${clause.title}`}
															checked={selectedIds.includes(clause.$id)}
															onCheckedChange={(checked) =>
																toggleSelect(clause.$id, checked === true)
															}
														/>
													</div>
													<p className="truncate font-medium text-slate-700">
														{clause.title}
													</p>
													<span
														className={`${CAALM_BADGE_BASE} max-w-full truncate justify-self-start bg-blue/10 text-blue border-blue/20`}
													>
														{clauseCategoryLabel(clause.category)}
													</span>
													<span
														className={`${CAALM_BADGE_BASE} justify-self-start bg-slate-100 text-slate-600 border-slate-200`}
													>
														v{clause.version}
													</span>
													<span
														className={`${CAALM_BADGE_BASE} justify-self-start ${clauseStatusBadgeClass(clause.status)}`}
													>
														{clauseStatusLabel(clause.status)}
													</span>
												</div>
										);
									})}
								</div>
							)}
						</div>

						<div className="border-t border-slate-200 px-3 py-3">
							<PageIndex
								page={page}
								totalItems={totalItems}
								pageSize={PAGE_SIZE}
								onPageChange={setPage}
								showRange
								itemLabel="clauses"
							/>
						</div>
					</CardContent>
				</Card>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<ClauseLibraryDetail
						clause={selectedClause}
						ownerName={
							selectedClause
								? ownerNames[selectedClause.createdBy] || ""
								: ""
						}
						canEdit={canEdit}
						canDelete={canDelete}
						onEdit={(clause) => {
							setEditing(clause);
							setEditorOpen(true);
						}}
						onPublish={(clause) => void handlePublish(clause)}
						onArchive={(clause) => void handleArchive(clause)}
					/>
				</div>
			</div>

			<ClauseEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				clause={editing}
				saving={saving}
				onSave={handleSave}
			/>
		</div>
	);
}
