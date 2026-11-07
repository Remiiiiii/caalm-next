"use client";

import { Loader2 } from "lucide-react";
import type { Models } from "node-appwrite";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { ContractApprovalStatusCell } from "@/components/contracts/ContractApprovalStatusCell";
import { getAvatarColor } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AppUser, fetchUserNamesByIds } from "@/lib/actions/user.actions";
import {
	contractSubStatus,
	daysToExpiry,
	formatValueAbbrev,
	getExpiryTier,
} from "@/lib/contracts/contract-card-format";
import { cn, convertFileSize, getProfilePictureUrl } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import ActionDropdown from "./ActionDropdown";
import { FormattedDate } from "./FormattedDateTime";
import Thumbnail from "./Thumbnail";

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
			color = "border border-slate-200 bg-slate-100 text-slate-700";
	}
	const label = `${risk.charAt(0).toUpperCase()}${risk.slice(1).toLowerCase()} risk`;
	return (
		<span
			className={`inline-flex whitespace-nowrap px-1.5 py-0.5 text-xs rounded-full ${color}`}
		>
			{label}
		</span>
	);
};

type FooterPerson = {
	id: string;
	name: string;
	imageUrl: string | null;
};

/** Overlapping avatars within one role (Assigned by OR Assigned to — never mixed). */
function RoleAvatarStack({
	people,
	ariaLabel,
}: {
	people: FooterPerson[];
	ariaLabel: string;
}) {
	if (people.length === 0) return null;
	const shown = people.slice(0, 3);
	const more = people.length - shown.length;
	const allNames = people.map((p) => p.name).join(", ");

	return (
		<TooltipProvider delayDuration={200}>
			<div
				className="flex shrink-0 items-center"
				role="list"
				aria-label={`${ariaLabel} ${allNames}`}
			>
				{shown.map((person, index) => {
					const initials = person.name
						.split(" ")
						.map((n) => n.charAt(0))
						.join("")
						.toUpperCase()
						.slice(0, 2);
					const color = getAvatarColor(person.id);
					return (
						<Tooltip key={person.id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									role="listitem"
									aria-label={person.name}
									className={cn(
										"relative inline-flex h-7 w-7 cursor-default items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
										index > 0 && "-ml-[7px]",
									)}
									style={
										person.imageUrl ? undefined : { backgroundColor: color }
									}
									onClick={(e) => e.stopPropagation()}
								>
									{person.imageUrl ? (
										// eslint-disable-next-line @next/next/no-img-element -- remote Appwrite profile URLs
										<img
											src={person.imageUrl}
											alt=""
											className="h-full w-full object-cover"
										/>
									) : (
										initials || "?"
									)}
								</button>
							</TooltipTrigger>
							<TooltipContent side="top">{person.name}</TooltipContent>
						</Tooltip>
					);
				})}
				{more > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								aria-label={`${more} more: ${people
									.slice(3)
									.map((p) => p.name)
									.join(", ")}`}
								className="-ml-[7px] inline-flex h-7 w-7 cursor-default items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								onClick={(e) => e.stopPropagation()}
							>
								+{more}
							</button>
						</TooltipTrigger>
						<TooltipContent side="top">
							{people
								.slice(3)
								.map((p) => p.name)
								.join(", ")}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</TooltipProvider>
	);
}

function AssignmentFooterGroup({
	label,
	people,
}: {
	label: string;
	people: FooterPerson[];
}) {
	if (people.length === 0) return null;

	return (
		<div className="flex min-w-0 items-center gap-1.5">
			<span className="shrink-0 text-[11px] font-medium text-slate-500">
				{label}
			</span>
			<RoleAvatarStack people={people} ariaLabel={label} />
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
		amount ?? file.amount,
	);
	const [contractVendor, setContractVendor] = useState<string | undefined>(
		vendor || file.vendor,
	);

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
	const [ownerImageUrl, setOwnerImageUrl] = useState<string | null>(null);
	const [contractLoaded, setContractLoaded] = useState(false);
	const [assignedManagerUsers, setAssignedManagerUsers] = useState<AppUser[]>(
		[],
	);
	const [managerProfileImages, setManagerProfileImages] = useState<
		Record<string, string>
	>({});
	const [riskLevel, setRiskLevel] = useState<string | undefined>(
		file.riskLevel || undefined,
	);

	useEffect(() => {
		setContractStatus(status || file.status);
	}, [status, file.status]);

	useEffect(() => {
		setContractExpiryDate(expirationDate || file.contractExpiryDate);
	}, [expirationDate, file.contractExpiryDate]);

	useEffect(() => {
		setContractAmount(amount ?? file.amount);
	}, [amount, file.amount]);

	useEffect(() => {
		setContractVendor(vendor || file.vendor);
	}, [vendor, file.vendor]);

	useEffect(() => {
		const fetchOwnerName = async () => {
			const mightHaveContract =
				file.contractId || file.contractName || file.status;
			if (mightHaveContract && !contractLoaded) {
				return;
			}

			if (ownerName && ownerName !== "Unknown" && !contractOwnerId) {
				return;
			}

			setIsLoadingOwnerName(true);
			try {
				let userIdToFetch: string | null = null;

				if (contractOwnerId) {
					userIdToFetch = contractOwnerId;
				} else if (typeof file.owner === "string" && file.owner) {
					userIdToFetch = file.owner;
				} else if (typeof file.owner === "object" && file.owner?.fullName) {
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
								const fromProfile = getProfilePictureUrl(
									user.profileImageId ?? null,
								);
								if (fromProfile) setOwnerImageUrl(fromProfile);
							} else {
								setOwnerName("Unknown");
							}
						} else {
							setOwnerName("Unknown");
						}
					} catch {
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

		void fetchOwnerName();
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
		if (!contractLoaded) {
			(async () => {
				try {
					const { getContracts } = await import("@/lib/actions/file.actions");
					const contractsRes = await getContracts();
					const contracts = Array.isArray(contractsRes.documents)
						? contractsRes.documents
						: [];

					let contract = file.contractId
						? contracts.find((c: Models.Document) => c.$id === file.contractId)
						: null;

					if (!contract && file.$id) {
						contract = contracts.find(
							(c: Models.Document & { fileId?: string; fileRef?: string }) =>
								(c.fileId && c.fileId === file.$id) ||
								(c.fileRef && c.fileRef === file.$id),
						);
					}

					if (contract) {
						const c = contract as Models.Document & {
							status?: string;
							amount?: number;
							contractExpiryDate?: string;
							assignedTo?: string;
							assignedToDepartment?: string;
							vendor?: string;
							riskLevel?: string;
							contractOwnerId?: string;
						};
						if (!status && !file.status && c.status) {
							setContractStatus(c.status);
						}
						if (c.amount) setContractAmount(c.amount);
						if (c.contractExpiryDate) {
							setContractExpiryDate(c.contractExpiryDate);
						}
						if (c.assignedTo) setAssignedTo(c.assignedTo);
						if (c.assignedToDepartment) {
							setAssignedToDepartment(c.assignedToDepartment);
						}
						if (c.vendor) setContractVendor(c.vendor);
						if (c.riskLevel) {
							setRiskLevel(c.riskLevel);
						} else if (file.riskLevel && !riskLevel) {
							setRiskLevel(file.riskLevel);
						}
						if (c.contractOwnerId) {
							setContractOwnerId(c.contractOwnerId);
						}
					}
					setContractLoaded(true);
				} catch (error) {
					console.error("Failed to fetch contract:", error);
					setContractLoaded(true);
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
		file.riskLevel,
	]);

	const managersKey = useMemo(() => {
		if (
			Array.isArray(file.assignedManagers) &&
			file.assignedManagers.length > 0
		) {
			return file.assignedManagers.map((m) => String(m).trim()).join("|");
		}
		if (typeof file.assignedManagers === "string") {
			return String(file.assignedManagers).trim();
		}
		return typeof assignedTo === "string" ? assignedTo.trim() : "";
	}, [file.assignedManagers, assignedTo]);

	useEffect(() => {
		const fetchAssignedManagers = async () => {
			let managers: string[] = [];

			if (
				Array.isArray(file.assignedManagers) &&
				file.assignedManagers.length > 0
			) {
				managers = file.assignedManagers;
			} else if (typeof file.assignedManagers === "string") {
				managers = [file.assignedManagers];
			} else if (assignedTo && typeof assignedTo === "string") {
				managers = assignedTo.split(",").map((m) => m.trim());
			}

			if (managers.length === 0) {
				setAssignedManagerUsers([]);
				return;
			}

			const managerIdsArray = managers.map((m) => m.trim()).filter(Boolean);
			if (managerIdsArray.length === 0) {
				setAssignedManagerUsers([]);
				return;
			}

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
							if (user.$id) newProfileImages[user.$id] = imageUrl;
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
			}
		};

		void fetchAssignedManagers();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- managersKey is content-stable
	}, [managersKey]);

	const handleCardClick = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();
			onPreview?.();
		},
		[onPreview],
	);

	const displayName = file.contractName || file.name || "Untitled";
	const days = daysToExpiry(contractExpiryDate);
	const tier = getExpiryTier(days);
	const valueFmt = formatValueAbbrev(contractAmount ?? null);
	const subStatus = contractSubStatus(file);
	const departmentLabel = assignedToDepartment
		? String(assignedToDepartment).replace(/-/g, " ")
		: null;

	const expiryFigureClass =
		tier === "expired"
			? "text-red"
			: tier === "warn"
				? "text-orange"
				: "text-slate-700";

	const expiryLabel =
		tier === "expired" ? "EXPIRED" : days == null ? "EXPIRES IN" : "EXPIRES IN";
	const expiryFigure =
		days == null
			? "—"
			: days < 0
				? `-${Math.abs(days)} days ago`
				: `${days} days`;

	const assignedByPeople = useMemo((): FooterPerson[] => {
		if (!ownerName || ownerName === "Unknown") return [];
		return [
			{
				id: contractOwnerId || "owner",
				name: ownerName,
				imageUrl: ownerImageUrl,
			},
		];
	}, [ownerName, contractOwnerId, ownerImageUrl]);

	const assignedToPeople = useMemo((): FooterPerson[] => {
		const people: FooterPerson[] = [];
		const seen = new Set<string>();
		if (contractOwnerId) seen.add(contractOwnerId);
		if (ownerName) seen.add(ownerName);

		for (const manager of assignedManagerUsers) {
			const id = manager.$id || manager.accountId || manager.fullName;
			if (!id || seen.has(id) || seen.has(manager.fullName)) continue;
			seen.add(id);
			seen.add(manager.fullName);
			const imageUrl =
				managerProfileImages[manager.$id] ||
				(manager.accountId
					? managerProfileImages[manager.accountId]
					: undefined) ||
				getProfilePictureUrl(manager.profileImageId ?? null);
			people.push({
				id,
				name: manager.fullName || "Assignee",
				imageUrl,
			});
		}
		return people;
	}, [assignedManagerUsers, managerProfileImages, contractOwnerId, ownerName]);

	const metaSegments: Array<{ key: string; node: ReactNode; warn?: boolean }> =
		[];
	if (file.$createdAt) {
		metaSegments.push({
			key: "uploaded",
			node: (
				<>
					Uploaded{" "}
					<FormattedDate date={file.$createdAt} className="text-inherit" />
				</>
			),
		});
	}
	if (file.size != null && file.size > 0) {
		metaSegments.push({
			key: "size",
			node: convertFileSize({ sizeInBytes: file.size }),
		});
	}
	if (subStatus) {
		metaSegments.push({
			key: "sub",
			node: subStatus,
			warn: true,
		});
	}

	const ariaName = [
		displayName,
		contractVendor || undefined,
		valueFmt.accessible !== "No value on record" ? valueFmt.display : undefined,
		days == null
			? undefined
			: days < 0
				? `expired ${Math.abs(days)} days (-${Math.abs(days)}d)`
				: `expires in ${days} days`,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<div
			className="glass-card interactive-glass-card relative grid h-full w-full min-w-0 cursor-pointer grid-rows-[auto_auto_1fr_auto] gap-0 p-4 transition-all duration-200 hover:border-[#0f5384]/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 sm:p-5"
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
			aria-label={ariaName}
		>
			<div className="glass-card-cap" />

			{/* Zone 1 — header (min-height keeps the strip aligned across the row) */}
			<div className="relative mt-2 flex min-h-[76px] items-start gap-2.5">
				<Thumbnail
					type={file.type}
					extension={file.extension}
					url={file.url}
					className="size-12 sm:size-14 shrink-0"
					imageClassName="!size-8 sm:!size-9"
				/>
				<div className="min-w-0 flex-1 pr-8">
					<p className="line-clamp-2 text-[13.5px] font-bold leading-snug text-slate-700 wrap-break-word">
						{displayName}
					</p>
					<p className="mt-0.5 truncate text-[11px] text-slate-500">
						{contractVendor?.trim() || (
							<span className="text-slate-400">No vendor on record</span>
						)}
					</p>
				</div>
				<div
					className="absolute right-0 top-0 shrink-0"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<ActionDropdown
						file={file}
						onStatusChange={() => onRefresh?.()}
						onRefresh={onRefresh}
						onExpiryDateChange={(newExpiryDate: string) => {
							setContractExpiryDate(newExpiryDate);
							onRefresh?.();
						}}
						userRole={userRole}
					/>
				</div>
			</div>

			{/* Zone 2 — comparison strip (value + time, fixed vertical position) */}
			<div className="mt-3 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200/80 bg-white/50">
				<div className="border-r border-slate-200/80 px-3 py-2.5">
					<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
						Value
					</p>
					<p
						className={cn(
							"mt-0.5 text-[15px] font-bold tabular-nums",
							contractAmount == null ? "text-slate-400" : "text-slate-700",
						)}
						aria-label={valueFmt.accessible}
					>
						{valueFmt.display}
					</p>
				</div>
				<div className="px-3 py-2.5">
					<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
						{expiryLabel}
					</p>
					<p
						className={cn(
							"mt-0.5 text-[15px] font-bold tabular-nums",
							days == null ? "text-slate-400" : expiryFigureClass,
						)}
					>
						{expiryFigure}
					</p>
					{contractExpiryDate && (
						<p className="mt-0.5 text-[10px] text-slate-500">
							<FormattedDate
								date={contractExpiryDate}
								className="text-inherit"
							/>
						</p>
					)}
				</div>
			</div>

			{/* Zone 3 — mid (flexes so strip + footer stay put) */}
			<div className="mt-3 min-h-0 min-w-0 space-y-2">
				<div className="flex flex-wrap items-center gap-1.5">
					{(contractStatus || tier === "expired") && (
						<ContractApprovalStatusCell
							file={{
								...file,
								status: (tier === "expired"
									? "expired"
									: contractStatus || file.status) as UIFileDoc["status"],
								contractExpiryDate,
								isExpired: tier === "expired",
							}}
							onRefresh={onRefresh}
							hideSubtext
						/>
					)}
					{riskLevel && riskLevelBadge(riskLevel)}
					{departmentLabel && (
						<span className="inline-flex items-center whitespace-nowrap rounded-full border border-slate-200 bg-white/60 px-1.5 py-0.5 text-xs capitalize text-slate-600">
							{departmentLabel}
						</span>
					)}
				</div>

				{metaSegments.length > 0 && (
					<p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-slate-500">
						{metaSegments.map((seg, i) => (
							<span key={seg.key} className="inline-flex items-center gap-1.5">
								{i > 0 && (
									<span className="text-slate-300" aria-hidden>
										·
									</span>
								)}
								<span
									className={seg.warn ? "font-semibold text-orange" : undefined}
								>
									{seg.node}
								</span>
							</span>
						))}
					</p>
				)}
			</div>

			{/* Zone 4 — footer: by | to on one row */}
			<div className="mt-3 min-w-0 border-t border-slate-200/70 pt-3">
				{isLoadingOwnerName &&
				assignedByPeople.length === 0 &&
				assignedToPeople.length === 0 ? (
					<span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
						<Loader2 className="h-3 w-3 animate-spin shrink-0" />
						Loading…
					</span>
				) : (
					<div className="flex min-w-0 items-center justify-between gap-3">
						<div className="min-w-0">
							<AssignmentFooterGroup
								label="Assigned by:"
								people={assignedByPeople}
							/>
						</div>
						<div className="min-w-0 shrink-0">
							<AssignmentFooterGroup
								label="Assigned to:"
								people={assignedToPeople}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default Card;
