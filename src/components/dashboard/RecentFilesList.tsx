"use client";

import { File, FileText, FileUp, Film, Image, Music } from "lucide-react";
import { useMemo, useState } from "react";
import { DashboardCardFilter } from "@/components/dashboard/DashboardCardFilter";
import Thumbnail from "@/components/Thumbnail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileItemSkeleton } from "@/components/ui/skeletons";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { formatInTimezone } from "@/lib/timezone";
import { cn, convertFileSize, getFileType } from "@/lib/utils";

export type RecentFileItem = {
	$id: string;
	$createdAt: string;
	$updatedAt?: string;
	name: string;
	type?: string;
	extension?: string;
	size?: number;
	url?: string;
	versionNumber?: string | number;
};

export type RecentFileKind =
	| "document"
	| "image"
	| "video"
	| "audio"
	| "other";

export type RecentFileTypeFilter = RecentFileKind | "all";

const FILE_TYPE_OPTIONS = [
	{ value: "document" as const, label: "Documents", icon: FileText },
	{ value: "image" as const, label: "Images", icon: Image },
	{ value: "video" as const, label: "Videos", icon: Film },
	{ value: "audio" as const, label: "Audio", icon: Music },
	{ value: "other" as const, label: "Other", icon: File },
];

function resolveFileKind(file: RecentFileItem) {
	const fromName = getFileType(file.name || "");
	const type = (file.type || fromName.type || "other") as RecentFileKind;
	return {
		type,
		extension: (file.extension || fromName.extension || "").toLowerCase(),
	};
}

function parseVersionNumber(value: string | number | undefined): number | null {
	if (value == null || value === "") return null;
	const n = Number(String(value).replace(/^v/i, "").trim());
	return Number.isFinite(n) && n > 1 ? n : null;
}

/** Filename clues like `_v2.pdf` or `License v3.docx`. */
function versionFromName(name: string): number | null {
	const match = name.match(/(?:^|[_\-\s.(])v(\d+)(?=[)._\-\s.]|$)/i);
	if (!match) return null;
	const n = Number(match[1]);
	return n > 1 ? n : null;
}

function wasFileUpdated(file: RecentFileItem): boolean {
	if (!file.$updatedAt || !file.$createdAt) return false;
	return (
		new Date(file.$updatedAt).getTime() - new Date(file.$createdAt).getTime() >
		2000
	);
}

function versionLabel(
	file: RecentFileItem,
	occurrence: number,
): string | null {
	const explicit =
		parseVersionNumber(file.versionNumber) ?? versionFromName(file.name);
	if (explicit) return `v${explicit}`;
	if (occurrence > 1) return `v${occurrence}`;
	if (wasFileUpdated(file)) return "v2";
	return null;
}

function countNameOccurrences(files: RecentFileItem[]) {
	const occurrenceById = new Map<string, number>();
	const counts = new Map<string, number>();
	[...files]
		.sort(
			(a, b) =>
				new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime(),
		)
		.forEach((file) => {
			const key = file.name.trim().toLowerCase();
			const next = (counts.get(key) || 0) + 1;
			counts.set(key, next);
			occurrenceById.set(file.$id, next);
		});
	return occurrenceById;
}

interface RecentFilesListProps {
	files: RecentFileItem[];
	limit?: number;
	typeFilter?: RecentFileTypeFilter;
}

export function RecentFilesList({
	files,
	limit = 10,
	typeFilter = "all",
}: RecentFilesListProps) {
	const timeZone = useOrgTimezone();
	const filtered =
		typeFilter === "all"
			? files
			: files.filter((file) => resolveFileKind(file).type === typeFilter);
	const visible = filtered.slice(0, limit);
	const occurrenceById = countNameOccurrences(visible);

	if (filtered.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-slate-600">
				{files.length === 0
					? "No files uploaded"
					: "No files match this filter"}
			</p>
		);
	}

	return (
		<div className="max-h-[400px] space-y-3 overflow-y-auto pr-2">
			{visible.map((file) => {
				const { type, extension } = resolveFileKind(file);
				const version = versionLabel(
					file,
					occurrenceById.get(file.$id) || 1,
				);
				const uploaded = formatInTimezone(
					file.$createdAt,
					"d MMM, h:mm aa",
					timeZone,
				);

				return (
					<div
						key={file.$id}
						className="rounded-lg border border-white/30 bg-white/20 p-3 shadow-sm backdrop-blur-md"
					>
						<div className="flex items-start justify-between gap-3">
							<div className="flex min-w-0 flex-1 items-center gap-3">
								<Thumbnail
									iconOnly
									type={type}
									extension={extension}
									url={file.url || ""}
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-slate-700">
										{file.name}
									</p>
									<p className="mt-1 text-xs text-slate-600">
										{convertFileSize({ sizeInBytes: file.size })}
										{" · "}
										{uploaded}
									</p>
								</div>
							</div>
							{version ? (
								<span className="inline-block shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
									{version}
								</span>
							) : null}
						</div>
					</div>
				);
			})}
			{filtered.length > limit && (
				<div className="py-2 text-center">
					<p className="text-xs text-slate-500">
						+{filtered.length - limit} more files
					</p>
				</div>
			)}
		</div>
	);
}

interface RecentFilesUploadedCardProps {
	files?: RecentFileItem[];
	isLoading?: boolean;
	limit?: number;
	className?: string;
	showCap?: boolean;
}

export function RecentFilesUploadedCard({
	files = [],
	isLoading = false,
	limit = 10,
	className,
	showCap = true,
}: RecentFilesUploadedCardProps) {
	const [typeFilter, setTypeFilter] = useState<RecentFileTypeFilter>("all");

	const filterButton = useMemo(
		() => (
			<DashboardCardFilter
				label="Filter by file type"
				options={FILE_TYPE_OPTIONS}
				selected={typeFilter}
				onChange={setTypeFilter}
			/>
		),
		[typeFilter],
	);

	return (
		<Card className={cn(className)}>
			{showCap ? <div className="glass-card-cap" /> : null}
			<CardHeader className="mb-4 border-b border-slate-200/80 pb-4">
				<div className="flex items-center justify-between gap-3">
					<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
						<StatCardIcon icon={FileUp} />
						Recent Files Uploaded
					</CardTitle>
					{filterButton}
				</div>
			</CardHeader>
			<CardContent className="pt-0">
				{isLoading ? (
					<div className="space-y-4">
						{[1, 2, 3].map((i) => (
							<FileItemSkeleton key={i} />
						))}
					</div>
				) : (
					<RecentFilesList
						files={files}
						limit={limit}
						typeFilter={typeFilter}
					/>
				)}
			</CardContent>
		</Card>
	);
}
