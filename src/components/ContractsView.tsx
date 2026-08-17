"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import ContractPreviewSheet from "@/components/ContractPreviewSheet";
import { useContractsView } from "@/components/ContractsViewContext";
import EqualHeightGrid from "@/components/EqualHeightGrid";
import { PageIndex } from "@/components/ui/page-index";
import type { UIFileDoc } from "@/types/files";
import ContractsTableView from "./ContractsTableView";

export type {
	ContractFilters,
	DensityMode,
	StatusTab,
	ViewType,
} from "@/components/ContractsViewContext";
export {
	ContractsViewProvider,
	useContractsFilter,
	useContractsView,
} from "@/components/ContractsViewContext";

interface ContractsViewProps {
	files: UIFileDoc[];
	user: {
		role?: string;
	} | null;
	onRefresh?: () => void;
}

export default function ContractsView({
	files,
	user,
	onRefresh,
}: ContractsViewProps) {
	const { view, density, previewFile, setPreviewFile } = useContractsView();
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = density === "compact" ? 20 : 12;

	useEffect(() => {
		setCurrentPage(1);
	}, [files.length, density]);

	const totalPages = Math.max(1, Math.ceil(files.length / itemsPerPage));

	const validCurrentPage = useMemo(() => {
		return Math.min(Math.max(1, currentPage), totalPages);
	}, [currentPage, totalPages]);

	useEffect(() => {
		if (totalPages > 0 && (currentPage > totalPages || currentPage < 1)) {
			setCurrentPage(Math.min(Math.max(1, currentPage), totalPages));
		}
	}, [totalPages, currentPage]);

	const startIndex = (validCurrentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const paginatedFiles = useMemo(
		() => files.slice(startIndex, endIndex),
		[files, startIndex, endIndex],
	);

	if (view === "card" && files.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-12 px-4">
				<Image
					src="/assets/icons/no-data.svg"
					alt="No contracts found"
					width={250}
					height={250}
					className="mx-auto mb-4"
				/>
				<p className="body-1 text-slate-700">No contracts found</p>
			</div>
		);
	}

	return (
		<>
			{view === "table" ? (
				<>
					<ContractsTableView
						files={paginatedFiles}
						allVisibleIds={paginatedFiles.map((f) => f.$id)}
						user={user}
						onRefresh={onRefresh}
					/>
					<PageIndex
						className="mt-6 justify-center"
						page={validCurrentPage}
						totalItems={files.length}
						pageSize={itemsPerPage}
						onPageChange={setCurrentPage}
						hideWhenSinglePage
						scrollToTop
						aria-label="Contracts pagination"
					/>
				</>
			) : (
				<>
					<EqualHeightGrid className="grid w-full min-w-0 grid-cols-1 gap-6 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
						{paginatedFiles.map((file: UIFileDoc) => (
							<div key={file.$id} className="min-w-0 h-full">
								<Card
									file={file}
									status={file.status}
									expirationDate={file.contractExpiryDate}
									userRole={user?.role as "executive" | "admin" | "manager"}
									onRefresh={onRefresh}
									onPreview={() => setPreviewFile(file)}
								/>
							</div>
						))}
					</EqualHeightGrid>
					<PageIndex
						className="mt-6 justify-center"
						page={validCurrentPage}
						totalItems={files.length}
						pageSize={itemsPerPage}
						onPageChange={setCurrentPage}
						hideWhenSinglePage
						scrollToTop
						aria-label="Contracts pagination"
					/>
				</>
			)}
			<ContractPreviewSheet
				file={previewFile}
				open={Boolean(previewFile)}
				onOpenChange={(open) => {
					if (!open) setPreviewFile(null);
				}}
				onUpdated={onRefresh}
			/>
		</>
	);
}
