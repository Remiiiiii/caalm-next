"use client";

import { Loader2 } from "lucide-react";
import type { Models } from "node-appwrite";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { type AppUser, fetchUserNamesByIds } from "@/lib/actions/user.actions";
import { convertFileSize } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import ActionDropdown from "./ActionDropdown";
import FormattedDateTime, { FormattedDate } from "./FormattedDateTime";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";

// Map contract status to badge color and label (aligned with licenses / style guide)
const statusBadge = (
	status: string,
	isExpired?: boolean,
	contractExpiryDate?: string,
) => {
	const isContractExpired =
		status?.toLowerCase() === "expired" ||
		isExpired ||
		(contractExpiryDate && new Date(contractExpiryDate) < new Date());

	if (isContractExpired) {
		return (
			<span className="inline-block px-1.5 py-0.5 border border-red/20 bg-red/10 text-red text-xs rounded-md font-medium">
				Expired
			</span>
		);
	}

	switch (status) {
		case "pending-review":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-orange/20 bg-orange/10 text-orange text-xs rounded-md font-medium">
					Pending Review
				</span>
			);
		case "action-required":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-red/20 bg-red/10 text-red text-xs rounded-md font-medium">
					Action Required
				</span>
			);
		case "active":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-green/20 bg-green/10 text-green text-xs rounded-md font-medium">
					Active
				</span>
			);
		case "inactive":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
					Inactive
				</span>
			);
		default:
			return (
				<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-md font-medium">
					{status || "Unknown"}
				</span>
			);
	}
};

// Map risk level to badge color and label
const riskLevelBadge = (risk: string) => {
	let color = "";
	switch (risk.toLowerCase()) {
		case "critical":
			color = "border border-slate-700 bg-slate-900 text-white";
			break;
		case "high":
			color = "border border-red/20 bg-red/10 text-red";
			break;
		case "medium":
			color = "border border-orange/20 bg-orange/10 text-orange";
			break;
		case "low":
			color = "border border-green/20 bg-green/10 text-green";
			break;
		default:
			color = "border border-slate-200 bg-slate-100 text-slate-800";
	}
	const label = risk.charAt(0).toUpperCase() + risk.slice(1).toLowerCase();
	return (
		<span
			className={`inline-block px-1.5 py-0.5 text-xs rounded-md font-medium ${color}`}
		>
			{label} Risk
		</span>
	);
};

function MetaRow({
	label,
	children,
	emphasize,
}: {
	label: string;
	children: React.ReactNode;
	emphasize?: "danger" | "warning";
}) {
	const valueClass =
		emphasize === "danger"
			? "text-[#E5252A] font-semibold"
			: emphasize === "warning"
				? "text-orange font-semibold"
				: "text-slate-900 font-medium";

	return (
		<div className="flex items-start justify-between gap-3 min-w-0 py-1.5 border-b border-slate-200/60 last:border-b-0">
			<span className="text-xs sm:text-sm text-slate-500 shrink-0 pt-0.5">
				{label}
			</span>
			<div
				className={`min-w-0 text-right text-xs sm:text-sm wrap-anywhere ${valueClass}`}
			>
				{children}
			</div>
		</div>
	);
}

interface CardProps {
	file: UIFileDoc;
	status?: string;
	amount?: number;
	vendor?: string;
	expirationDate?: string;
	assignedTo?: string;
	assignedToDepartment?: string;
	assignedManagers?: string[];
	onRefresh?: () => void;
	userRole?: "executive" | "admin" | "manager";
	onPreview?: () => void;
}

const Card = ({
	file,
	status,
	amount,
	vendor,
	expirationDate,
	assignedTo: propAssignedTo,
	assignedToDepartment: propAssignedToDepartment,
	onRefresh,
	userRole,
	onPreview,
}: CardProps) => {
	const [contractStatus, setContractStatus] = useState<string | undefined>(
		status || file.status,
	);
	const [contractAmount, setContractAmount] = useState<number | undefined>(
		amount || file.amount,
	);
	const [contractVendor, setContractVendor] = useState<string | undefined>(
		vendor || file.vendor,
	);
	const formattedContractAmount = new Intl.NumberFormat("en-US", {
		minimumFractionDigits: 2, // Ensure at least two decimal places (e.g., .00)
		maximumFractionDigits: 2, // Limit to two decimal places
		useGrouping: true, // Automatically adds commas for thousands
	}).format(contractAmount || 0);

	const [contractExpiryDate, setContractExpiryDate] = useState<
		string | undefined
	>(expirationDate || file.contractExpiryDate);
	const [assignedTo, setAssignedTo] = useState<string | undefined>(
		propAssignedTo ||
			(Array.isArray(file.assignedManagers)
				? file.assignedManagers.join(", ")
				: file.assignedManagers),
	);
	const [assignedToDepartment, setAssignedToDepartment] = useState<
		string | undefined
	>(propAssignedToDepartment || file.department);
	const [ownerName, setOwnerName] = useState<string | null>(
		typeof file.owner === "object" && file.owner?.fullName
			? file.owner.fullName
			: null,
	);
	const [isLoadingOwnerName, setIsLoadingOwnerName] = useState(false);
	const [contractOwnerId, setContractOwnerId] = useState<string | null>(null);
	const [contractLoaded, setContractLoaded] = useState(false);
	const [assignedManagerUsers, setAssignedManagerUsers] = useState<AppUser[]>(
		[],
	);
	const [loadingManagers, setLoadingManagers] = useState(false);
	const [managerProfileImages, setManagerProfileImages] = useState<
		Record<string, string>
	>({});
	const [failedProfileImages, setFailedProfileImages] = useState<Set<string>>(
		new Set(),
	);
	const [riskLevel, setRiskLevel] = useState<string | undefined>(
		(file as any).riskLevel || undefined,
	);

	// Sync local state with file prop changes (for real-time updates)
	useEffect(() => {
		setContractStatus(status || file.status);
	}, [status, file.status]);

	useEffect(() => {
		setContractExpiryDate(expirationDate || file.contractExpiryDate);
	}, [expirationDate, file.contractExpiryDate]);

	// Fetch owner name - prioritize contractOwnerId if contract exists
	useEffect(() => {
		const fetchOwnerName = async () => {
			// Wait for contract to load if we're trying to fetch it (check for contract indicators)
			const mightHaveContract =
				file.contractId || file.contractName || file.status;
			if (mightHaveContract && !contractLoaded) {
				return;
			}

			// If we already have a valid name (not "Unknown"), don't re-fetch
			// But allow re-fetch if contractOwnerId becomes available
			if (ownerName && ownerName !== "Unknown" && !contractOwnerId) {
				return;
			}

			setIsLoadingOwnerName(true);
			try {
				let userIdToFetch: string | null = null;

				// For contracts, prioritize contractOwnerId from the contract document
				if (contractOwnerId) {
					userIdToFetch = contractOwnerId;
				}
				// Fall back to file.owner if no contract owner found
				else if (typeof file.owner === "string" && file.owner) {
					userIdToFetch = file.owner;
				} else if (typeof file.owner === "object" && file.owner?.fullName) {
					// Already have the name, no need to fetch
					setOwnerName(file.owner.fullName);
					setIsLoadingOwnerName(false);
					return;
				}

				if (userIdToFetch) {
					try {
						const users = await fetchUserNamesByIds([userIdToFetch]);

						if (users && Array.isArray(users) && users.length > 0) {
							const user =
								users.find(
									(u) =>
										u?.$id === userIdToFetch || u?.accountId === userIdToFetch,
								) || users[0];
							if (user?.fullName) {
								setOwnerName(user.fullName);
							} else {
								console.warn(
									`[Card] User found but no fullName for ID: ${userIdToFetch}. User object:`,
									user,
								);
								setOwnerName("Unknown");
							}
						} else {
							console.warn(
								`[Card] User not found for ID: ${userIdToFetch}. API returned:`,
								users,
							);
							setOwnerName("Unknown");
						}
					} catch (fetchError) {
						console.error(
							`[Card] Error fetching user name for ID ${userIdToFetch}:`,
							fetchError,
						);
						setOwnerName("Unknown");
					}
				} else {
					setOwnerName("Unknown");
				}
			} catch (error) {
				console.error("Failed to fetch owner name:", error);
				setOwnerName("Unknown");
			} finally {
				setIsLoadingOwnerName(false);
			}
		};

		fetchOwnerName();
	}, [
		file.owner,
		file.contractId,
		contractOwnerId,
		contractLoaded,
		file.status,
		file.contractName,
		ownerName,
	]);

	useEffect(() => {
		// Fetch contract data - try both contractId and fileId lookup
		if (!contractLoaded) {
			(async () => {
				try {
					// Dynamically import to avoid SSR issues
					const { getContracts } = await import("@/lib/actions/file.actions");
					const contractsRes = await getContracts();
					const contracts = Array.isArray(contractsRes.documents)
						? contractsRes.documents
						: [];

					// Try to find contract by contractId first
					let contract = file.contractId
						? contracts.find((c: Models.Document) => c.$id === file.contractId)
						: null;

					// If not found and file has an ID, try finding by fileId
					if (!contract && file.$id) {
						contract = contracts.find(
							(c: any) =>
								(c.fileId && c.fileId === file.$id) ||
								(c.fileRef && c.fileRef === file.$id),
						);
					}

					if (contract) {
						// Update contract status if not already set
						if (!status && !file.status && contract.status) {
							setContractStatus(contract.status);
						}

						if (contract.amount) {
							setContractAmount(contract.amount);
						}

						if (contract.contractExpiryDate) {
							setContractExpiryDate(contract.contractExpiryDate);
						}

						if (contract.assignedTo) {
							setAssignedTo(contract.assignedTo);
						}

						if (contract.assignedToDepartment) {
							setAssignedToDepartment(contract.assignedToDepartment);
						}

						if (contract.vendor) {
							setContractVendor(contract.vendor);
						}

						// Store riskLevel from contract (prefer contract data over file prop)
						if (contract.riskLevel) {
							setRiskLevel(contract.riskLevel);
						} else if ((file as any).riskLevel && !riskLevel) {
							// Fallback to file prop if contract doesn't have it
							setRiskLevel((file as any).riskLevel);
						}

						// Store contractOwnerId for owner name lookup
						if (contract.contractOwnerId) {
							console.log("Found contractOwnerId:", contract.contractOwnerId);
							setContractOwnerId(contract.contractOwnerId);
						}
					}
					setContractLoaded(true);
				} catch (error) {
					console.error("Failed to fetch contract:", error);
					setContractLoaded(true); // Mark as loaded even on error to prevent infinite retries
				}
			})();
		}
	}, [
		file.contractId,
		file.$id,
		status,
		file.status,
		contractLoaded,
		riskLevel,
		(file as any).riskLevel,
	]);

	// Fetch assigned manager user data - render immediately, fetch async
	useEffect(() => {
		const fetchAssignedManagers = async () => {
			let managers: string[] = [];

			// Get manager IDs - could be IDs or names
			if (
				Array.isArray(file.assignedManagers) &&
				file.assignedManagers.length > 0
			) {
				managers = file.assignedManagers;
			} else if (typeof file.assignedManagers === "string") {
				managers = [file.assignedManagers];
			} else if (assignedTo && typeof assignedTo === "string") {
				// Fallback to assignedTo if assignedManagers is not available
				managers = assignedTo.split(",").map((m) => m.trim());
			}

			if (managers.length === 0) {
				setAssignedManagerUsers([]);
				setLoadingManagers(false);
				return;
			}

			const managerIdsArray = managers.map((m) => m.trim()).filter(Boolean);

			if (managerIdsArray.length === 0) {
				setAssignedManagerUsers([]);
				setLoadingManagers(false);
				return;
			}

			// Set loading state and show fallback immediately
			setLoadingManagers(true);

			// Create fallback users immediately so UI renders
			const fallbackUsers: AppUser[] = managerIdsArray.map((manager) => ({
				$id: manager,
				fullName: manager,
				email: "",
				avatar: "",
				accountId: manager,
				role: "viewer" as const,
				profileImageId: null,
			}));
			setAssignedManagerUsers(fallbackUsers);

			try {
				const users = await fetchUserNamesByIds(managerIdsArray);
				const fileManagers: AppUser[] = [];

				// Map users by their IDs, accountIds, and fullNames
				const userMap = new Map<string, AppUser>();
				users.forEach((user) => {
					if (user.$id) userMap.set(user.$id, user);
					if (user.accountId) userMap.set(user.accountId, user);
					if (user.fullName) userMap.set(user.fullName, user);
				});

				managerIdsArray.forEach((manager) => {
					const user = userMap.get(manager);
					if (user) {
						fileManagers.push(user);
					} else {
						// If not found, create a mock user from the name
						fileManagers.push({
							$id: manager,
							fullName: manager,
							email: "",
							avatar: "",
							accountId: manager,
							role: "viewer" as const,
							profileImageId: null,
						});
					}
				});

				// Generate profile image URLs for users with profileImageId
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
				setAssignedManagerUsers(fileManagers);
			} catch (error) {
				console.error("Failed to fetch assigned manager users:", error);
				setAssignedManagerUsers([]);
			} finally {
				setLoadingManagers(false);
			}
		};

		fetchAssignedManagers();
	}, [file.assignedManagers, assignedTo]);

	// Memoized handler for image load errors
	const handleImageError = useCallback((userId: string, accountId?: string) => {
		setFailedProfileImages((prev) => {
			const newSet = new Set(prev);
			if (userId) newSet.add(userId);
			if (accountId) newSet.add(accountId);
			return newSet;
		});
	}, []);

	const renderAssignedManagers = () => {
		// Show content immediately - either loaded users or fallback
		if (assignedManagerUsers.length === 0) {
			// Only show loading if we have no data at all
			if (loadingManagers) {
				return (
					<span className="body-2 text-slate-400 inline-flex items-center gap-1.5">
						<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
						Loading...
					</span>
				);
			}
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
			if (assignedTo) {
				return <span className="body-2">{assignedTo}</span>;
			}
			return null;
		}

		return (
			<ManagerAvatars
				managers={assignedManagerUsers}
				profileImages={managerProfileImages}
				failedImages={failedProfileImages}
				onImageError={handleImageError}
			/>
		);
	};

	const handleCardClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onPreview?.();
	};

	const displayName = file.contractName || file.name || "Untitled";
	const isExpired =
		contractStatus?.toLowerCase() === "expired" ||
		file.isExpired ||
		(contractExpiryDate ? new Date(contractExpiryDate) < new Date() : false);
	const daysUntilExpiry = contractExpiryDate
		? Math.ceil(
				(new Date(contractExpiryDate).getTime() - Date.now()) /
					(1000 * 60 * 60 * 24),
			)
		: null;
	const isExpiringSoon =
		!isExpired &&
		daysUntilExpiry != null &&
		daysUntilExpiry >= 0 &&
		daysUntilExpiry <= 90;
	const departmentLabel = assignedToDepartment
		? String(assignedToDepartment).replace(/-/g, " ")
		: null;

	return (
		<div
			className="glass-card interactive-glass-card relative flex h-full w-full min-w-0 cursor-pointer flex-col gap-3 p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200"
			data-equal-height-card
			onClick={handleCardClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onPreview?.();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className="glass-card-cap" />

			<div className="flex items-start justify-between gap-3 mt-2 min-w-0">
				<Thumbnail
					type={file.type}
					extension={file.extension}
					url={file.url}
					className="size-12 sm:size-14 shrink-0"
					imageClassName="!size-8 sm:!size-9"
				/>
				<div
					className="flex flex-col items-end gap-1.5 shrink-0"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<ActionDropdown
						file={file}
						onStatusChange={() => {
							if (onRefresh) {
								onRefresh();
							}
						}}
						onRefresh={onRefresh}
						onExpiryDateChange={(newExpiryDate: string) => {
							setContractExpiryDate(newExpiryDate);
							if (onRefresh) {
								onRefresh();
							}
						}}
						userRole={userRole}
					/>
					{file.size != null && file.size > 0 && (
						<span className="text-[10px] text-slate-500 tabular-nums">
							{convertFileSize({ sizeInBytes: file.size })}
						</span>
					)}
				</div>
			</div>

			<div className="min-w-0 space-y-2">
				<p className="subtitle-2 line-clamp-2 wrap-break-word text-slate-900">
					{displayName}
				</p>
				<div className="flex items-center gap-2 flex-wrap">
					{(contractStatus || isExpired) &&
						statusBadge(
							contractStatus || "expired",
							file.isExpired,
							contractExpiryDate,
						)}
					{riskLevel && riskLevelBadge(riskLevel)}
					{departmentLabel && (
						<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-white/50 text-slate-600 text-xs rounded-md font-medium capitalize">
							{departmentLabel}
						</span>
					)}
				</div>
			</div>

			<div className="min-w-0 rounded-lg bg-white/40 border border-white/50 px-3 py-1">
				{contractAmount != null && (
					<MetaRow label="Value">
						${formattedContractAmount} USD
					</MetaRow>
				)}
				{contractVendor && (
					<MetaRow label="Vendor">{contractVendor}</MetaRow>
				)}
				{file.$createdAt && (
					<MetaRow label="Uploaded">
						<FormattedDateTime
							date={file.$createdAt}
							className="text-inherit"
						/>
					</MetaRow>
				)}
				{contractExpiryDate && (
					<MetaRow
						label={isExpired ? "Expired" : "Expires"}
						emphasize={
							isExpired ? "danger" : isExpiringSoon ? "warning" : undefined
						}
					>
						<FormattedDate
							date={contractExpiryDate}
							className="text-inherit"
						/>
					</MetaRow>
				)}
				{(assignedTo ||
					assignedManagerUsers.length > 0 ||
					loadingManagers ||
					(Array.isArray(file.assignedManagers) &&
						file.assignedManagers.length > 0)) && (
					<MetaRow label="Assigned">
						<div className="flex items-center justify-end flex-wrap gap-1">
							{renderAssignedManagers()}
						</div>
					</MetaRow>
				)}
			</div>

			<p className="caption mt-auto line-clamp-1 wrap-break-word text-slate-500">
				By:{" "}
				{isLoadingOwnerName ? (
					<span className="inline-flex items-center gap-1 align-middle">
						<Loader2 className="h-3 w-3 animate-spin shrink-0" />
						Loading...
					</span>
				) : (
					ownerName ||
					(typeof file.owner === "object" && file.owner?.fullName
						? file.owner.fullName
						: "Unknown")
				)}
			</p>
		</div>
	);
};

export default Card;
