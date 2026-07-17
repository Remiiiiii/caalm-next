"use client";

import { Download, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useContractsView } from "@/components/ContractsViewContext";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type { UIFileDoc } from "@/types/files";

interface ContractsBulkBarProps {
	files: UIFileDoc[];
}

export default function ContractsBulkBar({ files }: ContractsBulkBarProps) {
	const { selectedIds, clearSelection } = useContractsView();
	const { permissions } = usePermissions();
	const canView = permissions.includes(PERMISSIONS.CONTRACTS.VIEW);

	const selectedFiles = useMemo(
		() => files.filter((f) => selectedIds.includes(f.$id)),
		[files, selectedIds],
	);

	if (selectedIds.length === 0) return null;

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
		const rows = selectedFiles.map((file) => [
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
			`contracts-selected-${new Date().toISOString().split("T")[0]}.csv`,
		);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="sticky bottom-4 z-20 mx-4 sm:mx-6 mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
			<p className="text-sm font-medium text-slate-900">
				{selectedIds.length} selected
			</p>
			<div className="flex items-center gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="cursor-pointer"
					onClick={clearSelection}
				>
					<X className="h-4 w-4" />
					Clear
				</Button>
				{canView && (
					<Button
						type="button"
						size="sm"
						className="primary-btn px-3 sm:px-4 cursor-pointer"
						onClick={handleExport}
					>
						<Download className="h-4 w-4" />
						Export selected
					</Button>
				)}
			</div>
		</div>
	);
}
