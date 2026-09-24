"use client";

import { FilePlus, SquareArrowRightExit } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { applyContractListFilters } from "@/lib/contracts/contractsListUtils";
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
	const canCreate = permissions.includes(PERMISSIONS.CONTRACTS.CREATE);

	const exportFiles = useMemo(() => {
		const base = applyContractListFilters(files, filters, statusTab);

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
			{canCreate && (
				<Button
					asChild
					size="sm"
					className="primary-btn px-3 sm:px-4 cursor-pointer"
				>
					<Link href="/contracts/create">
						<FilePlus className="h-4 w-4" />
						<span className="hidden sm:inline">Create contract</span>
					</Link>
				</Button>
			)}
			{canView && (
				<Button
					variant="outline"
					size="sm"
					onClick={handleExport}
					className="primary-btn px-3 sm:px-4 cursor-pointer"
				>
					<SquareArrowRightExit className="w-4 h-4" />
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
