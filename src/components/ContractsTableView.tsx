"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cn, convertFileSize, getProfilePictureUrl } from "@/lib/utils";
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

/** Build avatar URL map from user docs (uploaded photo or storage file id). */
function collectProfileImages(users: AppUser[]): Record<string, string> {
	const images: Record<string, string> = {};
	for (const user of users) {
		const avatarValue = user.avatar?.trim();
		let url: string | null = null;
		if (avatarValue && /^https?:\/\//i.test(avatarValue)) {
			url = avatarValue;
		} else if (avatarValue?.startsWith("/")) {
			url = avatarValue;
		} else {
			const fileId =
				(avatarValue &&
				!avatarValue.startsWith("/") &&
				!/^https?:\/\//i.test(avatarValue)
					? avatarValue
					: null) ||
				user.profileImageId?.trim() ||
				null;
			url = getProfilePictureUrl(fileId);
		}
		if (!url) continue;
		if (user.$id) images[user.$id] = url;
		if (user.accountId) images[user.accountId] = url;
	}
	return images;
}

function stubUserFromLabel(label: string): AppUser {
	return {
		$id: label,
		fullName: label,
		email: "",
		avatar: "",
		accountId: label,
		role: "viewer" as const,
		profileImageId: null,
	};
}

/** Stable id list so new array refs from RSC refresh don't re-fetch forever. */
function assignedManagersKey(file: UIFileDoc): string {
	if (Array.isArray(file.assignedManagers) && file.assignedManagers.length > 0) {
		return file.assignedManagers
			.map((manager) => String(manager).trim())
			.filter(Boolean)
			.join("|");
	}
	if (typeof file.assignedManagers === "string") {
		return String(file.assignedManagers).trim();
	}
	return "";
}

function statusBadge(file: UIFileDoc) {
	const expired = isContractExpired(file);
	const status = expired
		? "expired"
		: file.lifecycleStatus === "negotiation"
			? "negotiation"
			: file.status || "";
	const labelMap: Record<string, string> = {
		"pending-review": "Pending Review",
		"action-required": "Action Required",
		active: "Active",
		inactive: "Inactive",
		expired: "Expired",
		negotiation: "Negotiation",
	};
	const classMap: Record<string, string> = {
		active: "bg-green/10 text-green border-green/20",
		"pending-review": "bg-orange/10 text-orange border-orange/20",
		"action-required": "bg-red/10 text-red border-red/20",
		inactive: "bg-slate-100 text-slate-600 border-slate-200",
		expired: "bg-red/10 text-red border-red/20",
		negotiation: "bg-orange/10 text-orange border-orange/20",
	};
	return (
		<span
			className={cn(
				"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
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
	const [ownerUsers, setOwnerUsers] = useState<Record<string, AppUser>>({});
	const [loadingOwners, setLoadingOwners] = useState<Record<string, boolean>>(
		{},
	);
	const [assignedManagerUsers, setAssignedManagerUsers] = useState<
		Record<string, AppUser[]>
	>({});
	const [loadingManagers, setLoadingManagers] = useState<
		Record<string, boolean>
	>({});
	const [profileImages, setProfileImages] = useState<Record<string, string>>(
		{},
	);
	const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
		new Set(),
	);

	const visibleIds = allVisibleIds || files.map((f) => f.$id);
	const allSelected =
		visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
	const rowPad = density === "compact" ? "py-2" : "py-4";

	// Content-stable keys: RSC/HMR refresh gives new array refs with the same data.
	const ownersSignature = useMemo(
		() =>
			files
				.map((file) => {
					const ownerId =
						(typeof file.contractOwnerId === "string" &&
							file.contractOwnerId.trim()) ||
						(typeof file.owner === "string" && file.owner.trim()) ||
						(typeof file.owner === "object" &&
						file.owner &&
						"fullName" in file.owner
							? `name:${(file.owner as { fullName: string }).fullName}`
							: "");
					return `${file.$id}:${ownerId}`;
				})
				.sort()
				.join(";"),
		[files],
	);
	const managersSignature = useMemo(
		() =>
			files
				.map((file) => `${file.$id}:${assignedManagersKey(file)}`)
				.sort()
				.join(";"),
		[files],
	);
	const loadedOwnersSignatureRef = useRef("");
	const loadedManagersSignatureRef = useRef("");
	const ownerUsersRef = useRef(ownerUsers);
	ownerUsersRef.current = ownerUsers;
	const assignedManagerUsersRef = useRef(assignedManagerUsers);
	assignedManagerUsersRef.current = assignedManagerUsers;

	// Fetch owner users for all contracts (avatar / initials in the By column)
	useEffect(() => {
		if (ownersSignature === loadedOwnersSignatureRef.current) return;

		const fetchAllOwners = async () => {
			const ownerIds = new Set<string>();
			const ownerIdToFileId = new Map<string, string[]>();
			const inlineOwners: Record<string, AppUser> = {};

			files.forEach((file) => {
				let userId: string | null = null;

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
					const ownerObj = file.owner as {
						fullName: string;
						$id?: string;
						accountId?: string;
						avatar?: string;
						profileImageId?: string | null;
						email?: string;
					};
					if (ownerObj.fullName) {
						inlineOwners[file.$id] = {
							$id: ownerObj.$id || ownerObj.fullName,
							fullName: ownerObj.fullName,
							email: ownerObj.email || "",
							avatar: ownerObj.avatar || "",
							accountId: ownerObj.accountId || ownerObj.$id || ownerObj.fullName,
							role: "viewer" as const,
							profileImageId: ownerObj.profileImageId ?? null,
						};
						return;
					}
				}

				if (
					userId &&
					userId.length > 0 &&
					!ownerUsersRef.current[file.$id] &&
					!inlineOwners[file.$id]
				) {
					ownerIds.add(userId);
					if (!ownerIdToFileId.has(userId)) {
						ownerIdToFileId.set(userId, []);
					}
					ownerIdToFileId.get(userId)?.push(file.$id);
				}
			});

			if (Object.keys(inlineOwners).length > 0) {
				setOwnerUsers((prev) => ({ ...prev, ...inlineOwners }));
				setProfileImages((prev) => ({
					...prev,
					...collectProfileImages(Object.values(inlineOwners)),
				}));
			}

			if (ownerIds.size === 0) {
				loadedOwnersSignatureRef.current = ownersSignature;
				return;
			}

			const userIdsArray = Array.from(ownerIds);
			setLoadingOwners((prev) => {
				const newLoading = { ...prev };
				userIdsArray.forEach((id) => {
					ownerIdToFileId.get(id)?.forEach((fileId) => {
						if (!ownerUsersRef.current[fileId]) {
							newLoading[fileId] = true;
						}
					});
				});
				return newLoading;
			});

			try {
				const users = await fetchUserNamesByIds(userIdsArray);
				const userMap = new Map<string, AppUser>();
				users.forEach((user) => {
					if (user.$id) userMap.set(user.$id, user);
					if (user.accountId) userMap.set(user.accountId, user);
				});

				const newOwnerUsers: Record<string, AppUser> = {};
				userIdsArray.forEach((userId) => {
					const user = userMap.get(userId) || stubUserFromLabel("Unknown");
					ownerIdToFileId.get(userId)?.forEach((fileId) => {
						newOwnerUsers[fileId] = user;
					});
				});

				setOwnerUsers((prev) => ({ ...prev, ...newOwnerUsers }));
				setProfileImages((prev) => ({
					...prev,
					...collectProfileImages(users),
				}));
				loadedOwnersSignatureRef.current = ownersSignature;
			} catch (error) {
				console.error("Failed to fetch owner names:", error);
				toast({
					title: "Error",
					description: "Failed to load contract owner information.",
					variant: "destructive",
				});
				userIdsArray.forEach((userId) => {
					ownerIdToFileId.get(userId)?.forEach((fileId) => {
						setOwnerUsers((prev) => ({
							...prev,
							[fileId]: stubUserFromLabel("Unknown"),
						}));
					});
				});
				loadedOwnersSignatureRef.current = ownersSignature;
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

		void fetchAllOwners();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- files covered by ownersSignature
	}, [ownersSignature, toast]);

	// Fetch assigned manager user data
	useEffect(() => {
		if (managersSignature === loadedManagersSignatureRef.current) return;

		const fetchAssignedManagers = async () => {
			const managerIds = new Set<string>();
			const managerIdToFileId = new Map<string, string[]>();

			files.forEach((file) => {
				const key = assignedManagersKey(file);
				if (!key) return;
				key.split("|").forEach((manager) => {
					if (!manager) return;
					managerIds.add(manager);
					if (!managerIdToFileId.has(manager)) {
						managerIdToFileId.set(manager, []);
					}
					managerIdToFileId.get(manager)?.push(file.$id);
				});
			});

			if (managerIds.size === 0) {
				loadedManagersSignatureRef.current = managersSignature;
				return;
			}

			const managerIdsArray = Array.from(managerIds);

			setLoadingManagers((prev) => {
				const newLoading = { ...prev };
				managerIdsArray.forEach((id) => {
					managerIdToFileId.get(id)?.forEach((fileId) => {
						if (!assignedManagerUsersRef.current[fileId]) {
							newLoading[fileId] = true;
						}
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

				files.forEach((file) => {
					const key = assignedManagersKey(file);
					if (!key) return;
					const fileManagers: AppUser[] = [];
					key.split("|").forEach((manager) => {
						const user = userMap.get(manager);
						if (user) {
							fileManagers.push(user);
						} else {
							fileManagers.push(stubUserFromLabel(manager));
						}
					});
					if (fileManagers.length > 0) {
						newManagerUsers[file.$id] = fileManagers;
					}
				});

				setProfileImages((prev) => ({
					...prev,
					...collectProfileImages(users),
				}));
				setAssignedManagerUsers((prev) => ({ ...prev, ...newManagerUsers }));
				loadedManagersSignatureRef.current = managersSignature;
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

		void fetchAssignedManagers();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- files covered by managersSignature
	}, [managersSignature, toast]);

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
			// Fallback: show initials from raw assignedManagers labels
			const key = assignedManagersKey(file);
			if (key) {
				const stubs = key.split("|").filter(Boolean).map(stubUserFromLabel);
				return (
					<ManagerAvatars
						managers={stubs}
						profileImages={profileImages}
						failedImages={failedProfileImages}
						onImageError={handleImageError}
					/>
				);
			}
			return <span className="body-2 text-slate-400">-</span>;
		}

		return (
			<ManagerAvatars
				managers={managers}
				profileImages={profileImages}
				failedImages={failedProfileImages}
				onImageError={handleImageError}
			/>
		);
	};

	const renderOwner = (file: UIFileDoc) => {
		const owner = ownerUsers[file.$id];
		const isLoading = loadingOwners[file.$id] && !owner;

		if (isLoading) {
			return (
				<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
					<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
					Loading...
				</span>
			);
		}

		if (!owner) {
			return <span className="body-2 text-slate-400">-</span>;
		}

		return (
			<ManagerAvatars
				managers={[owner]}
				profileImages={profileImages}
				failedImages={failedProfileImages}
				onImageError={handleImageError}
				ariaLabel="Contract owner"
			/>
		);
	};

	if (files.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center text-center py-12 px-4">
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
						<TableHead className={`${DATA_TABLE_HEADER_CELL} px-3`}>
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
							<TableCell className={cn(rowPad)}>
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
								{renderOwner(file)}
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
