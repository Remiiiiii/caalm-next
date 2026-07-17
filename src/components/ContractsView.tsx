"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import ContractPreviewSheet from "@/components/ContractPreviewSheet";
import { useContractsView } from "@/components/ContractsViewContext";
import type { UIFileDoc } from "@/types/files";
import ContractsPagination from "./ContractsPagination";
import ContractsTableView from "./ContractsTableView";

export {
	ContractsViewProvider,
	useContractsView,
	useContractsFilter,
} from "@/components/ContractsViewContext";
export type {
	ContractFilters,
	StatusTab,
	DensityMode,
	ViewType,
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
			<div className="text-center py-12">
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
					{files.length > itemsPerPage && (
						<ContractsPagination
							currentPage={validCurrentPage}
							totalPages={totalPages}
							onPageChange={setCurrentPage}
						/>
					)}
				</>
			) : (
				<>
					<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 p-4 sm:p-6">
						{paginatedFiles.map((file: UIFileDoc) => (
							<Card
								key={file.$id}
								file={file}
								status={file.status}
								expirationDate={file.contractExpiryDate}
								userRole={user?.role as "executive" | "admin" | "manager"}
								onRefresh={onRefresh}
								onPreview={() => setPreviewFile(file)}
							/>
						))}
					</section>
					{files.length > itemsPerPage && (
						<ContractsPagination
							currentPage={validCurrentPage}
							totalPages={totalPages}
							onPageChange={setCurrentPage}
						/>
					)}
				</>
			)}
			<ContractPreviewSheet
				file={previewFile}
				open={Boolean(previewFile)}
				onOpenChange={(open) => {
					if (!open) setPreviewFile(null);
				}}
			/>
		</>
	);
}
