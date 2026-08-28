"use client";

import { Archive, CircleCheck, FilePlus, FileText, Pencil } from "lucide-react";
import Image from "next/image";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { CAALM_BADGE_BASE } from "@/components/clauses/ClauseEditorDialog";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { getContractTypeConfig } from "@/lib/contracts/contractTypeConfigs";
import { formatDateTime } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import type { ContractTemplate } from "@/types/contract-templates";
import {
	templateStatusBadgeClass,
	templateStatusLabel,
} from "./TemplateEditorDialog";

type TemplateLibraryDetailProps = {
	template: ContractTemplate | null;
	clauses: Clause[];
	ownerName: string;
	canEdit: boolean;
	canDelete: boolean;
	canApply: boolean;
	onEdit: (template: ContractTemplate) => void;
	onPublish: (template: ContractTemplate) => void;
	onArchive: (template: ContractTemplate) => void;
	onApply: (template: ContractTemplate) => void;
};

export function TemplateLibraryDetail({
	template,
	clauses,
	ownerName,
	canEdit,
	canDelete,
	canApply,
	onEdit,
	onPublish,
	onArchive,
	onApply,
}: TemplateLibraryDetailProps) {
	const timeZone = useOrgTimezone();
	const showMenu =
		Boolean(template) &&
		(canEdit ||
			canApply ||
			(canDelete && template?.status !== "archived"));

	if (!template) {
		return (
			<Card className="glass-card flex min-h-0 flex-1 flex-col">
				<div className="glass-card-cap" />
				<CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-4 pt-8 text-center sm:p-6 sm:pt-8">
					<FileText className="h-8 w-8 text-[#0f5384]" />
					<p className="text-sm font-medium text-slate-700">
						Select a template
					</p>
					<p className="max-w-sm text-sm text-slate-600">
						Pick a row on the left to see the clause stack and create a draft.
					</p>
				</CardContent>
			</Card>
		);
	}

	const typeLabel =
		getContractTypeConfig(template.contractTypeId)?.label ||
		template.contractTypeId;
	const stacked = template.clauseRefs
		.slice()
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((ref) => clauses.find((clause) => clause.familyId === ref.familyId));

	return (
		<Card className="glass-card flex min-h-0 flex-1 flex-col">
			<div className="glass-card-cap" />
			<CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-8 sm:p-6 sm:pt-8">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-lg font-semibold sidebar-gradient-text">
								{template.title}
							</h2>
							<span
								className={`${CAALM_BADGE_BASE} bg-blue/10 text-blue border-blue/20`}
							>
								{typeLabel}
							</span>
							<span
								className={`${CAALM_BADGE_BASE} ${templateStatusBadgeClass(template.status)}`}
							>
								{templateStatusLabel(template.status)}
							</span>
						</div>
						<p className="text-xs text-slate-500">
							Last modified {formatDateTime(template.$updatedAt, timeZone)}
							{ownerName ? ` · Owner ${ownerName}` : null}
						</p>
					</div>
					{showMenu ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								className="shad-no-focus shrink-0 rounded-full transition-colors hover:bg-white/30"
								aria-label={`Actions for ${template.title}`}
							>
								<Image
									src="/assets/icons/dots.svg"
									alt=""
									width={34}
									height={34}
								/>
							</DropdownMenuTrigger>
							<AppDropdownMenuContent align="end">
								{canApply && template.status === "active" ? (
									<AppDropdownMenuItem
										icon={FilePlus}
										onClick={() => onApply(template)}
									>
										Use template
									</AppDropdownMenuItem>
								) : null}
								{canEdit ? (
									<AppDropdownMenuItem
										icon={Pencil}
										onClick={() => onEdit(template)}
									>
										Edit
									</AppDropdownMenuItem>
								) : null}
								{canEdit && template.status === "draft" ? (
									<AppDropdownMenuItem
										icon={CircleCheck}
										onClick={() => onPublish(template)}
									>
										Publish
									</AppDropdownMenuItem>
								) : null}
								{canDelete && template.status !== "archived" ? (
									<>
										<DropdownMenuSeparator />
										<AppDropdownMenuItem
											icon={Archive}
											tone="danger"
											onClick={() => onArchive(template)}
										>
											Archive
										</AppDropdownMenuItem>
									</>
								) : null}
							</AppDropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>

				{template.description ? (
					<p className="mt-4 text-sm text-slate-600">{template.description}</p>
				) : null}

				<section className="mt-6 space-y-2">
					<h3 className="text-sm font-medium sidebar-gradient-text">
						Clause stack
					</h3>
					<div className="space-y-2">
						{stacked.map((clause, index) => (
							<div
								key={template.clauseRefs[index]?.familyId || index}
								className="rounded-lg border border-slate-200 bg-white p-4"
							>
								<p className="text-sm font-medium text-slate-700">
									{index + 1}. {clause?.title || "Missing active clause"}
								</p>
								{clause ? (
									<p className="mt-1 text-xs text-slate-500">
										{clause.category} · v{clause.version}
									</p>
								) : (
									<p className="mt-1 text-xs text-red">
										Publish this clause before using the template.
									</p>
								)}
							</div>
						))}
					</div>
				</section>
			</CardContent>
		</Card>
	);
}
