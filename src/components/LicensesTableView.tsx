"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
	DATA_TABLE_BODY_ROW_CLICKABLE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { convertFileSize } from "@/lib/utils";
import type { License } from "@/types/licenses";
import FormattedDateTime, { FormattedDate } from "./FormattedDateTime";
import LicenseActionDropdown from "./licenses/LicenseActionDropdown";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";

// Map license status to badge color and label (aligned with contracts / style guide)
const statusBadge = (status: string) => {
	let color = "";
	let label = status;
	switch (status) {
		case "pending-review":
			color =
				"border border-orange/20 bg-orange/10 text-orange text-xs rounded-md font-medium";
			label = "Pending Review";
			break;
		case "action-required":
			color =
				"border border-red/20 bg-red/10 text-red text-xs rounded-md font-medium";
			label = "Action Required";
			break;
		case "active":
			color =
				"border border-green/20 bg-green/10 text-green text-xs rounded-md font-medium";
			label = "Active";
			break;
		case "inactive":
			color =
				"border border-slate-200 bg-slate-100 text-slate-600 text-xs rounded-md font-medium";
			label = "Inactive";
			break;
		case "expired":
			color =
				"border border-red/20 bg-red/10 text-red text-xs rounded-md font-medium";
			label = "Expired";
			break;
		case "suspended":
			color =
				"border border-slate-200 bg-slate-100 text-slate-700 text-xs rounded-md font-medium";
			label = "Suspended";
			break;
		default:
			color =
				"border border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-md font-medium";
			label = status;
	}
	return <span className={`inline-block px-1.5 py-0.5 ${color}`}>{label}</span>;
};

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
	const { toast } = useToast();
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

	const _formatCurrency = (amount?: number, currency?: string) => {
		if (!amount) return "N/A";
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currency || "USD",
		}).format(amount);
	};

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
			<div className="text-center py-12">
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
		<Card className="bg-white/30 backdrop-blur border mt-6 border-white/40 shadow-lg w-[99.5%]">
			<div className="glass-card-cap" />
			<CardContent className="p-6">
				<div className="w-full overflow-x-auto">
					<Table className="border-separate border-spacing-0">
						<TableHeader className="[&_tr]:border-b-0">
							<TableRow className={DATA_TABLE_HEADER_ROW}>
								<TableHead className={`${DATA_TABLE_HEADER_CELL} pl-4 pr-3`}>
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
									Uploaded By
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
									className={DATA_TABLE_BODY_ROW_CLICKABLE}
								>
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
													className="subtitle-2 text-slate-700 whitespace-nowrap truncate"
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
										{license.status && statusBadge(license.status)}
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
										{license.licenseExpiryDate ? (
											<FormattedDate
												date={license.licenseExpiryDate}
												className="body-2"
											/>
										) : (
											<span className="body-2 text-slate-400">-</span>
										)}
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
									<TableCell className="py-4 text-right">
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
			</CardContent>
		</Card>
	);
}
