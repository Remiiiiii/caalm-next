"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import Image from "next/image";
import React, { Fragment, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { constructFileUrl } from "@/lib/utils";
//
import type { UIFileDoc } from "@/types/files";
import {
	actionsDropdownItems,
	type ContractDepartment,
	DIVISION_TO_DEPARTMENT,
	formatDepartmentName,
	formatDivisionName,
	type UserDivision,
} from "../../constants";

// Helper function to validate Appwrite storage file ID format
const isValidBucketFileId = (id: string | null | undefined): boolean => {
	if (!id || typeof id !== "string") return false;
	// Appwrite storage file IDs must be:
	// - At most 36 characters
	// - Only contain a-z, A-Z, 0-9, and underscore
	// - Cannot start with a leading underscore
	if (id.length > 36) return false;
	if (id.startsWith("_")) return false;
	return /^[a-zA-Z0-9_]+$/.test(id);
};

// Map division to badge color for Re-assign dialog
const _getDivisionBadgeClasses = (division: string): string => {
	const normalized = division?.toLowerCase?.() ?? "";
	switch (normalized) {
		case "c-suite":
			return "bg-purple-100 text-purple-800 border border-purple-200 text-xs rounded-xl font-medium px-2 py-1";
		case "behavioral-health":
			return "bg-blue-100 text-blue-800 border border-blue-200 text-xs rounded-xl font-medium px-2 py-1";
		case "child-welfare":
			return "bg-teal-100 text-teal-800 border border-teal-200 text-xs rounded-xl font-medium px-2 py-1";
		case "clinic":
			return "bg-cyan-100 text-cyan-800 border border-cyan-200 text-xs rounded-xl font-medium px-2 py-1";
		case "cfs":
			return "bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs rounded-xl font-medium px-2 py-1";
		case "hr":
			return "bg-pink-100 text-pink-800 border border-pink-200 text-xs rounded-xl font-medium px-2 py-1";
		case "residential":
			return "bg-green-100 text-green-800 border border-green-200 text-xs rounded-xl font-medium px-2 py-1";
		case "support":
			return "bg-orange-100 text-orange-800 border border-orange-200 text-xs rounded-xl font-medium px-2 py-1";
		case "help-desk":
			return "bg-yellow-100 text-yellow-800 border border-yellow-200 text-xs rounded-xl font-medium px-2 py-1";
		case "accounting":
			return "bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs rounded-xl font-medium px-2 py-1";
		default:
			return "bg-slate-100 text-slate-800 border border-slate-200 text-xs rounded-xl font-medium px-2 py-1";
	}
};

// Map status to badge color for Re-assign dialog
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

import {
	AlertTriangle,
	Download,
	FileText,
	FolderPen,
	Info,
	Pencil,
	RefreshCw,
	ScanEye,
	Share2,
	Trash2,
	UserRoundCheck,
	X,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { ShareInput } from "@/components/ActionsModalContent";
import ContractApprovalFlowDialog from "@/components/contracts/approval/ContractApprovalFlowDialog";
import { PERMISSIONS } from "@/constants/permissions";
import { useDepartmentAssignment } from "@/hooks/useDepartmentAssignment";
import { usePermissions } from "@/hooks/usePermissions";
import {
	assignContract,
	deleteFile,
	renameFile,
	updateFileUsers,
} from "@/lib/actions/file.actions";
import { assignContractToDepartment } from "@/lib/actions/notification.actions";
import type { AppUser } from "@/lib/actions/user.actions";
import {
	getFilePreviewKind,
	usesMediaPreview,
} from "@/lib/files/filePreviewKind";
import { refreshStorageUsage } from "@/lib/storage/refreshStorageUsage";
import { FileDetails } from "./ActionsModalContent";
import DocumentViewer from "./DocumentViewer";
import FilePreviewDialog from "./files/FilePreviewDialog";
import { Button } from "./ui/button";
import { CardHeader, CardTitle } from "./ui/card";
import { DeleteConfirmBody } from "./ui/delete-confirmation-dialog";
import { Input } from "./ui/input";

const ActionDropdown = ({
	file,
	onStatusChange,
	onRefresh,
	onExpiryDateChange,
	userRole: _userRole,
}: {
	file: UIFileDoc;
	onStatusChange?: () => void;
	onRefresh?: () => void;
	onExpiryDateChange?: (newExpiryDate: string) => void;
	userRole?: string;
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [action, setAction] = useState<ActionType | null>(null);
	const [name, setName] = useState<string>(
		file?.name || file?.contractName || "",
	);
	const [isLoading, setIsLoading] = useState(false);
	const [deleteConfirmed, setDeleteConfirmed] = useState(false);
	const [emails, setEmails] = useState<string[]>([]);
	const [downloading, setDownloading] = useState(false);

	// Initialize emails from file.users when share dialog opens
	useEffect(() => {
		if (action?.value === "share" && file.users && file.users.length > 0) {
			setEmails(file.users);
		} else if (
			action?.value === "share" &&
			(!file.users || file.users.length === 0)
		) {
			setEmails([]);
		}
	}, [action?.value, file.users]);

	// Check if contract is expired
	const isContractExpired = React.useMemo(() => {
		if (file?.status?.toLowerCase() === "expired") return true;
		if (file?.isExpired) return true;
		if (file?.contractExpiryDate) {
			const expiryDate = new Date(file.contractExpiryDate);
			const now = new Date();
			return expiryDate < now;
		}
		return false;
	}, [file?.status, file?.isExpired, file?.contractExpiryDate]);

	const {
		departmentEnums,
		filteredManagers,
		selectedDepartment,
		selectedManagers,
		handleDepartmentChange,
		handleManagerToggle,
	} = useDepartmentAssignment();
	const path = usePathname() || "";
	const [isViewerOpen, setIsViewerOpen] = useState(false);
	const { permissions } = usePermissions();

	const filePreviewKind = React.useMemo(
		() =>
			getFilePreviewKind({
				name: file.name || file.contractName || "",
				type: file.type,
				extension: file.extension,
			}),
		[file.name, file.contractName, file.type, file.extension],
	);
	const useSimpleFilePreview = usesMediaPreview(filePreviewKind);

	// SWR automatically fetches data when hook is used, no need for manual fetch

	const closeAllModals = (event?: React.MouseEvent) => {
		if (event) {
			event.stopPropagation();
			event.preventDefault();
		}
		setIsModalOpen(false);
		setIsDropdownOpen(false);
		setAction(null);
		setName(file.name || file.contractName || "");
		setDeleteConfirmed(false);
		//setEmails([])
	};

	const handleAction = async () => {
		if (!action) return;
		setIsLoading(true);
		let success = false;

		const actions = {
			assign: async () => {
				if (!file.contractId) {
					throw new Error(
						"This file does not have an associated contract. Only contract files can be assigned.",
					);
				}

				// Validate contractId format before using it
				const contractId = file.contractId;
				const isValidContractId =
					typeof contractId === "string" &&
					contractId.length > 0 &&
					contractId.length <= 36 &&
					/^[a-zA-Z0-9_][a-zA-Z0-9_]*$/.test(contractId);

				if (!isValidContractId) {
					console.error("Invalid contractId format:", contractId);
					throw new Error(
						`Invalid contract ID format: "${contractId}". Contract ID must be 1-36 characters, alphanumeric with underscores only, and cannot start with an underscore.`,
					);
				}

				const assignResult = await assignContract({
					fileId: contractId,
					managerAccountIds: selectedManagers,
					path,
					fileDocumentId: file.$id, // Pass the file document ID
				});

				// Also assign department if selected - use the validated contractId
				if (selectedDepartment) {
					await assignContractToDepartment({
						contractId: contractId, // Use the validated contractId we already have
						department: selectedDepartment as ContractDepartment,
					});
				}

				return assignResult;
			},
			rename: () => {
				// Remove extension if user included it
				let baseName = name;
				if (
					baseName.toLowerCase().endsWith(`.${file.extension.toLowerCase()}`)
				) {
					baseName = baseName.slice(0, -file.extension.length - 1);
				}
				return renameFile({
					fileId: file.$id,
					name: baseName,
					extension: file.extension,
					path,
				});
			},
			share: () =>
				updateFileUsers({
					fileId: file.$id,
					emails,
					path,
				}),
			delete: () =>
				deleteFile({
					fileId: file.$id,
					bucketFileId: file.bucketFileId || "",
					path,
					contractId: file.contractId, // Pass contractId if this is a contract
				}),
		};

		success = await actions[action.value as keyof typeof actions]();

		if (success) {
			closeAllModals();
			if (action.value === "delete") {
				await refreshStorageUsage();
			}
			// Refresh the contracts list after successful actions
			if (onRefresh) {
				onRefresh();
			}
		}

		setIsLoading(false);
	};

	const handleRemoveUser = async (email: string) => {
		const key = email.trim().toLowerCase();
		const updateEmails = emails.filter(
			(e: string) => e.trim().toLowerCase() !== key,
		);
		const wasPersisted = (file.users || []).some(
			(e: string) => e.trim().toLowerCase() === key,
		);

		// Pending picks (not saved yet) only update local selection
		if (!wasPersisted) {
			setEmails(updateEmails);
			return;
		}

		const success = await updateFileUsers({
			fileId: file.$id,
			emails: updateEmails,
			path,
		});

		if (success) {
			setEmails(updateEmails);
			file.users = updateEmails;
		}
	};

	const renderDialogContent = () => {
		if (!action) return null;
		const { value, label } = action;
		// All dialogs styled like Assign (NotificationCenter)
		const _dialogHeader = (
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="sidebar-gradient-text">{label}</CardTitle>
				<Button variant="ghost" size="icon" onClick={closeAllModals}>
					<span className="sr-only">Close</span>×
				</Button>
			</CardHeader>
		);
		if (value === "assign") {
			return (
				<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full max-w-[720px] flex-col overflow-hidden p-0 shadow-xl">
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Header with gradient background */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							{/* Icon with circular background */}

							{/* Title */}
							<div className="flex items-center gap-3">
								<UserRoundCheck className="w-5 h-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									{label}
								</DialogTitle>
							</div>
						</div>
						<p className="text-sm text-slate-600 mt-1 ml-14">
							Select department and managers to assign this contract
						</p>
					</div>

					{/* Scrollable Content — content sits on outer panel (no nested white card) */}
					<div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 p-6">
						{/* Department Selection */}
						<div>
							<div className="mb-3 text-sm font-medium text-slate-700">
								Select department for this contract:
							</div>
							<div className="flex flex-wrap gap-2">
								{departmentEnums.length > 0 ? (
									departmentEnums.map((dept) => {
										const isSelected = selectedDepartment === dept;
										return (
											<label
												key={dept}
												className={`inline-flex items-center gap-2 cursor-pointer transition-all duration-200 px-3 py-1.5 rounded-full border outline-none focus-within:outline-none ${
													isSelected
														? "border-green bg-green/10 text-slate-700 shadow-sm"
														: "border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:border-blue-300"
												} group`}
												onClick={(e) => {
													e.preventDefault();
													e.stopPropagation();
													if (!isLoading) {
														handleDepartmentChange(dept);
													}
												}}
											>
												<input
													type="radio"
													name="contract-department"
													value={dept}
													checked={isSelected}
													onChange={(e) => {
														e.stopPropagation();
														if (!isLoading) {
															handleDepartmentChange(dept);
														}
													}}
													onClick={(e) => {
														e.stopPropagation();
													}}
													disabled={isLoading}
													className="h-3.5 w-3.5 shrink-0 cursor-pointer appearance-none rounded-full border border-slate-300 bg-white checked:border-green checked:bg-green checked:shadow-[inset_0_0_0_2.5px_white] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
												/>
												<span
													className={`text-xs font-medium cursor-pointer transition-colors ${
														isSelected
															? "text-slate-700"
															: "text-slate-700 group-hover:text-[#0f5384]"
													}`}
												>
													{formatDepartmentName(dept as ContractDepartment)}
												</span>
											</label>
										);
									})
								) : (
									<div className="text-sm text-slate-500">
										{isLoading
											? "Loading departments..."
											: "No departments available"}
									</div>
								)}
							</div>
						</div>

						{/* Manager Selection */}
						<div>
							<div className="mb-3 text-sm font-medium text-slate-700">
								Select manager(s) to assign this contract:
							</div>
							<div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
								<table className="min-w-full divide-y divide-slate-200">
									<thead className="bg-slate-50">
										<tr>
											<th></th>
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
													onClick={() => handleManagerToggle(manager.accountId)}
												>
													<td
														className="p-2"
														onClick={(e) => e.stopPropagation()}
													>
														<input
															type="checkbox"
															key={`${
																manager.accountId
															}-${selectedManagers.includes(
																manager.accountId,
															)}`}
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
														{(manager as any).department
															? formatDepartmentName(
																	(manager as any)
																		.department as ContractDepartment,
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
													{isLoading
														? "Loading managers..."
														: !selectedDepartment
															? "Please select a department first"
															: `No managers found in ${formatDepartmentName(
																	selectedDepartment as ContractDepartment,
																)} — try another department`}
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</div>
					</div>

					{/* Footer: info + Assign on one row */}
					<div className="flex shrink-0 flex-nowrap items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						{selectedManagers.length === 0 ? (
							<div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
								<Info
									className="h-3.5 w-3.5 shrink-0 text-[#0f5384]"
									aria-hidden
								/>
								<span>Select at least one manager to continue</span>
							</div>
						) : (
							<span className="shrink-0 text-xs text-slate-500">
								{selectedManagers.length === 1
									? "1 manager selected"
									: `${selectedManagers.length} managers selected`}
							</span>
						)}
						<Button
							onClick={(e) => {
								e.stopPropagation();
								e.preventDefault();
								handleAction();
							}}
							disabled={
								isLoading ||
								selectedManagers.length === 0 ||
								!selectedDepartment
							}
							className="primary-btn !w-auto shrink-0 px-3 sm:px-4"
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
							Assign Contract
						</Button>
					</div>
				</DialogContent>
			);
		}
		// Rename dialog
		if (value === "rename") {
			const renameMaxLength = 120;
			const canRename = Boolean(name.trim());
			return (
				<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					{/* Professional Header */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<FolderPen className="h-5 w-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Rename file
								</DialogTitle>
							</div>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							Enter a new name for this file or contract
						</p>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto bg-slate-50 p-6">
						<div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
							<label
								htmlFor="rename-file-name"
								className="text-sm font-medium text-slate-700"
							>
								File name
							</label>
							<div className="relative">
								<Input
									id="rename-file-name"
									type="text"
									value={name}
									maxLength={renameMaxLength}
									onChange={(e) => setName(e.target.value)}
									onClick={(e) => {
										e.stopPropagation();
										e.preventDefault();
									}}
									placeholder="Enter new name"
									className="w-full border-[0.25px] border-slate-300 pr-9 hover:border-blue-300 focus-visible:border-[#078FAB]"
								/>
								{name ? (
									<button
										type="button"
										aria-label="Clear file name"
										className="absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
										onClick={(e) => {
											e.stopPropagation();
											e.preventDefault();
											setName("");
										}}
									>
										<X className="h-4 w-4" />
									</button>
								) : null}
							</div>
							<p className="text-right text-xs text-slate-500 tabular-nums">
								{name.length} / {renameMaxLength}
							</p>
						</div>
					</div>

					{/* Professional Footer */}
					<div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
						<div className="flex items-center gap-2 text-sm text-slate-500">
							<span
								className={`h-2 w-2 shrink-0 rounded-full ${
									canRename ? "bg-green" : "bg-slate-300"
								}`}
								aria-hidden
							/>
							{canRename ? "Ready to rename" : "Enter a name to continue"}
						</div>
						<div className="flex items-center gap-3">
							<Button
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
									handleAction();
								}}
								disabled={isLoading || !canRename}
								className="primary-btn px-3 sm:px-4"
							>
								{isLoading ? (
									<Image
										src="/assets/icons/loader.svg"
										alt=""
										width={16}
										height={16}
										className="animate-spin"
									/>
								) : (
									<FolderPen className="h-4 w-4" />
								)}
								Rename
							</Button>
						</div>
					</div>
				</DialogContent>
			);
		}
		// Details dialog
		if (value === "details") {
			const handleDetailsDownload = async () => {
				if (downloading) return;
				setDownloading(true);
				try {
					const params = new URLSearchParams();
					if (isValidBucketFileId(file.bucketFileId)) {
						params.append("bucketFileId", file.bucketFileId!);
					} else if (file.contractId) {
						params.append("contractId", file.contractId);
					} else if (file.$id) {
						params.append("fileId", file.$id);
					} else {
						throw new Error("No file identifier available");
					}

					const response = await fetch(
						`/api/files/download?${params.toString()}`,
					);
					if (!response.ok) throw new Error("Download failed");

					const blob = await response.blob();
					const contentDisposition = response.headers.get(
						"Content-Disposition",
					);
					let filename = file.name || file.contractName || "download";
					if (contentDisposition) {
						const match = contentDisposition.match(
							/filename\*?=['"]?([^'";\n]+)/,
						);
						if (match?.[1]) {
							filename = decodeURIComponent(match[1].replace(/^UTF-8''/, ""));
						}
					}
					if (
						file.extension &&
						!filename.toLowerCase().endsWith(`.${file.extension.toLowerCase()}`)
					) {
						filename = `${filename}.${file.extension}`;
					}

					const url = URL.createObjectURL(blob);
					const link = document.createElement("a");
					link.href = url;
					link.download = filename;
					link.style.display = "none";
					link.setAttribute("download", filename);
					document.body.appendChild(link);
					link.click();
					setTimeout(() => {
						document.body.removeChild(link);
						URL.revokeObjectURL(url);
					}, 100);
				} catch (error) {
					console.error("[CLIENT] ActionDropdown: Download failed:", error);
					alert("Failed to download file");
				} finally {
					setDownloading(false);
				}
			};

			return (
				<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full max-w-5xl flex-col overflow-hidden p-0 shadow-xl border border-slate-200">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>
							{file.contractName || file.name || "Details"}
						</DialogTitle>
					</VisuallyHiddenPrimitive.Root>
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md z-10" />

					<FileDetails
						file={file}
						onRefresh={onRefresh}
						onExpiryDateChange={onExpiryDateChange}
						onDownload={handleDetailsDownload}
						downloading={downloading}
					/>
				</DialogContent>
			);
		}
		// Share dialog
		if (value === "share") {
			return (
				<DialogContent className="flex max-h-[72vh] w-[calc(100%-1.5rem)] sm:w-full max-w-[840px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<VisuallyHiddenPrimitive.Root>
						<DialogTitle>{label}</DialogTitle>
					</VisuallyHiddenPrimitive.Root>
					{/* Professional Cap */}
					<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

					{/* Professional Header */}
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<Share2 className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{label}
							</DialogTitle>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							Share this file within and/or outside the organization
						</p>
					</div>

					{/* Content — ShareInput owns scroll so the file strip can sit flush under the header */}
					<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
						<ShareInput
							file={file}
							onInputChange={setEmails}
							onRemove={handleRemoveUser}
							currentUsers={emails}
						/>
					</div>

					{/* Footer — corner X dismisses; Share is the only action */}
					<div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<p className="text-sm text-slate-500">
							{emails.length}{" "}
							{emails.length === 1 ? "person" : "people"} selected
						</p>
						<Button
							onClick={(e) => {
								e.stopPropagation();
								e.preventDefault();
								handleAction();
							}}
							disabled={isLoading || emails.length === 0}
							className="primary-btn px-3 sm:px-4"
						>
							{isLoading && (
								<Image
									src="/assets/icons/loader.svg"
									alt="loader"
									width={16}
									height={16}
									className="animate-spin"
								/>
							)}
							<Share2 className="h-4 w-4" />
							Share
						</Button>
					</div>
				</DialogContent>
			);
		}
		// Delete dialog — CAALM destructive confirm (matches bulk delete contracts)
		if (value === "delete") {
			const isContractDelete = Boolean(file.contractId);
			const itemLabel = file.contractName || file.name || "Untitled";
			return (
				<DialogContent
					className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl"
					variant="destructive"
					showCloseButton
				>
					<DialogTitle className="sr-only">
						{isContractDelete ? "Delete contract" : "Delete file"}
					</DialogTitle>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<AlertTriangle
								className="h-5 w-5 shrink-0 text-[#0f5384]"
								aria-hidden
							/>
							<h2 className="text-xl font-semibold sidebar-gradient-text">
								{isContractDelete ? "Delete contract" : "Delete file"}
							</h2>
						</div>
					</div>

					<DeleteConfirmBody
						description={
							isContractDelete
								? "This will permanently remove the contract below and any linked activity. This action cannot be undone."
								: "This will permanently remove the file from the system. This action cannot be undone."
						}
						items={
							isContractDelete
								? [
										{
											id: file.$id,
											name: itemLabel,
											subtitle: file.contractNumber
												? `Contract #${file.contractNumber}`
												: undefined,
											status: file.isExpired ? "expired" : file.status,
										},
									]
								: [itemLabel]
						}
						itemNoun={isContractDelete ? "contract" : "file"}
						requireConfirmation
						confirmationLabel={
							isContractDelete
								? "I understand this will permanently delete the listed contracts and cannot be undone."
								: "I understand this will permanently delete this file and cannot be undone."
						}
						confirmed={deleteConfirmed}
						onConfirmedChange={setDeleteConfirmed}
					/>

					<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								e.preventDefault();
								handleAction();
							}}
							disabled={isLoading || !deleteConfirmed}
							className="delete-btn cursor-pointer gap-2 px-3 sm:px-4"
						>
							<Trash2 className="h-4 w-4 shrink-0" />
							{isLoading
								? "Deleting..."
								: isContractDelete
									? "Delete 1 contract"
									: "Delete file"}
						</Button>
					</div>
				</DialogContent>
			);
		}
		// Approval workflow is rendered outside renderDialogContent
		if (value === "status") {
			return null;
		}

		if (value === "review") {
			return null; // DocumentViewer is rendered separately
		}
	};

	// Safety check: ensure file object exists and has required properties
	if (!file) {
		console.error("ActionDropdown: file prop is undefined or null");
		return null;
	}

	// Determine if this is a contract file
	// Since we're now fetching from contracts collection, all items should be treated as contracts
	const fileName = file.name || file.contractName || "";
	const isContractFile =
		fileName.toLowerCase().includes("contract") ||
		file.contractId ||
		file.contractName ||
		file.contractType ||
		file.contractExpiryDate;

	// Permission-based action filtering
	let filteredActions = actionsDropdownItems;

	// Filter actions based on permissions
	filteredActions = actionsDropdownItems.filter((action) => {
		switch (action.value) {
			case "delete":
				// Delete requires contracts.edit or contracts.approve
				return (
					permissions.includes(PERMISSIONS.CONTRACTS.EDIT) ||
					permissions.includes(PERMISSIONS.CONTRACTS.APPROVE)
				);
			case "rename":
				// Rename requires contracts.edit
				return permissions.includes(PERMISSIONS.CONTRACTS.EDIT);
			case "review":
				// Review requires contracts.review
				return permissions.includes(PERMISSIONS.CONTRACTS.REVIEW);
			case "status":
				// Workflow viewer: view/review/approve
				return (
					permissions.includes(PERMISSIONS.CONTRACTS.VIEW) ||
					permissions.includes(PERMISSIONS.CONTRACTS.REVIEW) ||
					permissions.includes(PERMISSIONS.CONTRACTS.APPROVE)
				);
			case "assign":
				// Assign requires contracts.edit
				return permissions.includes(PERMISSIONS.CONTRACTS.EDIT);
			case "details":
			case "download":
			case "share":
				// Basic actions require contracts.view
				return permissions.includes(PERMISSIONS.CONTRACTS.VIEW);
			default:
				return true;
		}
	});

	// Additional filtering for contract files
	// Only show Assign and Status for actual contract files
	if (!isContractFile) {
		filteredActions = filteredActions.filter(
			(action) => !["assign", "status"].includes(action.value),
		);
	}

	// Review is for documents only — hide for images and videos
	const fileType = (file.type || "").toLowerCase();
	if (fileType === "image" || fileType === "video") {
		filteredActions = filteredActions.filter(
			(action) => action.value !== "review",
		);
	}

	// If contract is expired, only show: Delete, Details, Download, Status
	if (isContractExpired) {
		filteredActions = filteredActions.filter((action) =>
			["delete", "details", "download", "status"].includes(action.value),
		);
	}

	return (
		<>
			<Dialog
				open={isModalOpen && action?.value !== "status"}
				onOpenChange={(open) => {
					setIsModalOpen(open);
					if (!open) setDeleteConfirmed(false);
				}}
			>
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
							{file.name || file.contractName}
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{filteredActions.map((actionItem) => {
							const actionIconMap = {
								assign: UserRoundCheck,
								rename: Pencil,
								share: Share2,
								delete: Trash2,
								details: Info,
								status: RefreshCw,
								download: Download,
								review: ScanEye,
							} as const;

							const Icon =
								actionIconMap[actionItem.value as keyof typeof actionIconMap] ||
								FileText;
							const tone = actionItem.value === "delete" ? "danger" : "default";

							// Handle download action separately
							if (actionItem.value === "download") {
								const handleDownload = async () => {
									if (downloading) return;

									setDownloading(true);
									setIsDropdownOpen(false);

									try {
										const params = new URLSearchParams();

										if (isValidBucketFileId(file.bucketFileId)) {
											params.append("bucketFileId", file.bucketFileId!);
										} else if (file.contractId) {
											params.append("contractId", file.contractId);
										} else if (file.$id) {
											params.append("fileId", file.$id);
										} else {
											throw new Error("No file identifier available");
										}

										const response = await fetch(
											`/api/files/download?${params.toString()}`,
										);

										if (!response.ok) {
											throw new Error("Download failed");
										}

										const blob = await response.blob();

										const contentDisposition = response.headers.get(
											"Content-Disposition",
										);
										let filename = file.name || file.contractName || "download";

										if (contentDisposition) {
											const match = contentDisposition.match(
												/filename\*?=['"]?([^'";\n]+)/,
											);
											if (match?.[1]) {
												filename = decodeURIComponent(
													match[1].replace(/^UTF-8''/, ""),
												);
											}
										}

										if (
											file.extension &&
											!filename
												.toLowerCase()
												.endsWith(`.${file.extension.toLowerCase()}`)
										) {
											filename = `${filename}.${file.extension}`;
										}

										const url = URL.createObjectURL(blob);
										const link = document.createElement("a");
										link.href = url;
										link.download = filename;
										link.style.display = "none";
										link.setAttribute("download", filename);
										document.body.appendChild(link);
										link.click();

										setTimeout(() => {
											document.body.removeChild(link);
											URL.revokeObjectURL(url);
										}, 100);
									} catch (error) {
										console.error("Download failed:", error);
										alert("Failed to download file");
									} finally {
										setDownloading(false);
									}
								};

								return (
									<AppDropdownMenuItem
										key={actionItem.value}
										icon={Icon}
										tone={tone}
										onSelect={(e) => {
											e.preventDefault();
											handleDownload();
										}}
									>
										{downloading ? "Downloading..." : actionItem.label}
									</AppDropdownMenuItem>
								);
							}

							const menuItem = (
								<AppDropdownMenuItem
									icon={Icon}
									tone={tone}
									onClick={() => {
										setAction(actionItem);
										if (actionItem.value === "review") {
											setIsViewerOpen(true);
										} else if (
											[
												"assign",
												"rename",
												"delete",
												"share",
												"details",
												"status",
											].includes(actionItem.value)
										) {
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
				{renderDialogContent()}
				{file?.$id && file.bucketFileId && useSimpleFilePreview ? (
					<FilePreviewDialog
						open={isViewerOpen}
						onOpenChange={setIsViewerOpen}
						file={{
							name: file.name || file.contractName || "",
							url: constructFileUrl(file.bucketFileId),
							type: file.type,
							extension: file.extension,
						}}
					/>
				) : null}
				{file?.$id && file.bucketFileId && !useSimpleFilePreview ? (
					<DocumentViewer
						isOpen={isViewerOpen}
						onClose={() => setIsViewerOpen(false)}
						file={{
							id: file.$id,
							name: file.name || file.contractName || "",
							type: file.extension || "pdf",
							size: String(file.size ?? "Unknown"),
							url: constructFileUrl(file.bucketFileId),
							createdAt: file.$createdAt,
							expiresAt: file.contractExpiryDate,
							createdBy:
								typeof file.owner === "string"
									? file.owner
									: file.owner?.fullName || "Unknown",
							description: file.description || "",
						}}
					/>
				) : null}
			</Dialog>
			<ContractApprovalFlowDialog
				open={isModalOpen && action?.value === "status"}
				onOpenChange={(open) => {
					if (!open) {
						closeAllModals();
						onStatusChange?.();
						onRefresh?.();
					}
				}}
				contractId={String(file.contractId || file.$id)}
				contractName={file.contractName || file.name}
			/>
		</>
	);
};

export default ActionDropdown;
