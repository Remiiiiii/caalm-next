"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useContractsView } from "@/components/ContractsViewContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import type { AppUser } from "@/lib/actions/user.actions";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import {
	getExpiryUrgency,
	isContractExpired,
} from "@/lib/contracts/contractsListUtils";
import {
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn, convertFileSize } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import ActionDropdown from "./ActionDropdown";
import FormattedDateTime, { FormattedDate } from "./FormattedDateTime";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";

function formatContractValue(amount: number): string {
	if (amount >= 1_000_000_000) {
		return `$${(amount / 1_000_000_000).toFixed(1)}B`;
	}
	if (amount >= 1_000_000) {
		return `$${(amount / 1_000_000).toFixed(1)}M`;
	}
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(amount);
}

function statusBadge(file: UIFileDoc) {
	const expired = isContractExpired(file);
	const status = expired ? "expired" : file.status || "";
	const labelMap: Record<string, string> = {
		"pending-review": "Pending Review",
		"action-required": "Action Required",
		active: "Active",
		inactive: "Inactive",
		expired: "Expired",
	};
	const classMap: Record<string, string> = {
		active: "bg-green/10 text-green border-green/20",
		"pending-review": "bg-orange/10 text-orange border-orange/20",
		"action-required": "bg-red/10 text-red border-red/20",
		inactive: "bg-slate-100 text-slate-600 border-slate-200",
		expired: "bg-red/10 text-red border-red/20",
	};
	return (
		<span
			className={cn(
				"inline-block px-2 py-0.5 text-xs rounded-md font-medium border",
				classMap[status] || "bg-slate-100 text-slate-700 border-slate-200",
			)}
		>
			{labelMap[status] || status || "—"}
		</span>
	);
}

function expiryCell(file: UIFileDoc) {
	if (!file.contractExpiryDate) {
		return <span className="body-2 text-slate-400">-</span>;
	}
	const urgency = getExpiryUrgency(file);
	const tone =
		urgency === "expired" || urgency === "30"
			? "text-red"
			: urgency === "60"
				? "text-orange"
				: urgency === "90"
					? "text-amber-700"
					: "text-slate-700";
	return (
		<span className={cn("body-2", tone)}>
			<FormattedDate date={file.contractExpiryDate} className="body-2" />
			{urgency !== "none" && urgency !== "expired" && (
				<span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
					{urgency}d
				</span>
			)}
			{urgency === "expired" && (
				<span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
					Expired
				</span>
			)}
		</span>
	);
}

interface ContractsTableViewProps {
	files: UIFileDoc[];
	allVisibleIds?: string[];
	user: {
		role?: string;
	} | null;
	onRefresh?: () => void;
}

export default function ContractsTableView({
	files,
	allVisibleIds,
	user,
	onRefresh,
}: ContractsTableViewProps) {
	const { toast } = useToast();
	const {
		selectedIds,
		toggleSelected,
		selectAll,
		clearSelection,
		density,
		setPreviewFile,
	} = useContractsView();
	const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
	const [loadingOwners, setLoadingOwners] = useState<Record<string, boolean>>(
		{},
	);
	const [assignedManagerUsers, setAssignedManagerUsers] = useState<
		Record<string, AppUser[]>
	>({});
	const [loadingManagers, setLoadingManagers] = useState<
		Record<string, boolean>
	>({});
	const [managerProfileImages, setManagerProfileImages] = useState<
		Record<string, string>
	>({});
	const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
		new Set(),
	);

	const visibleIds = allVisibleIds || files.map((f) => f.$id);
	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
	const rowPad = density === "compact" ? "py-2" : "py-4";

	const stickyContractCell = (selected: boolean) =>
		cn(
			"sticky left-10 z-10 backdrop-blur-md border-r border-white/30 transition-colors duration-200",
			selected ? "bg-blue-50/50" : "bg-white/10 group-hover:bg-white/25",
		);

	// Fetch owner names for all contracts
	useEffect(() => {
		const fetchAllOwnerNames = async () => {
			const ownerIds = new Set<string>();
			const ownerIdToFileId = new Map<string, string[]>();

			files.forEach((file) => {
				let userId: string | null = null;

				// Try to get owner ID from various sources
				// Check for contractOwnerId first (contracts collection field)
				if (
					file.contractOwnerId &&
					typeof file.contractOwnerId === "string" &&
					file.contractOwnerId.trim()
				) {
					userId = file.contractOwnerId.trim();
				} else if (
					typeof file.owner === "string" &&
					file.owner &&
					file.owner.trim()
				) {
					userId = file.owner.trim();
				} else if (
					typeof file.owner === "object" &&
					file.owner &&
					"fullName" in file.owner
				) {
					// Already have the name, skip
					const ownerObj = file.owner as { fullName: string };
					if (ownerObj.fullName) {
						setOwnerNames((prev) => ({
							...prev,
							[file.$id]: ownerObj.fullName,
						}));
						return;
					}
				}

				if (userId && userId.length > 0 && !ownerNames[file.$id]) {
					ownerIds.add(userId);
					if (!ownerIdToFileId.has(userId)) {
						ownerIdToFileId.set(userId, []);
					}
					ownerIdToFileId.get(userId)?.push(file.$id);
				}
			});

			if (ownerIds.size === 0) return;

			const userIdsArray = Array.from(ownerIds);
			setLoadingOwners((prev) => {
				const newLoading = { ...prev };
				userIdsArray.forEach((id) => {
					ownerIdToFileId.get(id)?.forEach((fileId) => {
						newLoading[fileId] = true;
					});
				});
				return newLoading;
			});

			try {
				const users = await fetchUserNamesByIds(userIdsArray);

				const namesMap: Record<string, string> = {};

				// Convert users array to a map by $id and accountId
				users.forEach((user) => {
					if (user.$id) {
						namesMap[user.$id] = user.fullName || "Unknown";
					}
					if (user.accountId) {
						namesMap[user.accountId] = user.fullName || "Unknown";
					}
				});

				const newOwnerNames: Record<string, string> = {};
				userIdsArray.forEach((userId) => {
					const name = namesMap[userId] || "Unknown";
					ownerIdToFileId.get(userId)?.forEach((fileId) => {
						newOwnerNames[fileId] = name;
					});
				});

				setOwnerNames((prev) => ({ ...prev, ...newOwnerNames }));
			} catch (error) {
				console.error("Failed to fetch owner names:", error);
				toast({
					title: "Error",
					description: "Failed to load contract owner information.",
					variant: "destructive",
				});
				userIdsArray.forEach((userId) => {
					ownerIdToFileId.get(userId)?.forEach((fileId) => {
						setOwnerNames((prev) => ({ ...prev, [fileId]: "Unknown" }));
					});
				});
			} finally {
				setLoadingOwners((prev) => {
					const newLoading = { ...prev };
					userIdsArray.forEach((id) => {
						ownerIdToFileId.get(id)?.forEach((fileId) => {
							newLoading[fileId] = false;
						});
					});
					return newLoading;
				});
			}
		};

		fetchAllOwnerNames();
	}, [files, ownerNames, toast]);

	// Fetch assigned manager user data
	useEffect(() => {
		const fetchAssignedManagers = async () => {
			const managerIds = new Set<string>();
			const managerIdToFileId = new Map<string, string[]>();

			files.forEach((file) => {
				let managers: string[] = [];

				// Get manager IDs - could be IDs or names
				if (
					Array.isArray(file.assignedManagers) &&
					file.assignedManagers.length > 0
				) {
					managers = file.assignedManagers;
				} else if (typeof file.assignedManagers === "string") {
					managers = [file.assignedManagers];
				}

				// Filter out names (strings that look like names) and keep IDs
				managers.forEach((manager) => {
					// If it looks like a user ID (alphanumeric, longer than typical names) or is a valid ID format
					// We'll try to fetch it - if it fails, we'll handle it gracefully
					if (manager?.trim()) {
						managerIds.add(manager.trim());
						if (!managerIdToFileId.has(manager.trim())) {
							managerIdToFileId.set(manager.trim(), []);
						}
						managerIdToFileId.get(manager.trim())?.push(file.$id);
					}
				});
			});

			if (managerIds.size === 0) return;

			const managerIdsArray = Array.from(managerIds);

			setLoadingManagers((prev) => {
				const newLoading = { ...prev };
				managerIdsArray.forEach((id) => {
					managerIdToFileId.get(id)?.forEach((fileId) => {
						newLoading[fileId] = true;
					});
				});
				return newLoading;
			});

			try {
				const users = await fetchUserNamesByIds(managerIdsArray);
				const newManagerUsers: Record<string, AppUser[]> = {};

				// Map users by their IDs, accountIds, and fullNames (since assignedManagers might be stored as names)
				const userMap = new Map<string, AppUser>();
				users.forEach((user) => {
					if (user.$id) userMap.set(user.$id, user);
					if (user.accountId) userMap.set(user.accountId, user);
					if (user.fullName) userMap.set(user.fullName, user);
				});

				// For each file, find matching users
				files.forEach((file) => {
					const fileManagers: AppUser[] = [];
					let managers: string[] = [];

					if (
						Array.isArray(file.assignedManagers) &&
						file.assignedManagers.length > 0
					) {
						managers = file.assignedManagers;
					} else if (typeof file.assignedManagers === "string") {
						managers = [file.assignedManagers];
					}

					managers.forEach((manager) => {
						const user = userMap.get(manager.trim());
						if (user) {
							fileManagers.push(user);
						} else {
							// If not found, create a mock user from the name
							fileManagers.push({
								$id: manager.trim(),
								fullName: manager.trim(),
								email: "",
								avatar: "",
								accountId: manager.trim(),
								role: "viewer" as const,
								profileImageId: null,
							});
						}
					});

					if (fileManagers.length > 0) {
						newManagerUsers[file.$id] = fileManagers;
					}
				});

				// Generate profile image URLs for users with profileImageId
				// Memoize URL generation constants to avoid redundant lookups
				const bucketId =
					process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
				const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
				const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

				const newProfileImages: Record<string, string> = {};

				if (bucketId && endpoint && projectId) {
					// Pre-compute base URL for better performance
					const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
					users.forEach((user) => {
						if (user.profileImageId) {
							const imageUrl = `${baseUrl}/${user.profileImageId}/view?project=${projectId}`;
							// Map by both $id and accountId for lookup
							if (user.$id) {
								newProfileImages[user.$id] = imageUrl;
							}
							if (user.accountId) {
								newProfileImages[user.accountId] = imageUrl;
							}
						}
					});
				}

				setManagerProfileImages((prev) => ({ ...prev, ...newProfileImages }));
				setAssignedManagerUsers((prev) => ({ ...prev, ...newManagerUsers }));
			} catch (error) {
				console.error("Failed to fetch assigned manager users:", error);
				toast({
					title: "Error",
					description: "Failed to load assigned manager information.",
					variant: "destructive",
				});
			} finally {
				setLoadingManagers((prev) => {
					const newLoading = { ...prev };
					managerIdsArray.forEach((id) => {
						managerIdToFileId.get(id)?.forEach((fileId) => {
							newLoading[fileId] = false;
						});
					});
					return newLoading;
				});
			}
		};

		fetchAssignedManagers();
	}, [files, toast]);

	const getOwnerName = (file: UIFileDoc): string => {
		if (ownerNames[file.$id]) {
			return ownerNames[file.$id];
		}
		if (
			typeof file.owner === "object" &&
			file.owner &&
			"fullName" in file.owner
		) {
			return (file.owner as { fullName: string }).fullName;
		}

		return "Unknown";
	};

	const truncateContractName = (name: string): string => {
		if (!name) return "Untitled Contract";
		if (name.length <= 15) return name;
		return `${name.substring(0, 15)}...`;
	};

	// Memoized handler for image load errors
	const handleImageError = useCallback((userId: string, accountId?: string) => {
		setFailedProfileImages((prev) => {
			const newSet = new Set(prev);
			if (userId) newSet.add(userId);
			if (accountId) newSet.add(accountId);
			return newSet;
		});
	}, []);

	const renderAssignedManagers = (file: UIFileDoc) => {
		const managers = assignedManagerUsers[file.$id] || [];
		const isLoading = loadingManagers[file.$id];

		if (isLoading) {
			return (
				<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
					<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
					Loading...
				</span>
			);
		}

		if (managers.length === 0) {
			// Fallback to original display if no user data
			if (
				Array.isArray(file.assignedManagers) &&
				file.assignedManagers.length > 0
			) {
				return (
					<span
						className="body-2 truncate block"
						title={file.assignedManagers.join(", ")}
					>
						{file.assignedManagers.join(", ")}
					</span>
				);
			}
			if (typeof file.assignedManagers === "string") {
				return <span className="body-2">{file.assignedManagers}</span>;
			}
			return <span className="body-2 text-slate-400">-</span>;
		}

		return (
			<ManagerAvatars
				managers={managers}
				profileImages={managerProfileImages}
				failedImages={failedProfileImages}
				onImageError={handleImageError}
			/>
		);
	};

	if (files.length === 0) {
		return (
			<div className="text-center py-12">
				<Image
					src="/assets/icons/no-data.svg"
					alt="No contracts found"
					width={250}
					height={250}
					className="mx-auto mb-4"
				/>
				<p className="text-2xl font-bold text-slate-700">OOPS!</p>
				<p className="body-1 text-slate-700">No contracts found</p>
			</div>
		);
	}

	return (
		<div className="w-full overflow-x-auto px-2 sm:px-4 pb-4">
			<Table className="border-separate border-spacing-0">
				<TableHeader className="[&_tr]:border-b-0">
					<TableRow className={DATA_TABLE_HEADER_ROW}>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-2 w-10`}>
							<Checkbox
								checked={allSelected}
								onCheckedChange={(checked) => {
									if (checked) selectAll(visibleIds);
									else clearSelection();
								}}
								aria-label="Select all visible contracts"
								className="cursor-pointer"
							/>
						</TableHead>
						<TableHead
							className={`${DATA_TABLE_HEADER_CELL} px-3 sticky left-10 z-10 backdrop-blur-md bg-transparent border-r border-white/30`}
						>
							Contract
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Status
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Value
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Size
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Uploaded On
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Expires On
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Department
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Assigned To
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							By
						</TableHead>
						<TableHead
							className={`${DATA_TABLE_HEADER_CELL} pl-3 pr-4 text-right`}
						>
							Actions
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="[&_tr:last-child>td]:border-b-0">
					{files.map((file: UIFileDoc) => (
						<TableRow
							key={file.$id}
							className={cn(
								DATA_TABLE_BODY_ROW_CLICKABLE,
								"group",
								selectedIds.includes(file.$id) && "bg-blue-50/50",
							)}
							onClick={() => setPreviewFile(file)}
						>
							<TableCell
								className={cn(rowPad, "pl-4 pr-2")}
								onClick={(e) => e.stopPropagation()}
							>
								<Checkbox
									checked={selectedIds.includes(file.$id)}
									onCheckedChange={() => toggleSelected(file.$id)}
									aria-label={`Select ${file.contractName || file.name || "contract"}`}
									className="cursor-pointer"
								/>
							</TableCell>
							<TableCell
								className={cn(
									rowPad,
									stickyContractCell(selectedIds.includes(file.$id)),
								)}
							>
								<div className="flex items-center gap-3 min-w-0">
									<Thumbnail
										type={file.type}
										extension={file.extension}
										url={file.url}
										className="size-10! shrink-0"
										imageClassName="!size-8"
									/>
									<p
										className="subtitle-2 text-slate-700 whitespace-nowrap truncate max-w-[180px]"
										title={
											file.name || file.contractName || "Untitled Contract"
										}
									>
										{truncateContractName(
											file.name || file.contractName || "Untitled Contract",
										)}
									</p>
								</div>
							</TableCell>
							<TableCell className={cn(rowPad, "whitespace-nowrap")}>
								{statusBadge(file)}
							</TableCell>
							<TableCell
								className={cn(
									rowPad,
									"text-slate-700 whitespace-nowrap tabular-nums",
								)}
							>
								{file.amount != null && Number(file.amount) > 0 ? (
									formatContractValue(Number(file.amount))
								) : (
									<span className="body-2 text-slate-400">-</span>
								)}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								{convertFileSize({ sizeInBytes: file.size || 0 })}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								<FormattedDateTime date={file.$createdAt} className="body-2" />
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								{expiryCell(file)}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								{file.department || (
									<span className="body-2 text-slate-400">-</span>
								)}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								{renderAssignedManagers(file)}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-slate-700 whitespace-nowrap")}
							>
								{loadingOwners[file.$id] &&
								!ownerNames[file.$id] &&
								!(
									typeof file.owner === "object" &&
									file.owner &&
									"fullName" in file.owner
								) ? (
									<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
										<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
										Loading...
									</span>
								) : (
									<span
										className="body-2 truncate block"
										title={getOwnerName(file)}
									>
										{getOwnerName(file)}
									</span>
								)}
							</TableCell>
							<TableCell
								className={cn(rowPad, "text-right")}
								onClick={(e) => e.stopPropagation()}
							>
								<ActionDropdown
									file={file}
									onStatusChange={onRefresh}
									onRefresh={onRefresh}
									userRole={user?.role as "executive" | "admin" | "manager"}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
