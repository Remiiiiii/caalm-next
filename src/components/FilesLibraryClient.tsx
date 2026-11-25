"use client";

import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import FilesBulkBar from "@/components/FilesBulkBar";
import FilesFolderTableView from "@/components/FilesFolderTableView";
import FilesTableView from "@/components/FilesTableView";
import {
	FilesViewToggle,
	type FilesViewType,
} from "@/components/FilesViewToggle";
import Sort from "@/components/Sort";
import { PageIndex } from "@/components/ui/page-index";
import { groupFilesByDepartment } from "@/lib/files/folder-groups";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

const VIEW_STORAGE_KEY = "caalm-files-library-view";
const TABLE_PAGE_SIZE = 10;

interface FilesLibraryClientProps {
	files: UIFileDoc[];
	totalSizeFormatted: string;
	emptyMessage: string;
	emptyAlt: string;
	user: { role?: string } | null;
}

export default function FilesLibraryClient({
	files,
	totalSizeFormatted,
	emptyMessage,
	emptyAlt,
	user,
}: FilesLibraryClientProps) {
	const router = useRouter();
	// New installs land on the folder table (this phase's primary surface);
	// returning users keep whatever they last picked, read from storage below.
	const [view, setView] = useState<FilesViewType>("folders");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [currentPage, setCurrentPage] = useState(1);
	const [selectedDepartment, setSelectedDepartment] = useState<string | null>(
		null,
	);
	const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

	useEffect(() => {
		const saved = localStorage.getItem(VIEW_STORAGE_KEY);
		if (saved === "table" || saved === "card" || saved === "folders") {
			setView(saved);
		}
	}, []);

	useEffect(() => {
		const valid = new Set(files.map((f) => f.$id));
		setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
	}, [files]);

	const folderGroups = useMemo(() => groupFilesByDepartment(files), [files]);

	useEffect(() => {
		const valid = new Set(folderGroups.map((g) => g.department));
		setSelectedFolderIds((prev) => prev.filter((d) => valid.has(d)));
		if (selectedDepartment && !valid.has(selectedDepartment)) {
			setSelectedDepartment(null);
		}
	}, [folderGroups, selectedDepartment]);

	/** The file list currently on screen: every file, or just one department's once drilled in via the folder view. */
	const scopedFiles = useMemo(() => {
		if (view !== "folders" || !selectedDepartment) return files;
		return (
			folderGroups.find((g) => g.department === selectedDepartment)?.files ?? []
		);
	}, [files, folderGroups, view, selectedDepartment]);

	const totalPages = Math.max(
		1,
		Math.ceil(scopedFiles.length / TABLE_PAGE_SIZE),
	);

	const validCurrentPage = useMemo(
		() => Math.min(Math.max(1, currentPage), totalPages),
		[currentPage, totalPages],
	);

	useEffect(() => {
		if (currentPage !== validCurrentPage) {
			setCurrentPage(validCurrentPage);
		}
	}, [currentPage, validCurrentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [scopedFiles.length]);

	const paginatedFiles = useMemo(() => {
		const start = (validCurrentPage - 1) * TABLE_PAGE_SIZE;
		return scopedFiles.slice(start, start + TABLE_PAGE_SIZE);
	}, [scopedFiles, validCurrentPage]);

	const handleViewChange = useCallback((next: FilesViewType) => {
		setView(next);
		localStorage.setItem(VIEW_STORAGE_KEY, next);
		setCurrentPage(1);
		setSelectedDepartment(null);
		if (next === "card") {
			setSelectedIds([]);
		}
	}, []);

	const openFolder = useCallback((department: string) => {
		setSelectedDepartment(department);
		setCurrentPage(1);
		setSelectedIds([]);
	}, []);

	const backToFolders = useCallback(() => {
		setSelectedDepartment(null);
		setCurrentPage(1);
		setSelectedIds([]);
	}, []);

	const toggleFolderSelected = useCallback((department: string) => {
		setSelectedFolderIds((prev) =>
			prev.includes(department)
				? prev.filter((d) => d !== department)
				: [...prev, department],
		);
	}, []);

	const toggleFolderSelectAll = useCallback((departments: string[]) => {
		setSelectedFolderIds((prev) => {
			const allSelected =
				departments.length > 0 && departments.every((d) => prev.includes(d));
			if (allSelected) {
				return prev.filter((d) => !departments.includes(d));
			}
			return Array.from(new Set([...prev, ...departments]));
		});
	}, []);

	const toggleSelected = useCallback((id: string) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	}, []);

	const toggleSelectAll = useCallback((ids: string[]) => {
		setSelectedIds((prev) => {
			const allSelected =
				ids.length > 0 && ids.every((id) => prev.includes(id));
			if (allSelected) {
				return prev.filter((id) => !ids.includes(id));
			}
			return Array.from(new Set([...prev, ...ids]));
		});
	}, []);

	const clearSelection = useCallback(() => setSelectedIds([]), []);

	const onRefresh = useCallback(() => {
		router.refresh();
	}, [router]);

	const userRole = user?.role as "executive" | "admin" | "manager" | undefined;

	return (
		<>
			<section className="mb-6 w-full">
				<div className="total-size-section">
					<p className="body-1">
						Total: <span className="h5">{totalSizeFormatted}</span>
					</p>

					<div className="sort-container">
						<p className="body-1 hidden text-light-200 sm:block">Sort by:</p>
						<Sort />
						<FilesViewToggle view={view} onViewChange={handleViewChange} />
					</div>
				</div>
			</section>

			{view === "folders" && !selectedDepartment ? (
				<section className="mb-6 w-full overflow-hidden rounded-lg border border-slate-200 bg-white/40 shadow-sm">
					<FilesFolderTableView
						groups={folderGroups}
						selectedDepartments={selectedFolderIds}
						onToggleSelected={toggleFolderSelected}
						onToggleSelectAll={toggleFolderSelectAll}
						onOpenFolder={openFolder}
					/>
				</section>
			) : scopedFiles.length > 0 ? (
				<>
					{view === "folders" && selectedDepartment && (
						<button
							type="button"
							onClick={backToFolders}
							className={cn(
								"mb-4 inline-flex items-center gap-1 text-sm font-medium text-[#078fab] hover:underline",
							)}
						>
							<ChevronLeft className="h-4 w-4" aria-hidden />
							All folders / {selectedDepartment}
						</button>
					)}
					{view === "card" ? (
						<section className="file-list mb-6">
							{scopedFiles.map((file) => (
								<Card
									key={file.$id}
									file={file}
									status={file.status}
									expirationDate={file.contractExpiryDate}
									userRole={userRole}
									onRefresh={onRefresh}
								/>
							))}
						</section>
					) : (
						<>
							<section className="mb-6 w-full overflow-hidden rounded-lg border border-slate-200 bg-white/40 shadow-sm">
								<FilesTableView
									files={paginatedFiles}
									selectedIds={selectedIds}
									onToggleSelected={toggleSelected}
									onToggleSelectAll={toggleSelectAll}
									userRole={userRole}
									onRefresh={onRefresh}
								/>
							</section>
							<PageIndex
								className="mt-6 justify-center"
								page={validCurrentPage}
								totalItems={scopedFiles.length}
								pageSize={TABLE_PAGE_SIZE}
								onPageChange={setCurrentPage}
								hideWhenSinglePage
								scrollToTop
								aria-label="Files pagination"
							/>
						</>
					)}
				</>
			) : (
				<div className="flex flex-col items-center justify-center px-4 py-12 text-center">
					<Image
						src="/assets/icons/no-data.svg"
						alt={emptyAlt}
						width={250}
						height={250}
						className="mx-auto mb-4 opacity-60"
					/>
					<p className="body-1 text-slate-700">
						{view === "folders" && selectedDepartment
							? `No files in ${selectedDepartment} yet.`
							: emptyMessage}
					</p>
				</div>
			)}

			{(view === "table" || (view === "folders" && selectedDepartment)) && (
				<FilesBulkBar
					files={scopedFiles}
					selectedIds={selectedIds}
					onClearSelection={clearSelection}
				/>
			)}
		</>
	);
}
