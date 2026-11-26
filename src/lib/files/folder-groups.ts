import type { UIFileDoc } from "@/types/files";

/** Department-less files land in one shared bucket rather than disappearing from folder view. */
export const UNFILED_DEPARTMENT = "Unfiled";

export interface FileFolderGroup {
	/** The department name, or `UNFILED_DEPARTMENT` for files with none set. */
	department: string;
	files: UIFileDoc[];
	count: number;
	/** Most recent `$updatedAt`/`$createdAt` across the group's files, for the "Modified" column. */
	lastModifiedAt: string | null;
	/** Uploader name of whichever file produced `lastModifiedAt`, for the "By" column. */
	lastModifiedBy: string;
}

function ownerName(owner: UIFileDoc["owner"]): string {
	if (!owner) return "—";
	if (typeof owner === "string") return owner;
	return owner.fullName || "—";
}

function fileTimestamp(file: UIFileDoc): string {
	return file.$updatedAt || file.$createdAt || "";
}

/**
 * Groups a flat file list into one row per department (the "folder table"
 * view). Call with the full, unpaginated file list for the current /[type]
 * route — pagination happens one level down, inside a single department.
 */
export function groupFilesByDepartment(files: UIFileDoc[]): FileFolderGroup[] {
	const buckets = new Map<string, UIFileDoc[]>();
	for (const file of files) {
		const department = file.department?.trim() || UNFILED_DEPARTMENT;
		const bucket = buckets.get(department);
		if (bucket) {
			bucket.push(file);
		} else {
			buckets.set(department, [file]);
		}
	}

	const groups: FileFolderGroup[] = [];
	for (const [department, bucketFiles] of buckets) {
		let newest: UIFileDoc | null = null;
		for (const file of bucketFiles) {
			if (!newest || fileTimestamp(file) > fileTimestamp(newest)) {
				newest = file;
			}
		}
		groups.push({
			department,
			files: bucketFiles,
			count: bucketFiles.length,
			lastModifiedAt: newest ? fileTimestamp(newest) || null : null,
			lastModifiedBy: newest ? ownerName(newest.owner) : "—",
		});
	}

	// Named departments first (alphabetical), "Unfiled" always last.
	groups.sort((a, b) => {
		if (a.department === UNFILED_DEPARTMENT) return 1;
		if (b.department === UNFILED_DEPARTMENT) return -1;
		return a.department.localeCompare(b.department);
	});
	return groups;
}
