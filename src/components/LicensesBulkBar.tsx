"use client";

import { SquareArrowRightExit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLicensesView } from "@/components/LicensesView";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import type { License } from "@/types/licenses";

interface LicensesBulkBarProps {
	licenses: License[];
}

export default function LicensesBulkBar({ licenses }: LicensesBulkBarProps) {
	const router = useRouter();
	const { toast } = useToast();
	const { selectedIds, clearSelection } = useLicensesView();
	const { permissions } = usePermissions();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const canView = permissions.includes(PERMISSIONS.LICENSES.VIEW);
	const canDelete = permissions.includes(PERMISSIONS.LICENSES.DELETE);

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

	const handleBulkDelete = async () => {
		setIsDeleting(true);
		let successCount = 0;
		let failCount = 0;

		for (const license of selectedLicenses) {
			try {
				const res = await fetch(`/api/licenses/${license.$id}`, {
					method: "DELETE",
				});
				if (res.ok) {
					successCount += 1;
				} else {
					failCount += 1;
				}
			} catch {
				failCount += 1;
			}
		}

		setIsDeleting(false);
		setConfirmOpen(false);
		clearSelection();
		router.refresh();

		if (failCount === 0) {
			toast({
				description: `Deleted ${successCount} license${successCount === 1 ? "" : "s"}.`,
			});
		} else {
			toast({
				variant: "destructive",
				description: `Deleted ${successCount}, failed ${failCount}.`,
			});
		}
	};

	return (
		<>
			<div className="sticky bottom-4 z-20 mx-4 sm:mx-6 mb-4 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
				<p className="text-sm font-medium text-slate-700">
					{selectedIds.length} selected
				</p>
				<div className="flex items-center gap-2">
					{canView && (
						<Button
							type="button"
							size="sm"
							className="primary-btn px-3 sm:px-4 cursor-pointer"
							onClick={handleExport}
						>
							<SquareArrowRightExit className="h-4 w-4" />
							Export selected
						</Button>
					)}
					{canDelete && (
						<Button
							type="button"
							size="sm"
							className="delete-btn cursor-pointer px-3 sm:px-4"
							onClick={() => setConfirmOpen(true)}
						>
							<Trash2 className="h-4 w-4" />
							Delete selected
						</Button>
					)}
				</div>
			</div>

			<DeleteConfirmationDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete licenses"
				description="This will permanently remove the licenses below and any linked activity. This action cannot be undone."
				items={selectedLicenses.map((license) => ({
					id: license.$id,
					name: license.licenseName || "Untitled",
					subtitle: license.licenseNumber
						? `License #${license.licenseNumber}`
						: undefined,
					status: license.status,
				}))}
				itemNoun="license"
				requireConfirmation
				confirmationLabel="I understand this will permanently delete the listed licenses and cannot be undone."
				onConfirm={handleBulkDelete}
				isLoading={isDeleting}
				closeOnConfirm={false}
			/>
		</>
	);
}
