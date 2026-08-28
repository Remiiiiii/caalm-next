"use client";

import { FileText, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApplyTemplateDialog } from "@/components/contract-templates/ApplyTemplateDialog";
import { TemplateLibraryDetail } from "@/components/contract-templates/TemplateLibraryDetail";
import {
	TemplateEditorDialog,
	templateStatusBadgeClass,
	templateStatusLabel,
} from "@/components/contract-templates/TemplateEditorDialog";
import { CAALM_BADGE_BASE } from "@/components/clauses/ClauseEditorDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageIndex } from "@/components/ui/page-index";
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
import { getContractTypeConfig } from "@/lib/contracts/contractTypeConfigs";
import { cn } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import type {
	ContractTemplate,
	CreateTemplateInput,
	TemplateStatus,
	UpdateTemplateInput,
} from "@/types/contract-templates";

const PAGE_SIZE = 20;
const LIST_GRID =
	"grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3";
const filterSelectClass =
	"h-10 w-[10.5rem] border-[0.25px] border-slate-300 bg-white";

export function ContractTemplatesPage() {
	const { permissions, loading: permissionsLoading } = usePermissions();
	const { toast } = useToast();
	const router = useRouter();
	const canCreate = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.CREATE);
	const canEdit = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.EDIT);
	const canDelete = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.DELETE);
	const canApply = permissions.includes(PERMISSIONS.CONTRACTS.CREATE);

	const [items, setItems] = useState<ContractTemplate[]>([]);
	const [clauses, setClauses] = useState<Clause[]>([]);
	const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");
	const [page, setPage] = useState(1);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editorOpen, setEditorOpen] = useState(false);
	const [applyOpen, setApplyOpen] = useState(false);
	const [editing, setEditing] = useState<ContractTemplate | null>(null);
	const [saving, setSaving] = useState(false);
	const [applying, setApplying] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (status !== "all") params.set("status", status);
			const [templatesRes, clausesRes] = await Promise.all([
				fetch(`/api/contract-templates?${params.toString()}`),
				fetch("/api/clauses?status=active"),
			]);
			const templatesBody = await templatesRes.json().catch(() => ({}));
			const clausesBody = await clausesRes.json().catch(() => ({}));
			if (!templatesRes.ok) {
				throw new Error(templatesBody.error || "Could not load templates");
			}
			setItems(templatesBody.items || []);
			setClauses(clausesRes.ok ? clausesBody.items || [] : []);
		} catch (error) {
			toast({
				title: "Could not load templates",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [status, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const ids = [
			...new Set(items.map((item) => item.createdBy).filter(Boolean)),
		];
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

	const filteredItems = useMemo(() => {
		const q = search.trim().toLowerCase();
		return items.filter((item) => {
			if (
				q &&
				!item.title.toLowerCase().includes(q) &&
				!(item.description || "").toLowerCase().includes(q)
			) {
				return false;
			}
			return true;
		});
	}, [items, search]);

	useEffect(() => {
		setPage(1);
	}, [search, status]);

	const totalItems = filteredItems.length;
	const pagedItems = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return filteredItems.slice(start, start + PAGE_SIZE);
	}, [filteredItems, page]);

	useEffect(() => {
		if (selectedId && filteredItems.some((item) => item.$id === selectedId)) {
			return;
		}
		setSelectedId(pagedItems[0]?.$id ?? null);
	}, [filteredItems, pagedItems, selectedId]);

	const selected =
		filteredItems.find((item) => item.$id === selectedId) ?? null;

	const handleSave = async (
		input: CreateTemplateInput | UpdateTemplateInput,
	) => {
		setSaving(true);
		try {
			const isEdit = Boolean(editing);
			const response = await fetch(
				isEdit
					? `/api/contract-templates/${editing?.$id}`
					: "/api/contract-templates",
				{
					method: isEdit ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				},
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Could not save template");
			}
			setEditorOpen(false);
			setEditing(null);
			await load();
			toast({ title: isEdit ? "Template updated" : "Template created" });
		} catch (error) {
			toast({
				title: "Could not save template",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const handlePublish = async (template: ContractTemplate) => {
		try {
			const response = await fetch(`/api/contract-templates/${template.$id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "active" }),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Could not publish");
			}
			await load();
			toast({ title: "Template published" });
		} catch (error) {
			toast({
				title: "Could not publish",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const handleArchive = async (template: ContractTemplate) => {
		try {
			const response = await fetch(`/api/contract-templates/${template.$id}`, {
				method: "DELETE",
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Could not archive");
			}
			await load();
			toast({ title: "Template archived" });
		} catch (error) {
			toast({
				title: "Could not archive",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		}
	};

	const handleApply = async (contractName: string) => {
		if (!selected) return;
		setApplying(true);
		try {
			const response = await fetch(
				`/api/contract-templates/${selected.$id}/apply`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ contractName }),
				},
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) {
				throw new Error(body.error || "Could not create draft");
			}
			setApplyOpen(false);
			toast({ title: "Draft created" });
			router.push("/contracts/approvals");
		} catch (error) {
			toast({
				title: "Could not create draft",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setApplying(false);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-end">
				{!permissionsLoading && canCreate ? (
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => {
							setEditing(null);
							setEditorOpen(true);
						}}
					>
						<Plus className="h-4 w-4" />
						New template
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
							placeholder="Search templates…"
							aria-label="Search templates"
						/>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className={filterSelectClass}>
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All statuses</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="archived">Archived</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<div className="flex min-h-[calc(100vh-16rem)] flex-col gap-4 lg:flex-row">
				<Card className="glass-card flex min-h-0 flex-1 flex-col lg:max-w-[52%]">
					<div className="glass-card-cap" />
					<CardContent className="flex min-h-0 flex-1 flex-col p-0 pt-4">
						<div
							className={cn(
								LIST_GRID,
								"border-b border-slate-200 px-3 py-2 text-xs font-semibold sidebar-gradient-text",
							)}
						>
							<span>Title</span>
							<span>Type</span>
							<span>Status</span>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto">
							{loading ? (
								<p className="p-6 text-sm text-slate-600">Loading templates…</p>
							) : pagedItems.length === 0 ? (
								<div className="flex flex-col items-center gap-3 p-8 text-center">
									<FileText className="h-8 w-8 text-[#0f5384]" />
									<p className="text-sm font-medium text-slate-700">
										No matching templates
									</p>
									<p className="max-w-md text-sm text-slate-600">
										Build a template from published clauses, then use it to
										spawn a draft contract.
									</p>
								</div>
							) : (
								pagedItems.map((item) => {
									const selectedRow = item.$id === selectedId;
									const typeLabel =
										getContractTypeConfig(item.contractTypeId)?.label ||
										item.contractTypeId;
									return (
										<div
											key={item.$id}
											className={cn(
												LIST_GRID,
												"h-10 cursor-pointer overflow-hidden border-b border-slate-200/80 px-3 text-sm transition-colors duration-200",
												selectedRow ? "bg-blue-50" : "hover:bg-white/40",
											)}
											onClick={() => setSelectedId(item.$id)}
											onKeyDown={(event) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													setSelectedId(item.$id);
												}
											}}
											role="button"
											tabIndex={0}
										>
											<p className="truncate font-medium text-slate-700">
												{item.title}
											</p>
											<span
												className={`${CAALM_BADGE_BASE} max-w-full truncate justify-self-start bg-blue/10 text-blue border-blue/20`}
											>
												{typeLabel}
											</span>
											<span
												className={`${CAALM_BADGE_BASE} justify-self-start ${templateStatusBadgeClass(item.status as TemplateStatus)}`}
											>
												{templateStatusLabel(item.status as TemplateStatus)}
											</span>
										</div>
									);
								})
							)}
						</div>
						<div className="border-t border-slate-200 px-3 py-3">
							<PageIndex
								page={page}
								totalItems={totalItems}
								pageSize={PAGE_SIZE}
								onPageChange={setPage}
								showRange
								itemLabel="templates"
							/>
						</div>
					</CardContent>
				</Card>

				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					<TemplateLibraryDetail
						template={selected}
						clauses={clauses}
						ownerName={
							selected ? ownerNames[selected.createdBy] || "" : ""
						}
						canEdit={canEdit}
						canDelete={canDelete}
						canApply={canApply}
						onEdit={(item) => {
							setEditing(item);
							setEditorOpen(true);
						}}
						onPublish={(item) => void handlePublish(item)}
						onArchive={(item) => void handleArchive(item)}
						onApply={(item) => {
							setSelectedId(item.$id);
							setApplyOpen(true);
						}}
					/>
				</div>
			</div>

			<TemplateEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				template={editing}
				clauses={clauses}
				saving={saving}
				onSave={handleSave}
			/>
			<ApplyTemplateDialog
				open={applyOpen}
				onOpenChange={setApplyOpen}
				template={selected}
				applying={applying}
				onApply={handleApply}
			/>
		</div>
	);
}
