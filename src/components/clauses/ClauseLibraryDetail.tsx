"use client";

import { Archive, CircleCheck, FileText, Pencil } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { formatDateTime } from "@/lib/utils";
import type { Clause } from "@/types/clauses";
import {
	CAALM_BADGE_BASE,
	clauseCategoryLabel,
	clauseStatusBadgeClass,
	clauseStatusLabel,
} from "./ClauseEditorDialog";
import { ClauseVersionHistory } from "./ClauseVersionHistory";

type ClauseLibraryDetailProps = {
	clause: Clause | null;
	ownerName: string;
	canEdit: boolean;
	canDelete: boolean;
	onEdit: (clause: Clause) => void;
	onPublish: (clause: Clause) => void;
	onArchive: (clause: Clause) => void;
};

export function ClauseLibraryDetail({
	clause,
	ownerName,
	canEdit,
	canDelete,
	onEdit,
	onPublish,
	onArchive,
}: ClauseLibraryDetailProps) {
	const timeZone = useOrgTimezone();
	const [templateCount, setTemplateCount] = useState<number | null>(null);

	useEffect(() => {
		if (!clause) {
			setTemplateCount(null);
			return;
		}
		let cancelled = false;
		void fetch(
			`/api/contract-templates?familyId=${encodeURIComponent(clause.familyId)}`,
		)
			.then(async (response) => {
				if (!response.ok) return;
				const body = await response.json().catch(() => ({}));
				if (cancelled) return;
				setTemplateCount(Array.isArray(body.items) ? body.items.length : 0);
			})
			.catch(() => {
				if (!cancelled) setTemplateCount(null);
			});
		return () => {
			cancelled = true;
		};
	}, [clause?.familyId]);

	const showMenu =
		Boolean(clause) &&
		(canEdit || (canDelete && clause?.status !== "archived"));

	if (!clause) {
		return (
			<Card className="glass-card flex min-h-0 flex-1 flex-col">
				<div className="glass-card-cap" />
				<CardContent className="flex flex-1 flex-col items-center justify-center gap-3 p-4 pt-8 text-center sm:p-6 sm:pt-8">
					<FileText className="h-8 w-8 text-[#0f5384]" />
					<p className="text-sm font-medium text-slate-700">
						Select a clause
					</p>
					<p className="max-w-sm text-sm text-slate-600">
						Pick a row on the left to read the full wording, history, and
						actions.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="glass-card flex min-h-0 flex-1 flex-col">
			<div className="glass-card-cap" />
			<CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 pt-8 sm:p-6 sm:pt-8">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0 space-y-2">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="text-lg font-semibold sidebar-gradient-text">
								{clause.title}
							</h2>
							<span
								className={`${CAALM_BADGE_BASE} bg-blue/10 text-blue border-blue/20`}
							>
								{clauseCategoryLabel(clause.category)}
							</span>
							<span
								className={`${CAALM_BADGE_BASE} bg-slate-100 text-slate-600 border-slate-200`}
							>
								v{clause.version}
							</span>
							<span
								className={`${CAALM_BADGE_BASE} ${clauseStatusBadgeClass(clause.status)}`}
							>
								{clauseStatusLabel(clause.status)}
							</span>
						</div>
						<p className="text-xs text-slate-500">
							Last modified {formatDateTime(clause.$updatedAt, timeZone)}
							{ownerName ? ` · Owner ${ownerName}` : null}
						</p>
					</div>
					{showMenu ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								className="shad-no-focus shrink-0 rounded-full transition-colors hover:bg-white/30"
								aria-label={`Actions for ${clause.title}`}
							>
								<Image
									src="/assets/icons/dots.svg"
									alt=""
									width={34}
									height={34}
								/>
							</DropdownMenuTrigger>
							<AppDropdownMenuContent align="end">
								{canEdit ? (
									<AppDropdownMenuItem
										icon={Pencil}
										onClick={() => onEdit(clause)}
									>
										Edit
									</AppDropdownMenuItem>
								) : null}
								{canEdit && clause.status === "draft" ? (
									<AppDropdownMenuItem
										icon={CircleCheck}
										onClick={() => onPublish(clause)}
									>
										Publish
									</AppDropdownMenuItem>
								) : null}
								{canDelete && clause.status !== "archived" ? (
									<>
										<DropdownMenuSeparator />
										<AppDropdownMenuItem
											icon={Archive}
											tone="danger"
											onClick={() => onArchive(clause)}
										>
											Archive
										</AppDropdownMenuItem>
									</>
								) : null}
							</AppDropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>

				<section className="mt-6 space-y-2">
					<h3 className="text-sm font-medium sidebar-gradient-text">
						Clause text
					</h3>
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<p className="whitespace-pre-wrap text-sm text-slate-700">
							{clause.body}
						</p>
					</div>
				</section>

				<div className="mt-6">
					<ClauseVersionHistory
						variant="embedded"
						familyId={clause.familyId}
					/>
				</div>

				<section className="mt-6 space-y-2">
					<h3 className="text-sm font-medium sidebar-gradient-text">Usage</h3>
					<div className="rounded-lg border border-slate-200 bg-white p-4">
						<p className="text-sm text-slate-600">
							{templateCount == null
								? "Template usage appears here when you can view contract templates."
								: templateCount === 0
									? "No templates use this clause yet."
									: `Used in ${templateCount} ${templateCount === 1 ? "template" : "templates"}.`}
						</p>
					</div>
				</section>
			</CardContent>
		</Card>
	);
}
