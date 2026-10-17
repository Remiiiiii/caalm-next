"use client";

import {
	Calendar,
	ClipboardList,
	FileText,
	Shield,
} from "lucide-react";
import type { TaskLinkedEntityType } from "@/types/tasks";
import { cn } from "@/lib/utils";
import {
	CAALM_BADGE_BASE,
	TASK_LINKED_BADGE,
	linkedEntityIconHint,
} from "./task-ui";

function LinkedIcon({
	type,
}: {
	type?: TaskLinkedEntityType | null;
}) {
	const hint = linkedEntityIconHint(type);
	const className = "h-3 w-3 shrink-0";
	switch (hint) {
		case "contract":
			return <FileText className={className} aria-hidden />;
		case "license":
			return <Shield className={className} aria-hidden />;
		case "audit":
			return <ClipboardList className={className} aria-hidden />;
		case "calendar":
			return <Calendar className={className} aria-hidden />;
		default:
			return <FileText className={className} aria-hidden />;
	}
}

export function TaskLinkedChip({
	title,
	linkedEntityType,
}: {
	title?: string;
	linkedEntityType?: TaskLinkedEntityType | null;
}) {
	if (!title) {
		return <span className="text-xs text-slate-400">—</span>;
	}

	return (
		<span
			className={cn(CAALM_BADGE_BASE, TASK_LINKED_BADGE)}
			title={title}
		>
			<LinkedIcon type={linkedEntityType} />
			<span>{title}</span>
		</span>
	);
}
