"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { matchesStatusTab } from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";
import ContractsBulkBar from "./ContractsBulkBar";
import ContractsView, { useContractsView } from "./ContractsView";

interface ContractsViewClientProps {
	files: UIFileDoc[];
	user: {
		role?: string;
	} | null;
}

export default function ContractsViewClient({
	files,
	user,
}: ContractsViewClientProps) {
	const router = useRouter();
	const { filters, statusTab } = useContractsView();

	const handleRefresh = () => {
		router.refresh();
	};

	const filteredFiles = useMemo(() => {
		return files.filter((file: UIFileDoc) => {
			if (!matchesStatusTab(file, statusTab)) return false;

			if (filters.status && file.status !== filters.status) {
				return false;
			}

			if (filters.uploadedOnFrom || filters.uploadedOnTo) {
				const uploadedDate = file.$createdAt ? new Date(file.$createdAt) : null;
				if (!uploadedDate) return false;

				if (filters.uploadedOnFrom) {
					const fromDate = new Date(filters.uploadedOnFrom);
					fromDate.setHours(0, 0, 0, 0);
					if (uploadedDate < fromDate) return false;
				}

				if (filters.uploadedOnTo) {
					const toDate = new Date(filters.uploadedOnTo);
					toDate.setHours(23, 59, 59, 999);
					if (uploadedDate > toDate) return false;
				}
			}

			if (filters.expiresOnFrom || filters.expiresOnTo) {
				const expiryDate = file.contractExpiryDate
					? new Date(file.contractExpiryDate)
					: null;
				if (!expiryDate) return false;

				if (filters.expiresOnFrom) {
					const fromDate = new Date(filters.expiresOnFrom);
					fromDate.setHours(0, 0, 0, 0);
					if (expiryDate < fromDate) return false;
				}

				if (filters.expiresOnTo) {
					const toDate = new Date(filters.expiresOnTo);
					toDate.setHours(23, 59, 59, 999);
					if (expiryDate > toDate) return false;
				}
			}

			if (filters.department && file.department !== filters.department) {
				return false;
			}

			if (filters.assignedTo) {
				const assignedManagers = file.assignedManagers || [];
				const searchTerm = filters.assignedTo.toLowerCase();
				const hasMatch = assignedManagers.some((manager: string) =>
					manager.toLowerCase().includes(searchTerm),
				);
				if (!hasMatch) return false;
			}

			if (filters.contractType && file.contractType !== filters.contractType) {
				return false;
			}

			if (filters.searchQuery) {
				const query = filters.searchQuery.toLowerCase();
				const matchesName = (file.contractName || file.name || "")
					.toLowerCase()
					.includes(query);
				const matchesNumber = (file.contractNumber || "")
					.toLowerCase()
					.includes(query);
				const matchesVendor = (file.vendor || "").toLowerCase().includes(query);
				if (!matchesName && !matchesNumber && !matchesVendor) {
					return false;
				}
			}

			return true;
		});
	}, [files, filters, statusTab]);

	return (
		<>
			<ContractsView
				files={filteredFiles}
				user={user}
				onRefresh={handleRefresh}
			/>
			<ContractsBulkBar files={filteredFiles} />
		</>
	);
}
