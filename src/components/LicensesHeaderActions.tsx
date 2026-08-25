"use client";

import { SquareArrowRightExit } from "lucide-react";
import { useMemo } from "react";
import LicenseForm from "@/components/licenses/LicenseForm";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { applyLicenseFilters } from "@/lib/licenses/applyLicenseFilters";
import { matchesStatusTab } from "@/lib/licenses/licensesListUtils";
import { canLicenseAction } from "@/lib/licenses/licenseUiPermissions";
import type { License } from "@/types/licenses";
import { useLicensesView } from "./LicensesView";

interface LicensesHeaderActionsProps {
	licenses: License[];
}

export default function LicensesHeaderActions({
	licenses,
}: LicensesHeaderActionsProps) {
	const { filters, statusTab, selectedIds } = useLicensesView();
	const { permissions } = usePermissions();
	const canCreate = canLicenseAction(permissions, "create");
	const canView = canLicenseAction(permissions, "view");

	const filteredForExport = useMemo(() => {
		const filtered = applyLicenseFilters(licenses, filters).filter((l) =>
			matchesStatusTab(l, statusTab),
		);
		if (selectedIds.length === 0) return filtered;
		return filtered.filter((l) => selectedIds.includes(l.$id));
	}, [licenses, filters, statusTab, selectedIds]);

	const handleExport = () => {
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

		const rows = filteredForExport.map((license) => [
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
		link.href = URL.createObjectURL(blob);
		link.download = `licenses-export-${new Date().toISOString().split("T")[0]}.csv`;
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);
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
					<SquareArrowRightExit className="w-4 h-4" />
					<span className="hidden sm:inline">
						{selectedIds.length > 0
							? `Export (${selectedIds.length})`
							: "Export"}
					</span>
				</Button>
			)}
			{canCreate && <LicenseForm />}
		</div>
	);
}
