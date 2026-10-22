"use client";

import { SquareArrowRightExit } from "lucide-react";
import { useMemo } from "react";
import LicenseForm from "@/components/licenses/LicenseForm";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePermissions } from "@/hooks/usePermissions";
import { downloadXlsx } from "@/lib/export/download-xlsx";
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
		const stamp = new Date().toISOString().slice(0, 10);
		downloadXlsx(`licenses-export-${stamp}.xlsx`, {
			sheetName: "Licenses",
			title: "Licenses — Export",
			subtitle: `CAALM · ${filteredForExport.length} license${filteredForExport.length === 1 ? "" : "s"} · Generated ${stamp}`,
			columns: [
				{ header: "License Name", width: 40 },
				{ header: "License Number", width: 18 },
				{ header: "Status", width: 16 },
				{ header: "Type", width: 18 },
				{ header: "Category", width: 18 },
				{ header: "Compliance", width: 16 },
				{ header: "Vendor", width: 22 },
				{ header: "Product", width: 22 },
				{ header: "Department", width: 20 },
				{ header: "Assigned To", width: 26 },
				{ header: "Issue Date", type: "date", width: 16 },
				{ header: "Expiry Date", type: "date", width: 16 },
				{ header: "Cost", type: "currency", width: 14 },
				{ header: "Quantity", type: "number", width: 12 },
				{ header: "Created Date", type: "date", width: 16 },
			],
			rows: filteredForExport.map((license) => [
				license.licenseName || "Untitled",
				license.licenseNumber,
				license.status,
				license.licenseType,
				license.category,
				license.compliance,
				license.vendor,
				license.product,
				license.division || license.department,
				Array.isArray(license.assignedManagers)
					? license.assignedManagers.join(", ")
					: license.assignedManagers,
				license.issueDate,
				license.licenseExpiryDate,
				license.cost == null ? null : Number(license.cost),
				license.quantity == null ? null : Number(license.quantity),
				license.$createdAt,
			]),
		});
	};
	const [runExporting, exporting] = useBusyAction(handleExport);

	return (
		<div className="platform-overview-actions flex items-center gap-2 justify-end flex-wrap">
			{canView && (
				<Button
					variant="outline"
					disabled={exporting}
					onClick={() => void runExporting()}
					className="primary-btn cursor-pointer"
				>
					<BusyIcon busy={exporting} icon={SquareArrowRightExit} />
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
