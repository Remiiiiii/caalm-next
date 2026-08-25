"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	AlertTriangle,
	Ban,
	Download,
	FileText,
	GitBranch,
	Info,
	KeyRound,
	Minimize2,
	Pencil,
	RefreshCw,
	Share2,
	Trash2,
	UserRoundCheck,
} from "lucide-react";
import Image from "next/image";
import type React from "react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useDepartmentAssignment } from "@/hooks/useDepartmentAssignment";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRoles } from "@/hooks/useUserRoles";
import type { AppUser } from "@/lib/actions/user.actions";
import { canLicenseAction } from "@/lib/licenses/licenseUiPermissions";
import type { License } from "@/types/licenses";
import {
	type ContractDepartment,
	DIVISION_TO_DEPARTMENT,
	formatDepartmentName,
	formatDivisionName,
	type UserDivision,
} from "../../../constants";
import LicenseAllocationDialog from "./LicenseAllocationDialog";
import LicenseApprovalFlowDialog from "./LicenseApprovalFlowDialog";
import LicenseDetailView from "./LicenseDetailView";
import LicenseForm from "./LicenseForm";
import LicenseRenewalDialog from "./LicenseRenewalDialog";

const getStatusBadgeClasses = (status: string): string => {
	const normalized = status?.toLowerCase?.() ?? "";
	switch (normalized) {
		case "active":
			return "bg-[#ccf3e9] text-[#3dd9b3] border border-[#3dd9b3]/20 text-xs rounded-xl font-medium px-2 py-1";
		case "inactive":
			return "bg-[#fff1f1] text-[#fe8787] border border-[#fe8787]/20 text-xs rounded-xl font-medium px-2 py-1";
		case "pending":
			return "bg-[#fef6f0] text-[#ebc620] border border-[#ebc620]/20 text-xs rounded-xl font-medium px-2 py-1";
		default:
			return "bg-gray-100 text-gray-600 border border-gray-200 text-xs rounded-xl font-medium px-2 py-1";
	}
};

// License action items
const licenseActionsDropdownItems = [
	{
		label: "View Details",
		icon: "/assets/icons/info.svg",
		value: "details",
	},
	{
		label: "Edit",
		icon: "/assets/icons/edit.svg",
		value: "edit",
	},
	{
		label: "Allocate",
		icon: "/assets/icons/assign.svg",
		value: "allocate",
	},
	{
		label: "Renew",
		icon: "/assets/icons/contract-status.svg",
		value: "renew",
	},
	{
		label: "Re-assign",
		icon: "/assets/icons/assign.svg",
		value: "assign",
	},
	{
		label: "Approval workflow",
		icon: "/assets/icons/contract-status.svg",
		value: "status",
	},
	{
		label: "Download",
		icon: "/assets/icons/download.svg",
		value: "download",
	},
	{
		label: "Share",
		icon: "/assets/icons/share.svg",
		value: "share",
	},
	{
		label: "Delete",
		icon: "/assets/icons/delete.svg",
		value: "delete",
	},
];

interface LicenseActionDropdownProps {
	license: License;
	onRefresh?: () => void;
	onLicenseRemoved?: (licenseId: string) => void;
	userRole?: string;
}

type ActionType = {
	label: string;
	icon: string;
	value: string;
};

const LicenseActionDropdown = ({
	license,
	onRefresh,
	onLicenseRemoved,
	userRole,
}: LicenseActionDropdownProps) => {
	const [_isModalOpen, setIsModalOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [action, setAction] = useState<ActionType | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [downloading, setDownloading] = useState(false);
	const [showDetail, setShowDetail] = useState(false);
	const [showEdit, setShowEdit] = useState(false);
	const [showAllocate, setShowAllocate] = useState(false);
	const [showRenew, setShowRenew] = useState(false);
	const [showAssign, setShowAssign] = useState(false);
	const [showStatus, setShowStatus] = useState(false);
	const [showDelete, setShowDelete] = useState(false);
	const [showShare, setShowShare] = useState(false);
	const [_emails, _setEmails] = useState<string[]>([]);

	const { toast } = useToast();
	const { permissions } = usePermissions();
	const { roles: userRoles } = useUserRoles();
	const {
		departmentEnums,
		filteredManagers,
		selectedDepartment,
		selectedManagers,
		handleDepartmentChange,
		handleManagerToggle,
	} = useDepartmentAssignment();

	const _actualRoleName = userRoles[0]?.roleName || userRole || "";

	const closeAllModals = (event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation();
			event.preventDefault();
		}
		setIsModalOpen(false);
		setIsDropdownOpen(false);
		setAction(null);
		setShowDetail(false);
		setShowEdit(false);
		setShowAllocate(false);
		setShowRenew(false);
		setShowAssign(false);
		setShowStatus(false);
		setShowDelete(false);
		setShowShare(false);
	};

	const handleAction = async () => {
		if (!action) return;
		setIsLoading(true);

		try {
			if (action.value === "delete") {
				const res = await fetch(`/api/licenses/${license.$id}`, {
					method: "DELETE",
				});

				if (!res.ok) {
					const err = await res.json().catch(() => ({}));
					throw new Error(
						err?.error || err?.message || "Failed to delete license",
					);
				}

				toast({
					title: "License deleted",
					description: `"${license.licenseName}" has been removed.`,
				});
				onLicenseRemoved?.(license.$id);
				closeAllModals();
				onRefresh?.();
			} else if (action.value === "share") {
				closeAllModals();
			} else if (action.value === "assign") {
				if (selectedManagers.length === 0) {
					throw new Error("Select at least one department manager");
				}

				const updateRes = await fetch(`/api/licenses/${license.$id}`, {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						assignedManagers: selectedManagers,
						...(selectedDepartment
							? { division: selectedDepartment, department: selectedDepartment }
							: {}),
					}),
				});
				if (!updateRes.ok) {
					const err = await updateRes.json().catch(() => ({}));
					throw new Error(
						err?.error || err?.message || "Failed to update license managers",
					);
				}

				toast({
					title: "License reassigned",
					description: `"${license.licenseName}" managers were updated.`,
				});
				closeAllModals();
				onRefresh?.();
			}
		} catch (error) {
			console.error("Action failed:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to perform action",
				variant: "destructive",
			});
		} finally {
			setIsLoading(false);
		}
	};

	// Permission-based action filtering (keys only; matches API gates)
	const filteredActions = licenseActionsDropdownItems.filter((action) => {
		switch (action.value) {
			case "delete":
				return canLicenseAction(permissions, "delete");
			case "edit":
			case "assign":
			case "status":
				return canLicenseAction(permissions, "edit");
			case "allocate":
				return canLicenseAction(permissions, "allocate");
			case "renew":
				return canLicenseAction(permissions, "renew");
			case "details":
			case "download":
			case "share":
				return canLicenseAction(permissions, "view");
			default:
				return false;
		}
	});

	const handleDownload = async () => {
		if (downloading) return;

		setDownloading(true);
		setIsDropdownOpen(false);

		try {
			if (!license.fileId) {
				toast({
					title: "Error",
					description: "No file attached to this license",
					variant: "destructive",
				});
				return;
			}

			const params = new URLSearchParams();
			params.append("fileId", license.fileId);
			const response = await fetch(`/api/files/download?${params.toString()}`);
			if (!response.ok) throw new Error("Download failed");

			const blob = await response.blob();
			const contentDisposition = response.headers.get("Content-Disposition");
			let filename = license.licenseName || "license-download";
			if (contentDisposition) {
				const match = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)/);
				if (match?.[1]) {
					filename = decodeURIComponent(match[1].replace(/^UTF-8''/, ""));
				}
			}
			if (!filename.toLowerCase().endsWith(".pdf"))
				filename = `${filename}.pdf`;

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			link.setAttribute("download", filename);
			document.body.appendChild(link);
			link.click();
			setTimeout(() => {
				document.body.removeChild(link);
				URL.revokeObjectURL(url);
			}, 100);

			toast({
				title: "Download",
				description: "License file download started",
			});
		} catch (error) {
			console.error("Download failed:", error);
			toast({
				title: "Error",
				description: "Failed to download license file",
				variant: "destructive",
			});
		} finally {
			setDownloading(false);
		}
	};

	if (!license) {
		return null;
	}

	return (
		<>
			<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
				<DropdownMenuTrigger className="shad-no-focus rounded-full transition-colors hover:bg-white/30">
					<Image
						src="/assets/icons/dots.svg"
						alt="dots"
						width={34}
						height={34}
					/>
				</DropdownMenuTrigger>
				<AppDropdownMenuContent>
					<DropdownMenuLabel className="max-w-[200px] truncate">
						{license.licenseName}
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{filteredActions.map((actionItem) => {
						const actionIconMap = {
							details: Info,
							edit: Pencil,
							allocate: KeyRound,
							renew: RefreshCw,
							assign: UserRoundCheck,
							status: GitBranch,
							delete: Trash2,
							download: Download,
							share: Share2,
						} as const;
						const Icon =
							actionIconMap[actionItem.value as keyof typeof actionIconMap] ||
							FileText;
						const tone = actionItem.value === "delete" ? "danger" : "default";

						const menuItem =
							actionItem.value === "download" ? (
								<AppDropdownMenuItem
									icon={Icon}
									tone={tone}
									onSelect={(e) => {
										e.preventDefault();
										handleDownload();
									}}
								>
									{downloading ? "Downloading..." : actionItem.label}
								</AppDropdownMenuItem>
							) : (
								<AppDropdownMenuItem
									icon={Icon}
									tone={tone}
									onSelect={() => {
										setAction(actionItem);
										if (actionItem.value === "details") {
											setShowDetail(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "edit") {
											setShowEdit(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "allocate") {
											setShowAllocate(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "renew") {
											setShowRenew(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "assign") {
											setShowAssign(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "status") {
											setShowStatus(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "delete") {
											setShowDelete(true);
											setIsModalOpen(true);
										} else if (actionItem.value === "share") {
											setShowShare(true);
											setIsModalOpen(true);
										}
									}}
								>
									{actionItem.label}
								</AppDropdownMenuItem>
							);

						if (actionItem.value === "delete") {
							return (
								<Fragment key={actionItem.value}>
									<DropdownMenuSeparator />
									{menuItem}
								</Fragment>
							);
						}

						return <Fragment key={actionItem.value}>{menuItem}</Fragment>;
					})}
				</AppDropdownMenuContent>
			</DropdownMenu>

			{/* View Details Dialog - matches ActionDropdown Details */}
			{showDetail && (
				<Dialog open={showDetail} onOpenChange={setShowDetail}>
					<DialogContent className="flex max-h-[90vh] max-w-[800px] flex-col overflow-hidden p-0 shadow-xl">
						<VisuallyHiddenPrimitive.Root>
							<DialogTitle>License Details</DialogTitle>
						</VisuallyHiddenPrimitive.Root>
						<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
						<div className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center justify-between ml-6">
								<div className="flex items-center">
									<div>
										<div className="flex items-center gap-2">
											<Info className="h-5 w-5 text-[#0f5384]" />
											<h2 className="text-xl font-semibold sidebar-gradient-text">
												License Details
											</h2>
										</div>
										<p className="text-sm text-slate-600 mt-1 ml-14">
											View license information
										</p>
									</div>
								</div>
							</div>
						</div>
						<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-slate-50">
							<LicenseDetailView
								license={license}
								onEdit={() => {
									setShowDetail(false);
									setShowEdit(true);
								}}
							/>
						</div>
						<div className="glass-dialog-footer-wrap">
							<div className="flex items-center justify-between">
								<div className="text-sm text-slate-500">
									License details and metadata
								</div>
								<div className="flex items-center gap-3">
									<Button
										variant="outline"
										onClick={(e) => closeAllModals(e)}
										className="primary-btn px-3 sm:px-4"
									>
										<Minimize2 className="w-4 h-4" />
										Close
									</Button>
								</div>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Edit Dialog */}
			{showEdit && (
				<LicenseForm
					license={license}
					onSuccess={() => {
						setShowEdit(false);
						if (onRefresh) {
							onRefresh();
						}
					}}
				/>
			)}

			{/* Allocate Dialog - controlled so no trigger on card */}
			{showAllocate && (
				<LicenseAllocationDialog
					license={license}
					open={showAllocate}
					onOpenChange={(open) => {
						if (!open) setShowAllocate(false);
					}}
					onSuccess={() => {
						setShowAllocate(false);
						if (onRefresh) onRefresh();
					}}
				/>
			)}

			{/* Renew Dialog - controlled so no trigger on card */}
			{showRenew && (
				<LicenseRenewalDialog
					license={license}
					open={showRenew}
					onOpenChange={(open) => {
						if (!open) setShowRenew(false);
					}}
					onSuccess={() => {
						setShowRenew(false);
						if (onRefresh) onRefresh();
					}}
				/>
			)}

			<LicenseApprovalFlowDialog
				open={showStatus}
				onOpenChange={(open) => {
					if (!open) {
						closeAllModals();
						onRefresh?.();
					} else {
						setShowStatus(true);
					}
				}}
				licenseId={license.$id}
				licenseName={license.licenseName}
			/>

			{/* Delete Dialog — matches Delete Draft design */}
			{showDelete && (
				<Dialog open={showDelete} onOpenChange={setShowDelete}>
					<DialogContent className="overflow-hidden p-0 gap-0 shadow-xl sm:max-w-md border border-slate-200" variant="destructive">
						<DialogTitle className="sr-only">Delete License</DialogTitle>
						<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

						{/* Header */}
						<div className="px-6 py-4 mt-4 bg-white border-b border-slate-200">
							<div className="flex items-center gap-2">
								<AlertTriangle className="w-5 h-5 shrink-0 text-[#f7d333]" />
								<h2 className="text-base font-semibold sidebar-gradient-text">
									Delete License
								</h2>
							</div>
							<p className="text-sm text-slate-600 mt-1 ml-7">
								Are you sure you want to delete &quot;{license.licenseName}
								&quot;? This action cannot be undone.
							</p>
						</div>

						{/* Body */}
						<div className="px-6 py-5 space-y-3 bg-white">
							<p className="text-sm text-slate-600">
								This will permanently remove the license from the system.
							</p>
							<p className="text-xs font-medium text-slate-500">
								This action is permanent.
							</p>
						</div>

						{/* Footer — centered actions */}
						<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={(e) => closeAllModals(e)}
								className="primary-btn gap-2 px-3 sm:px-4"
							>
								<Ban className="h-4 w-4 shrink-0" />
								Cancel
							</Button>
							<Button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
									handleAction();
								}}
								disabled={isLoading}
								className="delete-btn gap-2 px-3 sm:px-4"
							>
								<Trash2 className="h-4 w-4 shrink-0" />
								{isLoading ? "Deleting..." : "Delete License"}
								{isLoading && (
									<Image
										src="/assets/icons/loader.svg"
										alt="loader"
										width={16}
										height={16}
										className="animate-spin ml-2"
									/>
								)}
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{/* Share Dialog - TODO: Implement share functionality */}
			{showShare && (
				<Dialog open={showShare} onOpenChange={setShowShare}>
					<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden p-0 shadow-xl">
						<VisuallyHiddenPrimitive.Root>
							<DialogTitle>Share License</DialogTitle>
						</VisuallyHiddenPrimitive.Root>
						<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
						<div className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3 px-6">
								<div className="flex items-center gap-3">
									<Share2 className="w-5 h-5 text-[#0f5384]" />
									<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
										Share License
									</DialogTitle>
								</div>
							</div>
							<p className="text-sm text-slate-600 mt-1 ml-14">
								Share this license with other users
							</p>
						</div>
						<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-slate-50">
							<div className="bg-white rounded-lg p-4 border border-slate-200">
								<p className="text-sm text-slate-600">
									Share functionality coming soon
								</p>
							</div>
						</div>
						<div className="glass-dialog-footer-wrap">
							<div className="flex items-center justify-between">
								<div className="text-sm text-slate-500">
									Enter email addresses to share
								</div>
								<div className="flex items-center gap-3">
									<Button
										variant="outline"
										onClick={(e) => closeAllModals(e)}
										className="primary-btn px-3 sm:px-4"
										disabled={isLoading}
									>
										<Ban className="w-4 h-4" />
										Cancel
									</Button>
									<Button
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
										}}
										disabled
										className="primary-btn px-3 sm:px-4"
										title="Share is not available yet"
									>
										<Share2 className="w-4 h-4" />
										Share (unavailable)
									</Button>
								</div>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}

			{showAssign && (
				<Dialog open={showAssign} onOpenChange={setShowAssign}>
					<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden p-0 shadow-xl">
						<VisuallyHiddenPrimitive.Root>
							<DialogTitle>Re-assign License</DialogTitle>
						</VisuallyHiddenPrimitive.Root>
						<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
						<div className="glass-dialog-wizard-header mt-4">
							<div className="flex items-center gap-3 px-6">
								<div className="flex items-center gap-3">
									<UserRoundCheck className="w-5 h-5 text-[#0f5384]" />
									<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
										Re-assign License
									</DialogTitle>
								</div>
							</div>
							<p className="text-sm text-slate-600 mt-1 ml-14">
								Assign this license to different department managers
							</p>
						</div>
						<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 bg-slate-50">
							<div className="bg-white rounded-lg p-6 border border-slate-200 shadow-sm space-y-6">
								<div>
									<div className="mb-3 text-sm font-medium text-slate-700">
										Select department for this license:
									</div>
									<div className="grid grid-cols-3 gap-2">
										{departmentEnums.length > 0 ? (
											departmentEnums.map((dept) => (
												<label
													key={dept}
													className={`flex items-center gap-2 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 p-2 rounded-lg border-2 ${
														selectedDepartment === dept
															? "border-blue-500 bg-blue-50"
															: "border-slate-200 bg-white"
													} group shadow-sm hover:shadow-md`}
													onClick={(e) => {
														e.preventDefault();
														e.stopPropagation();
														if (!isLoading) handleDepartmentChange(dept);
													}}
												>
													<input
														type="radio"
														name="license-department"
														value={dept}
														checked={selectedDepartment === dept}
														onChange={() => {
															if (!isLoading) handleDepartmentChange(dept);
														}}
														disabled={isLoading}
														className="cursor-pointer w-4 h-4 text-blue-600"
													/>
													<span className="text-sm cursor-pointer text-slate-700 font-medium group-hover:text-blue-600 transition-colors">
														{formatDepartmentName(dept as ContractDepartment)}
													</span>
												</label>
											))
										) : (
											<div className="text-sm text-slate-500 col-span-3">
												No departments available
											</div>
										)}
									</div>
								</div>
								<div>
									<div className="mb-3 text-sm font-medium text-slate-700">
										Select manager(s) to assign this license:
									</div>
									<div className="overflow-x-auto rounded-lg border border-slate-200">
										<table className="min-w-full divide-y divide-slate-200">
											<thead className="bg-slate-50">
												<tr>
													<th />
													<th className="text-center px-2 py-2 text-[14px] font-semibold text-slate-700">
														Name
													</th>
													<th className="text-center px-2 py-2 text-[14px] font-semibold text-slate-700">
														Department
													</th>
													<th className="text-center px-2 py-2 text-[14px] font-semibold text-slate-700">
														Division
													</th>
													<th className="text-center px-2 py-2 text-[14px] font-semibold text-slate-700">
														Status
													</th>
												</tr>
											</thead>
											<tbody className="text-slate-700 text-sm bg-white">
												{filteredManagers.length > 0 ? (
													filteredManagers.map((manager: AppUser) => (
														<tr
															key={manager.accountId}
															className={`hover:bg-blue-50 cursor-pointer transition-colors ${
																selectedManagers.includes(manager.accountId)
																	? "bg-blue-50"
																	: ""
															}`}
															onClick={() =>
																handleManagerToggle(manager.accountId)
															}
														>
															<td
																className="p-2"
																onClick={(e) => e.stopPropagation()}
															>
																<input
																	type="checkbox"
																	checked={selectedManagers.includes(
																		manager.accountId,
																	)}
																	onChange={() =>
																		handleManagerToggle(manager.accountId)
																	}
																	className="cursor-pointer"
																/>
															</td>
															<td className="text-center px-2 py-2">
																{manager.fullName}
															</td>
															<td className="text-center px-2 py-2">
																{(manager as AppUser & { department?: string })
																	.department
																	? formatDepartmentName(
																			(
																				manager as AppUser & {
																					department?: string;
																				}
																			).department as ContractDepartment,
																		)
																	: manager.division
																		? formatDepartmentName(
																				DIVISION_TO_DEPARTMENT[
																					manager.division
																				] as ContractDepartment,
																			)
																		: "N/A"}
															</td>
															<td className="text-center px-2 py-2">
																{manager.division
																	? formatDivisionName(
																			manager.division as UserDivision,
																		)
																	: "-"}
															</td>
															<td className="text-center px-2 py-2">
																<span
																	className={`inline-block ${getStatusBadgeClasses(
																		manager.status || "",
																	)}`}
																>
																	{manager.status
																		? manager.status.charAt(0).toUpperCase() +
																			manager.status.slice(1).toLowerCase()
																		: "N/A"}
																</span>
															</td>
														</tr>
													))
												) : (
													<tr>
														<td
															colSpan={5}
															className="text-center py-4 text-sm text-slate-500"
														>
															{!selectedDepartment
																? "Please select a department first"
																: "No managers available"}
														</td>
													</tr>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</div>
						<div className="glass-dialog-footer-wrap">
							<div className="flex items-center justify-between">
								<div className="text-sm text-slate-500">
									{selectedManagers.length > 0
										? `${selectedManagers.length} manager${
												selectedManagers.length === 1 ? "" : "s"
											} selected`
										: "Select at least one manager"}
								</div>
								<div className="flex items-center gap-3">
									<Button
										variant="outline"
										onClick={(e) => closeAllModals(e)}
										className="primary-btn px-3 sm:px-4"
										disabled={isLoading}
									>
										<Ban className="w-4 h-4" />
										Cancel
									</Button>
									<Button
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											void handleAction();
										}}
										disabled={
											isLoading ||
											selectedManagers.length === 0 ||
											!selectedDepartment
										}
										className="primary-btn px-3 sm:px-4"
									>
										{isLoading && (
											<Image
												src="/assets/icons/loader.svg"
												alt="loader"
												width={16}
												height={16}
												className="animate-spin mr-2"
											/>
										)}
										<UserRoundCheck className="w-4 h-4" />
										Assign License
									</Button>
								</div>
							</div>
						</div>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
};

export default LicenseActionDropdown;
