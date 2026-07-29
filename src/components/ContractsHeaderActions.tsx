"use client";

import { Upload } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { matchesStatusTab } from "@/lib/contracts/contractsListUtils";
import type { UIFileDoc } from "@/types/files";
import ContractsExpiryModalTestButton from "./ContractsExpiryModalTestButton";
import { useContractsView } from "./ContractsViewContext";

interface ContractsHeaderActionsProps {
	files: UIFileDoc[];
}

export default function ContractsHeaderActions({
	files,
}: ContractsHeaderActionsProps) {
	const { filters, statusTab, selectedIds } = useContractsView();
	const { permissions } = usePermissions();
	const canView = permissions.includes(PERMISSIONS.CONTRACTS.VIEW);

	const exportFiles = useMemo(() => {
		const base = files.filter((file) => {
			if (!matchesStatusTab(file, statusTab)) return false;
			if (filters.status && file.status !== filters.status) return false;
			if (filters.contractType && file.contractType !== filters.contractType)
				return false;
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
			if (filters.department && file.department !== filters.department)
				return false;
			if (filters.assignedTo) {
				const managers = file.assignedManagers || [];
				const searchTerm = filters.assignedTo.toLowerCase();
				const hasMatch = managers.some((m: string) =>
					m.toLowerCase().includes(searchTerm),
				);
				if (!hasMatch) return false;
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
				if (!matchesName && !matchesNumber && !matchesVendor) return false;
			}
			return true;
		});

		if (selectedIds.length > 0) {
			return base.filter((f) => selectedIds.includes(f.$id));
		}
		return base;
	}, [files, filters, statusTab, selectedIds]);

	const handleExport = () => {
		if (!canView) return;
		const headers = [
			"Contract Name",
			"Contract Number",
			"Status",
			"Type",
			"Department",
			"Assigned To",
			"Expiry Date",
			"Amount",
			"Vendor",
			"Created Date",
		];
		const rows = exportFiles.map((file) => [
			file.contractName || file.name || "Untitled",
			file.contractNumber || "",
			file.status || "",
			file.contractType || "",
			file.department || "",
			Array.isArray(file.assignedManagers)
				? file.assignedManagers.join(", ")
				: file.assignedManagers || "",
			file.contractExpiryDate || "",
			file.amount?.toString() || "",
			file.vendor || "",
			file.$createdAt || "",
		]);
		const csvContent = [
			headers.join(","),
			...rows.map((row) =>
				row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
			),
		].join("\n");
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		link.setAttribute("href", URL.createObjectURL(blob));
		link.setAttribute(
			"download",
			`contracts-export-${new Date().toISOString().split("T")[0]}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="flex items-center gap-2 justify-end flex-wrap">
			{canView && (
				<Button
					variant="outline"
					size="sm"
					onClick={handleExport}
					className="primary-btn px-3 sm:px-4 cursor-pointer"
				>
					<Upload className="w-4 h-4" />
					<span className="hidden sm:inline">
						{selectedIds.length > 0
							? `Export (${selectedIds.length})`
							: "Export"}
					</span>
				</Button>
			)}
			{process.env.NODE_ENV === "development" && (
				<ContractsExpiryModalTestButton />
			)}
		</div>
	);
}
