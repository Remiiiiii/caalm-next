"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import FilesBulkBar from "@/components/FilesBulkBar";
import FilesTableView from "@/components/FilesTableView";
import {
	FilesViewToggle,
	type FilesViewType,
} from "@/components/FilesViewToggle";
import Sort from "@/components/Sort";
import { PageIndex } from "@/components/ui/page-index";
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
	const [view, setView] = useState<FilesViewType>("card");
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [currentPage, setCurrentPage] = useState(1);

	useEffect(() => {
		const saved = localStorage.getItem(VIEW_STORAGE_KEY);
		if (saved === "table" || saved === "card") {
			setView(saved);
		}
	}, []);

	useEffect(() => {
		const valid = new Set(files.map((f) => f.$id));
		setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
	}, [files]);

	const totalPages = Math.max(1, Math.ceil(files.length / TABLE_PAGE_SIZE));

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
	}, [files.length]);

	const paginatedFiles = useMemo(() => {
		const start = (validCurrentPage - 1) * TABLE_PAGE_SIZE;
		return files.slice(start, start + TABLE_PAGE_SIZE);
	}, [files, validCurrentPage]);

	const handleViewChange = useCallback((next: FilesViewType) => {
		setView(next);
		localStorage.setItem(VIEW_STORAGE_KEY, next);
		setCurrentPage(1);
		if (next === "card") {
			setSelectedIds([]);
		}
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

			{files.length > 0 ? (
				view === "table" ? (
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
							totalItems={files.length}
							pageSize={TABLE_PAGE_SIZE}
							onPageChange={setCurrentPage}
							hideWhenSinglePage
							scrollToTop
							aria-label="Files pagination"
						/>
					</>
				) : (
					<section className="file-list mb-6">
						{files.map((file) => (
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
				)
			) : (
				<div className="flex flex-col items-center justify-center px-4 py-12 text-center">
					<Image
						src="/assets/icons/no-data.svg"
						alt={emptyAlt}
						width={250}
						height={250}
						className="mx-auto mb-4 opacity-60"
					/>
					<p className="body-1 text-slate-700">{emptyMessage}</p>
				</div>
			)}

			{view === "table" && (
				<FilesBulkBar
					files={files}
					selectedIds={selectedIds}
					onClearSelection={clearSelection}
				/>
			)}
		</>
	);
}
