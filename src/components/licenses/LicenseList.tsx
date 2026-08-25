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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { usePermissions } from "@/hooks/usePermissions";
import { canLicenseAction } from "@/lib/licenses/licenseUiPermissions";
import type { License } from "@/types/licenses";
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
				<div className="w-full overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow className="border-slate-200 bg-slate-50">
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									License Name
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Vendor
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Type
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Status
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Quantity
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Cost
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Expires
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 whitespace-nowrap">
									Department
								</TableHead>
								<TableHead className="font-semibold text-slate-700 py-4 text-right whitespace-nowrap">
									Actions
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{licenses.map((license) => (
								<TableRow
									key={license.$id}
									className="border-slate-200 hover:bg-slate-50/50"
								>
									<TableCell className="py-4">
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
									<TableCell className="py-4 text-slate-700">
										{license.vendor || "N/A"}
									</TableCell>
									<TableCell className="py-4">
										<Badge variant="outline" className="text-slate-700">
											{license.licenseType || "N/A"}
										</Badge>
									</TableCell>
									<TableCell className="py-4">
										{getStatusBadge(license.status)}
									</TableCell>
									<TableCell className="py-4 text-slate-700">
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
									<TableCell className="py-4 text-slate-700">
										{formatCurrency(license.cost, license.currencyCode)}
									</TableCell>
									<TableCell className="py-4">
										<div className="flex items-center gap-1.5">
											<Calendar className="h-3 w-3 text-slate-500" />
											<span className="text-slate-700">
												{formatDate(
													license.licenseExpiryDate || license.expirationDate,
												)}
											</span>
										</div>
									</TableCell>
									<TableCell className="py-4 text-slate-700">
										{license.division || license.department || "N/A"}
									</TableCell>
									<TableCell className="py-4 text-right">
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
					</Table>
				</div>
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
