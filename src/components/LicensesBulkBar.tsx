"use client";

import { Download, X } from "lucide-react";
import { useMemo } from "react";
import { useLicensesView } from "@/components/LicensesView";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type { License } from "@/types/licenses";

interface LicensesBulkBarProps {
	licenses: License[];
}

export default function LicensesBulkBar({ licenses }: LicensesBulkBarProps) {
	const { selectedIds, clearSelection } = useLicensesView();
	const { permissions } = usePermissions();
	const canView = permissions.includes(PERMISSIONS.LICENSES.VIEW);

	const selectedLicenses = useMemo(
		() => licenses.filter((l) => selectedIds.includes(l.$id)),
		[licenses, selectedIds],
	);

	if (selectedIds.length === 0) return null;

	const handleExport = () => {
		if (!canView) return;
		const headers = [
			"License Name",
			"License Number",
			"Status",
			"Type",
			"Category",
			"Compliance",
			"Vendor",
			"Product",
			"Department",
			"Assigned To",
			"Issue Date",
			"Expiry Date",
			"Cost",
			"Quantity",
			"Created Date",
		];
		const rows = selectedLicenses.map((license) => [
			license.licenseName || "Untitled",
			license.licenseNumber || "",
			license.status || "",
			license.licenseType || "",
			license.category || "",
			license.compliance || "",
			license.vendor || "",
			license.product || "",
			license.division || license.department || "",
			Array.isArray(license.assignedManagers)
				? license.assignedManagers.join(", ")
				: license.assignedManagers || "",
			license.issueDate || "",
			license.licenseExpiryDate || "",
			license.cost?.toString() || "",
			license.quantity?.toString() || "",
			license.$createdAt || "",
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
			`licenses-selected-${new Date().toISOString().split("T")[0]}.csv`,
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
