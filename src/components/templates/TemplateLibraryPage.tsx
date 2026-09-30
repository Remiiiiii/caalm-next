"use client";

import { FileStack, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	ContractAgreementMatrix,
	type AgreementMatrixView,
} from "@/components/contract-wizard/ContractAgreementMatrix";
import { NewAgreementDialog } from "@/components/templates/NewAgreementDialog";
import { TemplateEditorDialog } from "@/components/templates/TemplateEditorDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchField } from "@/components/ui/search-field";
import { Skeleton } from "@/components/ui/skeleton";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type {
	ContractTemplate,
	CreateTemplateInput,
} from "@/types/contract-templates";

export function TemplateLibraryPage() {
	const router = useRouter();
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canCreate = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.CREATE);
	const canEdit = permissions.includes(PERMISSIONS.CONTRACT_TEMPLATES.EDIT);
	const [items, setItems] = useState<ContractTemplate[]>([]);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [newOpen, setNewOpen] = useState(false);
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

	const createAgreement = async (input: {
		name: string;
		description: string;
		contractType: string;
	}) => {
		setSaving(true);
		try {
			const response = await fetch("/api/contract-templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					...input,
					scratchAgreement: true,
					status: "draft",
				}),
			});
			const body = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(body.error || "Create failed");
			setNewOpen(false);
			await load();
			toast({ title: "Agreement template created" });
		} catch (error) {
			toast({
				title: "Could not create agreement",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

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

	const visible = items.filter((item) => item.status !== "archived");

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
						onClick={() => setNewOpen(true)}
					>
						<Plus className="h-4 w-4" />
						New agreement
					</Button>
				)}
			</div>

			{loading && (
				<div className="grid grid-cols-3 gap-6 xl:grid-cols-5">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton key={index} className="aspect-[8.5/11] w-full" />
					))}
				</div>
			)}

			{!loading && visible.length === 0 && (
				<Card className="glass-card">
					<div className="glass-card-cap" />
					<CardContent className="flex flex-col items-center gap-2 p-4 py-12 text-center sm:p-6">
						<FileStack className="h-8 w-8 text-[#0f5384]" />
						<p className="text-sm text-slate-600">
							No agreement templates yet. Create one with your organization
							letterhead and signature block.
						</p>
					</CardContent>
				</Card>
			)}

			{!loading && visible.length > 0 && (
				<>
					<ContractAgreementMatrix
						view={"templates" as AgreementMatrixView}
						blueprints={[]}
						templates={visible}
						onSelectBlueprint={() => {}}
						onSelectTemplate={(template) =>
							router.push(`/contracts/create?template=${template.$id}`)
						}
						query={search}
						onQueryChange={setSearch}
						searchPlaceholder="Search templates..."
						itemLabel="templates"
						manageTemplates={canEdit}
						onEditTemplate={(template) => {
							setEditing(template);
							setEditorOpen(true);
						}}
						templateUseLabel="Use on create contract"
					/>
				</>
			)}

			<NewAgreementDialog
				open={newOpen}
				onOpenChange={setNewOpen}
				saving={saving}
				onCreate={createAgreement}
			/>

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
