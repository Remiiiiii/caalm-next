"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	Calendar,
	Info,
	Key,
	Minimize2,
	MoreVertical,
	Pencil,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	CaalmDataTable,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { canLicenseAction } from "@/lib/licenses/licenseUiPermissions";
import { cn } from "@/lib/utils";
import type { License } from "@/types/licenses";

const rowPad = "px-3 py-3 align-middle";
import LicenseAllocationDialog from "./LicenseAllocationDialog";
import LicenseDetailView from "./LicenseDetailView";
import LicenseForm from "./LicenseForm";
import LicenseRenewalDialog from "./LicenseRenewalDialog";

interface LicenseListProps {
	licenses: License[];
	onRefresh?: () => void;
}

export default function LicenseList({ licenses, onRefresh }: LicenseListProps) {
	const { permissions } = usePermissions();
	const canView = canLicenseAction(permissions, "view");
	const canEdit = canLicenseAction(permissions, "edit");
	const canAllocate = canLicenseAction(permissions, "allocate");
	const canRenew = canLicenseAction(permissions, "renew");
	const canDelete = canLicenseAction(permissions, "delete");

	const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
	const [showDetail, setShowDetail] = useState(false);
	const [showAllocate, setShowAllocate] = useState(false);
	const [showRenew, setShowRenew] = useState(false);
	const [showEdit, setShowEdit] = useState(false);

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "active":
				return <Badge className="bg-green/10 text-green">Active</Badge>;
			case "expired":
				return <Badge className="bg-red/10 text-red">Expired</Badge>;
			case "suspended":
				return (
					<Badge className="bg-slate-400/10 text-slate-600">Suspended</Badge>
				);
			default:
				return (
					<Badge className="bg-slate-200/10 text-slate-600">Unknown</Badge>
				);
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				year: "numeric",
				month: "short",
				day: "numeric",
			});
		} catch {
			return "N/A";
		}
	};

	const formatCurrency = (amount?: number, currency?: string) => {
		if (!amount) return "N/A";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency || "USD",
		}).format(amount);
	};

	if (licenses.length === 0) {
		return (
			<div className="text-center py-12">
				<Key className="h-16 w-16 text-slate-400 mx-auto mb-4" />
				<p className="body-1 text-slate-700">No licenses found</p>
			</div>
		);
	}

	return (
		<Card className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="p-4 sm:p-6">
				<CaalmDataTable className="px-0 sm:px-0 pb-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead
									className={cn(DATA_TABLE_HEADER_CELL, "pl-4 pr-3")}
								>
									License Name
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Vendor
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Type
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Status
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Quantity
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Cost
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Expires
								</TableHead>
								<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
									Department
								</TableHead>
								<TableHead
									className={cn(
										DATA_TABLE_HEADER_CELL,
										"pl-3 pr-4 text-right",
									)}
								>
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody className="[&_tr:last-child>td]:border-b-0">
							{licenses.map((license) => (
								<TableRow
									key={license.$id}
									className={DATA_TABLE_BODY_ROW_BASE}
								>
									<TableCell className={cn(rowPad, "pl-4 pr-3")}>
										<div className="flex items-center gap-2">
											<Key className="h-4 w-4 text-slate-600" />
											<span className="font-medium text-slate-700">
												{license.licenseName}
											</span>
										</div>
										{license.licenseNumber && (
											<p className="text-xs text-slate-500 mt-1">
												#{license.licenseNumber}
											</p>
										)}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{license.vendor || "N/A"}
									</TableCell>
									<TableCell className={rowPad}>
										<Badge variant="outline" className="text-slate-700">
											{license.licenseType || "N/A"}
										</Badge>
									</TableCell>
									<TableCell className={rowPad}>
										{getStatusBadge(license.status)}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{license.quantity !== undefined ? (
											<div>
												<span>
													{license.availableQuantity ?? license.quantity}
												</span>
												{license.quantity > 0 && (
													<span className="text-slate-500">
														{" "}
														/ {license.quantity}
													</span>
												)}
											</div>
										) : (
											"N/A"
										)}
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{formatCurrency(license.cost, license.currencyCode)}
									</TableCell>
									<TableCell className={rowPad}>
										<div className="flex items-center gap-1.5">
											<Calendar className="h-3 w-3 text-slate-500" />
											<span className="text-slate-700">
												{formatDate(
													license.licenseExpiryDate || license.expirationDate,
												)}
											</span>
										</div>
									</TableCell>
									<TableCell className={cn(rowPad, "text-slate-700")}>
										{license.division || license.department || "N/A"}
									</TableCell>
									<TableCell className={cn(rowPad, "pl-3 pr-4 text-right")}>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 rounded-full p-0 transition-colors hover:bg-white/30"
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<AppDropdownMenuContent align="end">
												{canView && (
													<AppDropdownMenuItem
														icon={Info}
														onClick={() => {
															setSelectedLicense(license);
															setShowDetail(true);
														}}
													>
														View Details
													</AppDropdownMenuItem>
												)}
												{canEdit && (
													<AppDropdownMenuItem
														icon={Pencil}
														onClick={() => {
															setSelectedLicense(license);
															setShowEdit(true);
														}}
													>
														Edit
													</AppDropdownMenuItem>
												)}
												{canAllocate && (
													<AppDropdownMenuItem
														icon={Key}
														onClick={() => {
															setSelectedLicense(license);
															setShowAllocate(true);
														}}
													>
														Allocate
													</AppDropdownMenuItem>
												)}
												{canRenew && (
													<AppDropdownMenuItem
														icon={RefreshCw}
														onClick={() => {
															setSelectedLicense(license);
															setShowRenew(true);
														}}
													>
														Renew
													</AppDropdownMenuItem>
												)}
												{canDelete && (
													<AppDropdownMenuItem icon={Trash2} tone="danger">
														Delete
													</AppDropdownMenuItem>
												)}
											</AppDropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
				</CaalmDataTable>
			</CardContent>

			{selectedLicense && (
				<>
					{showDetail && (
						<Dialog open={showDetail} onOpenChange={setShowDetail}>
							<DialogContent className="flex max-h-[90vh] max-w-[800px] flex-col overflow-hidden p-0 shadow-xl">
								<VisuallyHiddenPrimitive.Root>
									<DialogTitle>License Details</DialogTitle>
								</VisuallyHiddenPrimitive.Root>
								<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
								<div className="glass-dialog-wizard-header mt-4">
									<div className="flex items-center gap-2 px-6">
										<Info className="h-5 w-5 text-[#0f5384]" />
										<h2 className="text-xl font-semibold sidebar-gradient-text">
											License Details
										</h2>
									</div>
									<p className="text-sm text-slate-600 mt-1 ml-14">
										View license information
									</p>
								</div>
								<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-slate-50">
									<LicenseDetailView
										license={selectedLicense}
										onEdit={
											canEdit
												? () => {
														setShowDetail(false);
														setShowEdit(true);
													}
												: undefined
										}
									/>
								</div>
								<div className="glass-dialog-alert-footer">
									<div className="text-xs text-slate-500">
										License details and metadata
									</div>
									<Button
										variant="outline"
										onClick={() => setShowDetail(false)}
										className="primary-btn px-3 sm:px-4"
									>
										<Minimize2 className="w-4 h-4" />
										Close
									</Button>
								</div>
							</DialogContent>
						</Dialog>
					)}

					{showEdit && (
						<LicenseForm
							license={selectedLicense}
							onSuccess={() => {
								setShowEdit(false);
								setSelectedLicense(null);
								onRefresh?.();
							}}
						/>
					)}

					{showAllocate && (
						<LicenseAllocationDialog
							license={selectedLicense}
							open={showAllocate}
							onOpenChange={(open) => {
								if (!open) {
									setShowAllocate(false);
									setSelectedLicense(null);
								}
							}}
							onSuccess={() => {
								setShowAllocate(false);
								setSelectedLicense(null);
								onRefresh?.();
							}}
						/>
					)}

					{showRenew && (
						<LicenseRenewalDialog
							license={selectedLicense}
							open={showRenew}
							onOpenChange={(open) => {
								if (!open) {
									setShowRenew(false);
									setSelectedLicense(null);
								}
							}}
							onSuccess={() => {
								setShowRenew(false);
								setSelectedLicense(null);
								onRefresh?.();
							}}
						/>
					)}
				</>
			)}
		</Card>
	);
}
