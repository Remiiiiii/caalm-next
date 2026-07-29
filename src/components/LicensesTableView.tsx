"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLicensesView } from "@/components/LicensesView";
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
	getLicenseExpiryUrgency,
	isLicenseExpired,
} from "@/lib/licenses/licensesListUtils";
import {
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn, convertFileSize } from "@/lib/utils";
import type { License } from "@/types/licenses";
import FormattedDateTime, { FormattedDate } from "./FormattedDateTime";
import LicenseActionDropdown from "./licenses/LicenseActionDropdown";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";

const statusBadge = (license: License) => {
	const expired = isLicenseExpired(license);
	const status = expired ? "expired" : license.status || "";
	const labelMap: Record<string, string> = {
		"pending-review": "Pending Review",
		"action-required": "Action Required",
		active: "Active",
		inactive: "Inactive",
		expired: "Expired",
		suspended: "Suspended",
	};
	const classMap: Record<string, string> = {
		active: "bg-green/10 text-green border-green/20",
		"pending-review": "bg-orange/10 text-orange border-orange/20",
		"action-required": "bg-red/10 text-red border-red/20",
		inactive: "bg-slate-100 text-slate-600 border-slate-200",
		expired: "bg-red/10 text-red border-red/20",
		suspended: "bg-slate-100 text-slate-700 border-slate-200",
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
};

function expiryCell(license: License) {
	const expiryDate = license.licenseExpiryDate || license.expirationDate;
	if (!expiryDate) {
		return <span className="body-2 text-slate-400">-</span>;
	}
	const urgency = getLicenseExpiryUrgency(license);
	return (
		<span
			className={cn(
				"body-2",
				urgency !== "none" && urgency !== "expired" && "text-orange",
				urgency === "expired" && "text-red",
			)}
		>
			<FormattedDate date={expiryDate} className="body-2" />
			{urgency === "expired" && (
				<span className="block text-[10px] font-medium uppercase tracking-wide opacity-80">
					Expired
				</span>
			)}
		</span>
	);
}

interface LicensesTableViewProps {
	licenses: License[];
	user: {
		role?: string;
	} | null;
	onRefresh?: () => void;
	onLicenseRemoved?: (licenseId: string) => void;
}

export default function LicensesTableView({
	licenses,
	user,
	onRefresh,
	onLicenseRemoved,
}: LicensesTableViewProps) {
	const {
		selectedIds,
		toggleSelected,
		selectAll,
		clearSelection,
		setPreviewLicense,
	} = useLicensesView();
	const { toast } = useToast();
	const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
	const visibleIds = useMemo(() => licenses.map((l) => l.$id), [licenses]);
	const allSelected =
		visibleIds.length > 0 &&
		visibleIds.every((id) => selectedIds.includes(id));
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

	// Fetch owner names (createdBy) for all licenses
	useEffect(() => {
		const fetchAllOwnerNames = async () => {
			const ownerIds = new Set<string>();
			const ownerIdToLicenseId = new Map<string, string[]>();

			licenses.forEach((license) => {
				const userId = license.createdBy?.trim();
				if (userId && userId.length > 0 && !ownerNames[license.$id]) {
					ownerIds.add(userId);
					if (!ownerIdToLicenseId.has(userId)) {
						ownerIdToLicenseId.set(userId, []);
					}
					ownerIdToLicenseId.get(userId)?.push(license.$id);
				}
			});

			if (ownerIds.size === 0) return;

			const userIdsArray = Array.from(ownerIds);
			setLoadingOwners((prev) => {
				const newLoading = { ...prev };
				userIdsArray.forEach((id) => {
					ownerIdToLicenseId.get(id)?.forEach((licenseId) => {
						newLoading[licenseId] = true;
					});
				});
				return newLoading;
			});

			try {
				const users = await fetchUserNamesByIds(userIdsArray);
				const namesMap: Record<string, string> = {};
				users.forEach((user) => {
					if (user.$id) namesMap[user.$id] = user.fullName || "Unknown";
					if (user.accountId)
						namesMap[user.accountId] = user.fullName || "Unknown";
				});

				const newOwnerNames: Record<string, string> = {};
				userIdsArray.forEach((userId) => {
					const name = namesMap[userId] || "Unknown";
					ownerIdToLicenseId.get(userId)?.forEach((licenseId) => {
						newOwnerNames[licenseId] = name;
					});
				});

				setOwnerNames((prev) => ({ ...prev, ...newOwnerNames }));
			} catch (error) {
				console.error("Failed to fetch owner names:", error);
				toast({
					title: "Error",
					description: "Failed to load license owner information.",
					variant: "destructive",
				});
				userIdsArray.forEach((userId) => {
					ownerIdToLicenseId.get(userId)?.forEach((licenseId) => {
						setOwnerNames((prev) => ({ ...prev, [licenseId]: "Unknown" }));
					});
				});
			} finally {
				setLoadingOwners((prev) => {
					const newLoading = { ...prev };
					userIdsArray.forEach((id) => {
						ownerIdToLicenseId.get(id)?.forEach((licenseId) => {
							newLoading[licenseId] = false;
						});
					});
					return newLoading;
				});
			}
		};

		fetchAllOwnerNames();
	}, [licenses, toast, ownerNames]);

	// Fetch assigned manager user data
	useEffect(() => {
		const fetchAssignedManagers = async () => {
			const managerIds = new Set<string>();
			const managerIdToLicenseId = new Map<string, string[]>();

			licenses.forEach((license) => {
				let managers: string[] = [];

				if (
					Array.isArray(license.assignedManagers) &&
					license.assignedManagers.length > 0
				) {
					managers = license.assignedManagers;
				} else if (typeof license.assignedManagers === "string") {
					managers = [license.assignedManagers];
				}

				managers.forEach((manager) => {
					if (manager?.trim()) {
						managerIds.add(manager.trim());
						if (!managerIdToLicenseId.has(manager.trim())) {
							managerIdToLicenseId.set(manager.trim(), []);
						}
						managerIdToLicenseId.get(manager.trim())?.push(license.$id);
					}
				});
			});

			if (managerIds.size === 0) return;

			const managerIdsArray = Array.from(managerIds);

			setLoadingManagers((prev) => {
				const newLoading = { ...prev };
				managerIdsArray.forEach((id) => {
					managerIdToLicenseId.get(id)?.forEach((licenseId) => {
						newLoading[licenseId] = true;
					});
				});
				return newLoading;
			});

			try {
				const users = await fetchUserNamesByIds(managerIdsArray);
				const newManagerUsers: Record<string, AppUser[]> = {};

				const userMap = new Map<string, AppUser>();
				users.forEach((user) => {
					if (user.$id) userMap.set(user.$id, user);
					if (user.accountId) userMap.set(user.accountId, user);
					if (user.fullName) userMap.set(user.fullName, user);
				});

				licenses.forEach((license) => {
					const licenseManagers: AppUser[] = [];
					let managers: string[] = [];

					if (
						Array.isArray(license.assignedManagers) &&
						license.assignedManagers.length > 0
					) {
						managers = license.assignedManagers;
					} else if (typeof license.assignedManagers === "string") {
						managers = [license.assignedManagers];
					}

					managers.forEach((manager) => {
						const user = userMap.get(manager.trim());
						if (user) {
							licenseManagers.push(user);
						} else {
							licenseManagers.push({
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

					if (licenseManagers.length > 0) {
						newManagerUsers[license.$id] = licenseManagers;
					}
				});

				const bucketId =
					process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
				const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
				const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

				const newProfileImages: Record<string, string> = {};

				if (bucketId && endpoint && projectId) {
					const baseUrl = `${endpoint}/storage/buckets/${bucketId}/files`;
					users.forEach((user) => {
						if (user.profileImageId) {
							const imageUrl = `${baseUrl}/${user.profileImageId}/view?project=${projectId}`;
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
						managerIdToLicenseId.get(id)?.forEach((licenseId) => {
							newLoading[licenseId] = false;
						});
					});
					return newLoading;
				});
			}
		};

		fetchAssignedManagers();
	}, [licenses, toast]);

	const getOwnerName = (license: License): string => {
		if (ownerNames[license.$id]) return ownerNames[license.$id];
		return "Unknown";
	};

	const truncateLicenseName = (name: string): string => {
		if (!name) return "Untitled License";
		if (name.length <= 20) return name;
		return `${name.substring(0, 20)}...`;
	};

	const handleImageError = useCallback((userId: string, accountId?: string) => {
		setFailedProfileImages((prev) => {
			const newSet = new Set(prev);
			if (userId) newSet.add(userId);
			if (accountId) newSet.add(accountId);
			return newSet;
		});
	}, []);

	const renderAssignedManagers = (license: License) => {
		const managers = assignedManagerUsers[license.$id] || [];
		const isLoading = loadingManagers[license.$id];

		if (isLoading) {
			return (
				<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
					<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
					Loading...
				</span>
			);
		}

		if (managers.length === 0) {
			if (
				Array.isArray(license.assignedManagers) &&
				license.assignedManagers.length > 0
			) {
				return (
					<span
						className="body-2 truncate block"
						title={license.assignedManagers.join(", ")}
					>
						{license.assignedManagers.join(", ")}
					</span>
				);
			}
			if (typeof license.assignedManagers === "string") {
				return <span className="body-2">{license.assignedManagers}</span>;
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

	if (licenses.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-12 px-4">
				<Image
					src="/assets/icons/no-data.svg"
					alt="No licenses found"
					width={250}
					height={250}
					className="mx-auto mb-4"
				/>
				<p className="body-1 text-slate-700">No licenses found</p>
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
								aria-label="Select all visible licenses"
								className="cursor-pointer"
							/>
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							License
						</TableHead>
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
							Status
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
					{licenses.map((license: License) => (
						<TableRow
							key={license.$id}
							className={cn(
								DATA_TABLE_BODY_ROW_CLICKABLE,
								"group",
								selectedIds.includes(license.$id) && "bg-blue-50/50",
							)}
							onClick={() => setPreviewLicense(license)}
						>
							<TableCell
								className="py-4 pl-4 pr-2"
								onClick={(e) => e.stopPropagation()}
							>
								<Checkbox
									checked={selectedIds.includes(license.$id)}
									onCheckedChange={() => toggleSelected(license.$id)}
									aria-label={`Select ${license.licenseName || "license"}`}
									className="cursor-pointer"
								/>
							</TableCell>
							<TableCell className="py-4">
								<div className="flex items-center gap-3 min-w-0">
									<Thumbnail
										type="application/pdf"
										extension="pdf"
										url=""
										className="size-10! shrink-0"
										imageClassName="!size-8"
									/>
									<div className="min-w-0">
										<p
											className="subtitle-2 text-slate-700 whitespace-nowrap truncate max-w-[180px]"
											title={license.licenseName}
										>
											{truncateLicenseName(license.licenseName)}
										</p>
										{license.licenseNumber && (
											<p className="text-xs text-slate-500 mt-0.5">
												#{license.licenseNumber}
											</p>
										)}
									</div>
								</div>
							</TableCell>
							<TableCell className="py-4 whitespace-nowrap">
								{statusBadge(license)}
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								{convertFileSize({
									sizeInBytes: license.fileSize ?? 0,
								})}
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								<FormattedDateTime
									date={license.$createdAt}
									className="body-2"
								/>
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								{expiryCell(license)}
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								{license.division || license.department || (
									<span className="body-2 text-slate-400">-</span>
								)}
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								{renderAssignedManagers(license)}
							</TableCell>
							<TableCell className="py-4 text-slate-700 whitespace-nowrap">
								{loadingOwners[license.$id] ? (
									<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
										<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
										Loading...
									</span>
								) : (
									<span
										className="body-2 truncate block"
										title={getOwnerName(license)}
									>
										{getOwnerName(license)}
									</span>
								)}
							</TableCell>
							<TableCell
								className="py-4 text-right"
								onClick={(e) => e.stopPropagation()}
							>
								<LicenseActionDropdown
									license={license}
									onRefresh={onRefresh}
									onLicenseRemoved={onLicenseRemoved}
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
