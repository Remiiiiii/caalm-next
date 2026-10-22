"use client";

import { FilePlus, SquareArrowRightExit } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BusyIcon } from "@/components/ui/busy-icon";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/constants/permissions";
import { useBusyAction } from "@/hooks/useBusyAction";
import { usePermissions } from "@/hooks/usePermissions";
import { applyContractListFilters } from "@/lib/contracts/contractsListUtils";
import { downloadXlsx } from "@/lib/export/download-xlsx";
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
		const stamp = new Date().toISOString().slice(0, 10);
		downloadXlsx(`contracts-export-${stamp}.xlsx`, {
			sheetName: "Contracts",
			title: "Contracts — Export",
			subtitle: `CAALM · ${exportFiles.length} contract${exportFiles.length === 1 ? "" : "s"} · Generated ${stamp}`,
			columns: [
				{ header: "Contract Name", width: 40 },
				{ header: "Contract Number", width: 18 },
				{ header: "Status", width: 16 },
				{ header: "Type", width: 18 },
				{ header: "Department", width: 20 },
				{ header: "Assigned To", width: 26 },
				{ header: "Expiry Date", type: "date", width: 16 },
				{ header: "Amount", type: "currency", width: 16 },
				{ header: "Vendor", width: 24 },
				{ header: "Created Date", type: "date", width: 16 },
			],
			rows: exportFiles.map((file) => [
				file.contractName || file.name || "Untitled",
				file.contractNumber,
				file.status,
				file.contractType,
				file.department,
				Array.isArray(file.assignedManagers)
					? file.assignedManagers.join(", ")
					: file.assignedManagers,
				file.contractExpiryDate,
				file.amount == null ? null : Number(file.amount),
				file.vendor,
				file.$createdAt,
			]),
		});
	};
	const [runExporting, exporting] = useBusyAction(handleExport);

	return (
		<div className="platform-overview-actions flex items-center gap-2 justify-end flex-wrap">
			{canCreate && (
				<Button asChild className="primary-btn cursor-pointer">
					<Link href="/contracts/create">
						<FilePlus className="h-4 w-4" />
						<span className="hidden sm:inline">Create contract</span>
					</Link>
				</Button>
			)}
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
			{process.env.NODE_ENV === "development" && (
				<ContractsExpiryModalTestButton />
			)}
		</div>
	);
}
