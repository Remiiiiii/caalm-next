"use client";

import { FileStack, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { CONTRACT_TYPE_CONFIGS } from "@/lib/contracts/contractTypeConfigs";
import type {
	ContractTemplate,
	CreateTemplateInput,
} from "@/types/contract-templates";

export function TemplateLibraryPage() {
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canCreate = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.CREATE);
	const canEdit = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.EDIT);
	const [items, setItems] = useState<ContractTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [editorOpen, setEditorOpen] = useState(false);
	const [editing, setEditing] = useState<ContractTemplate | null>(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const response = await fetch("/api/contract-templates");
			const body = await response.json().catch(() => ({}));
			if (!response.ok)
				throw new Error(body.error || "Could not load templates");
			setItems(body.items || []);
		} catch (error) {
			toast({
				title: "Could not load templates",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const visible = items.filter((item) => {
		if (item.status === "archived") return false;
		const q = search.trim().toLowerCase();
		if (!q) return true;
		return (
			item.name.toLowerCase().includes(q) ||
			item.description.toLowerCase().includes(q)
		);
	});

	const save = async (input: CreateTemplateInput) => {
		setSaving(true);
		try {
			const response = await fetch(
				editing
					? `/api/contract-templates/${editing.$id}`
					: "/api/contract-templates",
				{
					method: editing ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				},
			);
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.error || "Save failed");
			setEditorOpen(false);
			setEditing(null);
			await load();
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

	const typeLabel = Object.fromEntries(
		CONTRACT_TYPE_CONFIGS.map((row) => [row.id, row.label]),
	);

	return (
		<div>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-3">
				<SearchField
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder="Search templates..."
					containerClassName="max-w-md w-full"
				/>
				{canCreate && (
					<Button
						className="primary-btn cursor-pointer px-3 sm:px-4"
						onClick={() => {
							setEditing(null);
							setEditorOpen(true);
						}}
					>
						<Plus className="h-4 w-4" />
						New template
					</Button>
				)}
			</div>

			{loading && (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-40 w-full" />
					<Skeleton className="h-40 w-full" />
				</div>
			)}
			{!loading && visible.length === 0 && (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="flex flex-col items-center gap-2 p-4 py-12 text-center sm:p-6">
						<FileStack className="h-8 w-8 text-[#0f5384]" />
						<p className="text-sm text-slate-600">
							No templates yet. Build a recipe from the clause library.
						</p>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
				{visible.map((template) => (
					<Card key={template.$id} className="glass-card">
						<div className="glass-card-cap" />
						<CardContent className="space-y-3 p-4 sm:p-6">
							<div className="flex items-start justify-between gap-3">
								<p className="text-sm font-medium sidebar-gradient-text">
									{template.name}
								</p>
								<span
									className={
										template.status === "published"
											? "inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green"
											: "inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange"
									}
								>
									{template.status === "published" ? "Published" : "Draft"}
								</span>
							</div>
							<p className="text-sm text-slate-600">
								{template.description || "No description"}
							</p>
							<p className="text-xs text-slate-500">
								{typeLabel[template.contractType] || template.contractType} ·{" "}
								{template.clauseSlots.length} clauses
							</p>
							<div className="flex flex-wrap gap-2">
								{template.status === "published" && (
									<Button
										asChild
										className="primary-btn cursor-pointer px-3 sm:px-4"
									>
										<Link href={`/contracts/create?template=${template.$id}`}>
											Use template
										</Link>
									</Button>
								)}
								{canEdit && (
									<Button
										variant="outline"
										className="primary-btn cursor-pointer px-3 sm:px-4"
										onClick={() => {
											setEditing(template);
											setEditorOpen(true);
										}}
									>
										Edit
									</Button>
								)}
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			<TemplateEditorDialog
				open={editorOpen}
				onOpenChange={setEditorOpen}
				template={editing}
				saving={saving}
				onSave={save}
			/>
		</div>
	);
}
