//

import {
	Ban,
	Building2,
	ClipboardList,
	Clock,
	DollarSign,
	Download,
	FileText,
	FolderOpen,
	Loader2,
	Plus,
	Save,
	Scale,
	Search,
	Shield,
	SquarePen,
	Users,
	X,
} from "lucide-react";
import React from "react";
import { Button as ShadButton } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { updateContractExpiryDate } from "@/lib/actions/file.actions";
import type { AppUser } from "@/lib/actions/user.actions";
import {
	fetchUserNamesByIds,
	getUserByEmail,
} from "@/lib/actions/user.actions";
import {
	cn,
	convertFileSize,
	formatDateTime,
	getProfilePictureUrl,
} from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import FormattedDateTime from "./FormattedDateTime";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";
import { getAvatarColor } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const ImageThumbnail = ({
	file,
	status,
	title,
}: {
	file: UIFileDoc;
	status?: string;
	title?: string;
}) => (
	<div className="file-details-thumbnail flex items-start gap-3">
		<Thumbnail type={file.type} extension={file.extension} url={file.url} />
		<div className="flex min-w-0 flex-1 flex-col">
			<div className="flex items-center justify-between gap-2">
				<p className="subtitle-2 mb-1 truncate">
					{title || file.contractName || file.name}
				</p>
				{status && (
					<span
						className={cn(
							"inline-block px-2 py-0.5 text-xs rounded-full font-medium border shrink-0",
							getStatusBadgeClasses(status),
						)}
					>
						{getStatusLabel(status)}
					</span>
				)}
			</div>
			<p className="caption text-slate-500">
				<FormattedDateTime date={file.$createdAt} className="caption" />
				<span className="mx-1.5">·</span>
				{convertFileSize({ sizeInBytes: file.size })}
			</p>
		</div>
	</div>
);

// CAALM status badge colors (Contracts table pattern)
const getStatusBadgeClasses = (status: string) => {
	switch (status) {
		case "pending-review":
			return "bg-orange/10 text-orange border-orange/20";
		case "action-required":
			return "bg-red/10 text-red border-red/20";
		case "active":
			return "bg-green/10 text-green border-green/20";
		case "inactive":
			return "bg-slate-100 text-slate-600 border-slate-200";
		case "expired":
			return "bg-red/10 text-red border-red/20";
		default:
			return "bg-slate-100 text-slate-600 border-slate-200";
	}
};

const getStatusLabel = (status: string) => {
	switch (status) {
		case "pending-review":
			return "Pending review";
		case "action-required":
			return "Action required";
		case "active":
			return "Active";
		case "inactive":
			return "Inactive";
		case "expired":
			return "Expired";
		default:
			return status.charAt(0).toUpperCase() + status.slice(1);
	}
};

const EMPTY_VALUE = "Not available";

type DetailNavItem = {
	id: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
};

/** Parse date string as local calendar date (avoids UTC timezone shifts). */
function parseLocalDate(dateString: string | undefined): Date | undefined {
	if (!dateString) return undefined;

	const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (dateOnlyMatch) {
		const [, year, month, day] = dateOnlyMatch;
		return new Date(
			parseInt(year, 10),
			parseInt(month, 10) - 1,
			parseInt(day, 10),
		);
	}

	const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T/);
	if (isoMatch) {
		const [, year, month, day] = isoMatch;
		return new Date(
			parseInt(year, 10),
			parseInt(month, 10) - 1,
			parseInt(day, 10),
		);
	}

	return new Date(dateString);
}

function sameLocalDay(a: Date | undefined, b: Date | undefined): boolean {
	if (!a || !b) return a === b;
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export const FileDetails = ({
	file,
	onRefresh,
	onExpiryDateChange,
	onDownload,
	downloading = false,
}: {
	file: UIFileDoc;
	onRefresh?: () => void;
	onExpiryDateChange?: (newExpiryDate: string) => void;
	onDownload?: () => void | Promise<void>;
	downloading?: boolean;
}) => {
	const { toast } = useToast();
	const [editing, setEditing] = React.useState(false);
	const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
		undefined,
	);
	const [displayExpiry, setDisplayExpiry] = React.useState<string | undefined>(
		file.contractExpiryDate,
	);
	const [lastSavedExpiry, setLastSavedExpiry] = React.useState<
		string | undefined
	>(undefined);
	const [activeSection, setActiveSection] = React.useState("file-info");
	const contentScrollRef = React.useRef<HTMLDivElement>(null);

	// Sync displayExpiry when file.contractExpiryDate changes (e.g., after refresh)
	// But don't overwrite if we just saved a new date
	React.useEffect(() => {
		if (file.contractExpiryDate) {
			// Only update if we haven't just saved a different date
			// This prevents the stale file prop from overwriting our local update
			if (!lastSavedExpiry || file.contractExpiryDate === lastSavedExpiry) {
				setDisplayExpiry(file.contractExpiryDate);
			}
		}
	}, [file.contractExpiryDate, lastSavedExpiry]);
	const [assignedManagerUsers, setAssignedManagerUsers] = React.useState<
		AppUser[]
	>([]);
	const [loadingManagers, setLoadingManagers] = React.useState(false);
	const [managerProfileImages, setManagerProfileImages] = React.useState<
		Record<string, string>
	>({});
	const [failedProfileImages, setFailedProfileImages] = React.useState<
		Set<string>
	>(new Set());
	const [ownerFullName, setOwnerFullName] = React.useState<string | null>(null);
	const [contractOwnerFullName, setContractOwnerFullName] = React.useState<
		string | null
	>(null);

	// Fetch owner's full name if owner is a string (user ID)
	React.useEffect(() => {
		const fetchOwnerName = async () => {
			if (typeof file.owner === "string") {
				try {
					const users = await fetchUserNamesByIds([file.owner]);
					if (users.length > 0 && users[0].fullName) {
						setOwnerFullName(users[0].fullName);
					} else {
						// Fallback to ID if name not found
						setOwnerFullName(file.owner);
					}
				} catch (error) {
					console.error("Failed to fetch owner name:", error);
					// Fallback to ID on error
					setOwnerFullName(file.owner);
				}
			} else if (file.owner?.fullName) {
				setOwnerFullName(file.owner.fullName);
			}
		};

		fetchOwnerName();
	}, [file.owner]);

	// Fetch contract owner's full name if contractOwnerId exists
	React.useEffect(() => {
		const fetchContractOwnerName = async () => {
			const contractOwnerId = (file as any).contractOwnerId;
			if (contractOwnerId && typeof contractOwnerId === "string") {
				try {
					const users = await fetchUserNamesByIds([contractOwnerId]);
					if (users.length > 0 && users[0].fullName) {
						setContractOwnerFullName(users[0].fullName);
					} else {
						// Fallback to ID if name not found
						setContractOwnerFullName(contractOwnerId);
					}
				} catch (error) {
					console.error("Failed to fetch contract owner name:", error);
					// Fallback to ID on error
					setContractOwnerFullName(contractOwnerId);
				}
			}
		};

		fetchContractOwnerName();
	}, [(file as any).contractOwnerId]);

	const ownerName =
		ownerFullName ||
		(typeof file.owner === "string" ? file.owner : file.owner?.fullName || "");
	const isContract =
		file.type === "contract" ||
		/contract/i.test(file.name) ||
		file.contractId ||
		file.contractName ||
		file.contractType ||
		file.amount ||
		file.vendor ||
		file.department;

	// Get contract metadata from file document
	const assignedManagers = file.assignedManagers || [];
	const status = file.status;

	// Sync displayExpiry with file prop changes
	React.useEffect(() => {
		setDisplayExpiry(file.contractExpiryDate);
	}, [file.contractExpiryDate]);

	// Helper function to format date for display (avoiding timezone issues)
	const formatDateForDisplay = (dateString: string | undefined): string => {
		if (!dateString) return EMPTY_VALUE;

		const date = parseLocalDate(dateString);
		if (!date || Number.isNaN(date.getTime())) return EMPTY_VALUE;

		return date.toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Initialize selectedDate with current expiry date when editing starts
	React.useEffect(() => {
		if (!editing || !displayExpiry) return;
		const parsedDate = parseLocalDate(displayExpiry);
		if (!parsedDate || Number.isNaN(parsedDate.getTime())) return;
		setSelectedDate((prev) =>
			sameLocalDay(prev, parsedDate) ? prev : parsedDate,
		);
	}, [editing, displayExpiry]);

	// Fetch assigned manager users
	React.useEffect(() => {
		const fetchAssignedManagers = async () => {
			if (!assignedManagers || assignedManagers.length === 0) {
				setAssignedManagerUsers([]);
				return;
			}

			setLoadingManagers(true);
			try {
				const managerIds = Array.isArray(assignedManagers)
					? assignedManagers
					: [assignedManagers];

				const fileManagers = await fetchUserNamesByIds(managerIds);

				// Generate profile image URLs from profileImageId
				const newProfileImages: Record<string, string> = {};
				for (const user of fileManagers) {
					if (user.profileImageId) {
						const profileImageUrl = getProfilePictureUrl(user.profileImageId);
						if (profileImageUrl) {
							newProfileImages[user.$id] = profileImageUrl;
							if (user.accountId) {
								newProfileImages[user.accountId] = profileImageUrl;
							}
						}
					}
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
	}, [assignedManagers]);

	// Highlight the section currently in view while scrolling
	React.useEffect(() => {
		const root = contentScrollRef.current;
		if (!root) return;

		const sections = root.querySelectorAll("[data-details-section]");
		if (sections.length === 0) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
				const top = visible[0];
				if (top?.target instanceof HTMLElement) {
					const id = top.target.dataset.detailsSection;
					if (id) setActiveSection(id);
				}
			},
			{ root, rootMargin: "-10% 0px -60% 0px", threshold: [0.1, 0.35, 0.6] },
		);

		sections.forEach((s) => observer.observe(s));
		return () => observer.disconnect();
	}, [isContract]);

	// Memoized handler for image load errors
	const handleImageError = React.useCallback(
		(userId: string, accountId?: string) => {
			setFailedProfileImages((prev) => {
				const newSet = new Set(prev);
				if (userId) newSet.add(userId);
				if (accountId) newSet.add(accountId);
				return newSet;
			});
		},
		[],
	);

	const renderAssignedManagers = () => {
		if (assignedManagerUsers.length === 0) {
			if (loadingManagers) {
				return (
					<span className="text-slate-400 inline-flex items-center gap-1.5">
						<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
						Loading...
					</span>
				);
			}
			if (Array.isArray(assignedManagers) && assignedManagers.length > 0) {
				return (
					<span className="text-slate-800 font-semibold break-words overflow-wrap-anywhere">
						{assignedManagers.join(", ")}
					</span>
				);
			}
			if (typeof assignedManagers === "string") {
				return (
					<span className="text-slate-800 font-semibold break-words overflow-wrap-anywhere">
						{assignedManagers}
					</span>
				);
			}
			return <span className="text-slate-400">Not available</span>;
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

	// Helper function to format and display values
	const formatDisplayValue = (
		value: any,
		type?:
			| "priority"
			| "compliance"
			| "contractType"
			| "date"
			| "currency"
			| "boolean"
			| "array",
	): string => {
		if (value === null || value === undefined || value === "") {
			return EMPTY_VALUE;
		}

		if (type === "boolean") {
			return value === true ? "Yes" : value === false ? "No" : EMPTY_VALUE;
		}

		if (type === "array") {
			if (Array.isArray(value) && value.length > 0) {
				return value.join(", ");
			}
			return EMPTY_VALUE;
		}

		if (type === "date" && value) {
			try {
				const dateString = String(value);
				const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
				if (dateOnlyMatch) {
					const [, year, month, day] = dateOnlyMatch;
					const localDate = new Date(
						parseInt(year, 10),
						parseInt(month, 10) - 1,
						parseInt(day, 10),
					);
					return localDate.toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					});
				}
				const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})T/);
				if (isoMatch) {
					const [, year, month, day] = isoMatch;
					const localDate = new Date(
						parseInt(year, 10),
						parseInt(month, 10) - 1,
						parseInt(day, 10),
					);
					return localDate.toLocaleDateString("en-US", {
						year: "numeric",
						month: "long",
						day: "numeric",
					});
				}
				return new Date(value).toLocaleDateString("en-US", {
					year: "numeric",
					month: "long",
					day: "numeric",
				});
			} catch {
				return String(value);
			}
		}

		if (type === "currency" && typeof value === "number") {
			return `$${value.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})}`;
		}

		if (type === "priority") {
			const priorityMapping: Record<string, string> = {
				Low: "Low",
				Medium: "Medium",
				High: "High",
				Urgent: "Urgent",
			};
			return priorityMapping[String(value)] || String(value);
		}

		if (type === "compliance") {
			const complianceMapping: Record<string, string> = {
				"up-to-date": "Low Risk",
				"action-required": "Medium Risk",
				"non-compliant": "High Risk",
			};
			return complianceMapping[String(value)] || String(value);
		}

		if (type === "contractType") {
			const contractTypeMapping: Record<string, string> = {
				Service_Agreement: "Service Agreement",
				Purchase_Order: "Purchase Order",
				License_Agreement: "License Agreement",
				NDA_: "NDA",
				Employment_Contract: "Employment Contract",
				Vendor_Contract: "Vendor Contract",
				Lease_Agreement: "Lease Agreement",
				Consulting_Agreement: "Consulting Agreement",
				Government_Grant: "Government Grant",
				Government_Contract: "Government Contract",
				Grant_Agreement: "Grant Agreement",
				Vendor_Service_Agreement: "Vendor/Service Agreement",
				MOU: "Memorandum of Understanding",
				Donation_Agreement: "Donation/Gift Agreement",
				Independent_Contractor: "Independent Contractor Agreement",
				Fiscal_Sponsorship: "Fiscal Sponsorship Agreement",
				Other: "Other",
			};
			return contractTypeMapping[String(value)] || String(value);
		}

		return String(value);
	};

	const isEmptyDisplay = (formatted: string) => formatted === EMPTY_VALUE;

	/** Label-above-value field used in the details grid */
	const renderField = (
		label: string,
		value: any,
		type?:
			| "priority"
			| "compliance"
			| "contractType"
			| "date"
			| "currency"
			| "boolean"
			| "array",
		opts?: { className?: string; fullWidth?: boolean },
	) => {
		const formatted = formatDisplayValue(value, type);
		const empty = isEmptyDisplay(formatted);

		return (
			<div
				className={cn(
					"min-w-0 py-1",
					opts?.fullWidth && "sm:col-span-2",
					opts?.className,
				)}
			>
				<p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
				{type === "priority" && value && !empty ? (
					<div className="flex items-center gap-2 min-w-0">
						<span
							className={cn(
								"w-2 h-2 rounded-full shrink-0",
								value === "Urgent"
									? "bg-red"
									: value === "High"
										? "bg-orange"
										: value === "Medium"
											? "bg-orange"
											: "bg-green",
							)}
						/>
						<span className="text-sm font-semibold text-slate-800 break-words">
							{formatted}
						</span>
					</div>
				) : (
					<p
						className={cn(
							"text-sm break-words overflow-wrap-anywhere",
							empty
								? "font-normal text-slate-400"
								: "font-semibold text-slate-800",
						)}
					>
						{formatted}
					</p>
				)}
			</div>
		);
	};

	const renderSection = (
		id: string,
		title: string,
		children: React.ReactNode,
	) => (
		<section
			id={id}
			data-details-section={id}
			className="scroll-mt-4 space-y-4"
		>
			<div className="border-b border-slate-200 pb-2">
				<h3 className="text-base font-semibold text-slate-800">{title}</h3>
			</div>
			{children}
		</section>
	);

	const saveExpiry = async () => {
		if (!selectedDate) {
			toast({
				title: "No Date Selected",
				description: "Please select a date before saving.",
				variant: "destructive",
			});
			return;
		}

		if (!file.$id || typeof file.$id !== "string" || file.$id.trim() === "") {
			toast({
				title: "Error",
				description: "File document ID is missing or invalid.",
				variant: "destructive",
			});
			return;
		}

		try {
			const normalizedDate = new Date(
				selectedDate.getFullYear(),
				selectedDate.getMonth(),
				selectedDate.getDate(),
			);

			const year = normalizedDate.getFullYear();
			const month = String(normalizedDate.getMonth() + 1).padStart(2, "0");
			const day = String(normalizedDate.getDate()).padStart(2, "0");
			const expiryDateISO = `${year}-${month}-${day}`;

			const documentId = (file as any).contractId || file.$id;

			const result = await updateContractExpiryDate(documentId, expiryDateISO);

			if (!result?.success) {
				throw new Error("Update did not return success");
			}

			setDisplayExpiry(expiryDateISO);
			setLastSavedExpiry(expiryDateISO);
			setEditing(false);
			setSelectedDate(undefined);

			(file as any).contractExpiryDate = expiryDateISO;

			if (onExpiryDateChange) {
				onExpiryDateChange(expiryDateISO);
			}

			setTimeout(() => {
				if (onRefresh) {
					onRefresh();
				}
			}, 1000);

			toast({
				title: "Success",
				description: `Expiry date updated to ${selectedDate.toLocaleDateString()}.`,
			});
		} catch (error: any) {
			console.error("[CLIENT] FileDetails: Failed to update expiry date:", error);
			toast({
				title: "Update Failed",
				description:
					error?.message ||
					"An unexpected error occurred while updating the expiry date.",
				variant: "destructive",
			});
		}
	};

	// Extract all contract attributes from file
	const contractAttributes = {
		// Basic Information
		contractName: file.contractName || file.name,
		contractNumber: file.contractNumber,
		contractType: file.contractType,
		contractCategory: (file as any).contractCategory,
		status: file.status,
		lifecycleStatus: (file as any).lifecycleStatus,
		priority: file.priority,
		description: file.description,

		// Financial
		amount: file.amount,
		currencyCode: (file as any).currencyCode,
		notToExceedAmount: (file as any).notToExceedAmount,
		paymentTerms: (file as any).paymentTerms,
		paymentSchedule: (file as any).paymentSchedule,
		budgetCode: (file as any).budgetCode,
		costCenter: (file as any).costCenter,

		// Dates
		startDate: (file as any).startDate,
		executionDate: (file as any).executionDate,
		contractExpiryDate: displayExpiry || file.contractExpiryDate,
		daysUntilExpiry: (file as any).daysUntilExpiry,

		// Organization
		orgId: (file as any).orgId,
		department: file.department,
		division: (file as any).division,
		subDepartment: (file as any).subDepartment,
		businessUnit: (file as any).businessUnit,
		departmentOwner: (file as any).departmentOwner,
		contractOwnerId: (file as any).contractOwnerId,

		// Counterparty
		vendor: file.vendor,
		counterpartyLegalName: (file as any).counterpartyLegalName,
		counterpartyContactEmail: (file as any).counterpartyContactEmail,
		counterpartyContactPhone: (file as any).counterpartyContactPhone,
		counterpartyAddress: (file as any).counterpartyAddress,
		counterpartyType: (file as any).counterpartyType,
		counterpartyTaxId: (file as any).counterpartyTaxId,
		counterpartyDunsNumber: (file as any).counterpartyDunsNumber,

		// Compliance & Risk
		compliance: file.compliance,
		complianceLevel: (file as any).complianceLevel,
		riskLevel: (file as any).riskLevel,
		regulatoryRequirements: (file as any).regulatoryRequirements,
		hipaaRequired: (file as any).hipaaRequired,
		dataPrivacyRequirements: (file as any).dataPrivacyRequirements,

		// Insurance & Legal
		insuranceRequired: (file as any).insuranceRequired,
		insuranceVerifiedDate: (file as any).insuranceVerifiedDate,
		insuranceExpiryDate: (file as any).insuranceExpiryDate,
		indemnificationIncluded: (file as any).indemnificationIncluded,
		backgroundCheckRequired: (file as any).backgroundCheckRequired,

		// Contract Terms
		autoRenew: (file as any).autoRenew,
		renewalNoticeDays: (file as any).renewalNoticeDays,
		terminationNoticeDays: (file as any).terminationNoticeDays,
		terminationRights: (file as any).terminationRights,
		curePeriodDays: (file as any).curePeriodDays,
		postTerminationObligations: (file as any).postTerminationObligations,

		// Approval & Workflow
		approvalWorkflowTemplate: (file as any).approvalWorkflowTemplate,
		currentApprovalStage: (file as any).currentApprovalStage,
		approvalHistoryLog: (file as any).approvalHistoryLog,
		reviewerComments: (file as any).reviewerComments,
		internalApproverIds: (file as any).internalApproverIds,

		// Related Documents
		relatedDocumentIds: (file as any).relatedDocumentIds,
		attachmentReferences: (file as any).attachmentReferences,
		parentContractId: (file as any).parentContractId,
		templateUsed: (file as any).templateUsed,
		versionNumber: (file as any).versionNumber,

		// Performance & Metrics
		serviceLevelAgreements: (file as any).serviceLevelAgreements,
		performanceMetrics: (file as any).performanceMetrics,
		reportingRequirements: (file as any).reportingRequirements,
		auditRightsGranted: (file as any).auditRightsGranted,
		keyObligations: (file as any).keyObligations,

		// File Information
		fileId: (file as any).fileId,
		extension: file.extension,
		size: file.size,
	};

	const displayTitle =
		contractAttributes.contractName || file.name || "Untitled";
	const uploadedMeta = `Uploaded ${formatDateTime(file.$createdAt)} · ${convertFileSize({ sizeInBytes: file.size })}`;
	const lastSynced = `Last synced ${formatDateTime(file.$updatedAt)}`;

	const navItems: DetailNavItem[] = [
		{ id: "file-info", label: "File information", icon: FolderOpen },
		...(isContract
			? [
					{
						id: "contract-info",
						label: "Contract information",
						icon: ClipboardList,
					},
					{ id: "dates", label: "Dates & timeline", icon: Clock },
					{ id: "counterparty", label: "Counterparty", icon: Building2 },
					{ id: "financial", label: "Financial details", icon: DollarSign },
					{ id: "compliance", label: "Compliance & risk", icon: Shield },
					{ id: "insurance", label: "Insurance & legal", icon: Scale },
					{ id: "terms", label: "Contract terms", icon: FileText },
					{ id: "organization", label: "Organization", icon: Users },
					{ id: "approval", label: "Approval & workflow", icon: ClipboardList },
					{ id: "documents", label: "Related documents", icon: FileText },
					{ id: "performance", label: "Performance & metrics", icon: FileText },
					{ id: "additional", label: "Additional details", icon: Users },
				]
			: []),
	];

	const scrollToSection = (id: string) => {
		setActiveSection(id);
		const root = contentScrollRef.current;
		const el = root?.querySelector(`[data-details-section="${id}"]`);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	const isContractExpired =
		file.status?.toLowerCase() === "expired" ||
		Boolean(file.isExpired) ||
		Boolean(
			file.contractExpiryDate &&
				new Date(file.contractExpiryDate) < new Date(),
		);

	const fieldGrid = (children: React.ReactNode) => (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
			{children}
		</div>
	);

	return (
		<div className="flex min-h-0 flex-1 flex-col mt-4">
			{/* Document header */}
			<div className="shrink-0 border-b border-slate-200 bg-white/50 px-5 py-4 pr-12 sm:px-6 sm:pr-14">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 shrink-0">
						<Thumbnail
							type={file.type}
							extension={file.extension}
							url={file.url}
							className="size-10! min-w-10! rounded-lg!"
							imageClassName="size-8!"
						/>
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<h2 className="truncate text-lg font-semibold text-slate-800 sm:text-xl">
									{displayTitle}
								</h2>
								<p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
									{uploadedMeta}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-2">
								{status ? (
									<span
										className={cn(
											"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
											getStatusBadgeClasses(status),
										)}
									>
										{getStatusLabel(status)}
									</span>
								) : null}
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Sidebar + content */}
			<div className="flex min-h-0 flex-1">
				<nav
					aria-label="Details sections"
					className="hidden w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-slate-200 bg-slate-50/80 p-3 sm:flex"
				>
					{navItems.map((item) => {
						const Icon = item.icon;
						const active = activeSection === item.id;
						return (
							<button
								key={item.id}
								type="button"
								onClick={() => scrollToSection(item.id)}
								className={cn(
									"flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-all duration-200",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									active
										? "bg-blue/10 font-medium text-[#0f5384]"
										: "text-slate-600 hover:bg-white/80 hover:text-slate-800",
								)}
							>
								<Icon
									className={cn(
										"h-4 w-4 shrink-0",
										active ? "text-[#0f5384]" : "text-slate-500",
									)}
								/>
								<span className="truncate">{item.label}</span>
							</button>
						);
					})}
				</nav>

				<div className="flex min-h-0 flex-1 flex-col">
					<div className="shrink-0 border-b border-slate-200 px-4 py-2 sm:hidden">
						<select
							aria-label="Jump to section"
							value={activeSection}
							onChange={(e) => scrollToSection(e.target.value)}
							className="h-10 w-full cursor-pointer rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700"
						>
							{navItems.map((item) => (
								<option key={item.id} value={item.id}>
									{item.label}
								</option>
							))}
						</select>
					</div>

					<div
						ref={contentScrollRef}
						className="min-h-0 flex-1 space-y-8 overflow-y-auto bg-white/20 px-5 py-5 sm:px-8"
					>
						{renderSection(
							"file-info",
							"File information",
							fieldGrid(
								<>
									{renderField("Owner", ownerName || null)}
									{renderField("Created", file.$createdAt, "date")}
									{renderField("Last modified", file.$updatedAt, "date")}
									{renderField("File ID", contractAttributes.fileId)}
									{renderField("Extension", contractAttributes.extension)}
									{renderField(
										"Size",
										contractAttributes.size
											? convertFileSize({
													sizeInBytes: contractAttributes.size,
												})
											: null,
									)}
								</>,
							),
						)}

						{isContract && (
							<>
								{renderSection(
									"contract-info",
									"Contract information",
									fieldGrid(
										<>
											{renderField(
												"Priority",
												contractAttributes.priority,
												"priority",
											)}
											{renderField(
												"Contract amount",
												contractAttributes.amount,
												"currency",
											)}
											{renderField(
												"Contract type",
												contractAttributes.contractType,
												"contractType",
											)}
											{renderField(
												"Vendor/Supplier",
												contractAttributes.vendor,
											)}
											{renderField(
												"Department",
												contractAttributes.department,
											)}
											{renderField(
												"Contract number",
												contractAttributes.contractNumber,
											)}
											{renderField(
												"Contract name",
												contractAttributes.contractName,
											)}
											{renderField("Status", contractAttributes.status)}
											{renderField(
												"Lifecycle status",
												contractAttributes.lifecycleStatus,
											)}
											{renderField(
												"Contract category",
												contractAttributes.contractCategory,
											)}
											{renderField(
												"Description",
												contractAttributes.description,
												undefined,
												{ fullWidth: true },
											)}
										</>,
									),
								)}

								{renderSection(
									"dates",
									"Dates & timeline",
									<div className="space-y-5">
										<div className="min-w-0 py-1">
											<p className="mb-1 text-xs font-medium text-slate-500">
												Expiry date
											</p>
											<div className="flex flex-wrap items-center justify-between gap-3">
												<p
													className={cn(
														"text-sm",
														formatDateForDisplay(displayExpiry) ===
															EMPTY_VALUE
															? "font-normal text-slate-400"
															: "font-semibold text-slate-800",
													)}
												>
													{formatDateForDisplay(displayExpiry)}
												</p>
												{!isContractExpired &&
													(!editing ? (
														<ShadButton
															onClick={() => setEditing(true)}
															variant="outline"
															size="sm"
															className="primary-btn px-3 sm:px-4"
														>
															<SquarePen className="h-4 w-4" />
															Edit date
														</ShadButton>
													) : (
														<div className="flex flex-wrap items-center gap-2">
															<Popover>
																<PopoverTrigger asChild>
																	<ShadButton
																		variant="outline"
																		size="sm"
																		className="w-[180px] justify-start border-[0.25px] border-slate-300 text-left font-normal"
																	>
																		{selectedDate
																			? selectedDate.toLocaleDateString()
																			: "Pick a date"}
																	</ShadButton>
																</PopoverTrigger>
																<PopoverContent
																	className="w-auto p-0"
																	align="start"
																>
																	<Calendar
																		className="text-slate-700"
																		mode="single"
																		selected={selectedDate}
																		onSelect={(date) => {
																			if (date) {
																				setSelectedDate(
																					new Date(
																						date.getFullYear(),
																						date.getMonth(),
																						date.getDate(),
																					),
																				);
																			} else {
																				setSelectedDate(undefined);
																			}
																		}}
																		disabled={(date) => {
																			const today = new Date();
																			today.setHours(0, 0, 0, 0);
																			return date < today;
																		}}
																		initialFocus
																	/>
																</PopoverContent>
															</Popover>
															<ShadButton
																size="sm"
																onClick={(e) => {
																	e.preventDefault();
																	e.stopPropagation();
																	void saveExpiry();
																}}
																disabled={!selectedDate}
																className="primary-btn px-3 sm:px-4"
																type="button"
															>
																<Save className="h-4 w-4" />
																Save
															</ShadButton>
															<ShadButton
																size="sm"
																variant="ghost"
																onClick={() => {
																	setSelectedDate(undefined);
																	setEditing(false);
																}}
																className="primary-btn px-3 sm:px-4 text-slate-600 hover:text-slate-800"
															>
																<Ban className="h-4 w-4" />
																Cancel
															</ShadButton>
														</div>
													))}
											</div>
										</div>
										{fieldGrid(
											<>
												{renderField(
													"Start date",
													contractAttributes.startDate,
													"date",
												)}
												{renderField(
													"Execution date",
													contractAttributes.executionDate,
													"date",
												)}
												{renderField(
													"Days until expiry",
													contractAttributes.daysUntilExpiry,
												)}
											</>,
										)}
									</div>,
								)}

								{renderSection(
									"counterparty",
									"Counterparty",
									fieldGrid(
										<>
											{renderField(
												"Counterparty legal name",
												contractAttributes.counterpartyLegalName,
											)}
											{renderField(
												"Contact email",
												contractAttributes.counterpartyContactEmail,
											)}
											{renderField(
												"Contact phone",
												contractAttributes.counterpartyContactPhone,
											)}
											{renderField(
												"Address",
												contractAttributes.counterpartyAddress,
											)}
											{renderField(
												"Type",
												contractAttributes.counterpartyType,
											)}
											{renderField(
												"Tax ID",
												contractAttributes.counterpartyTaxId,
											)}
											{renderField(
												"DUNS number",
												contractAttributes.counterpartyDunsNumber,
											)}
										</>,
									),
								)}

								{renderSection(
									"financial",
									"Financial details",
									fieldGrid(
										<>
											{renderField(
												"Currency code",
												contractAttributes.currencyCode,
											)}
											{renderField(
												"Not to exceed amount",
												contractAttributes.notToExceedAmount,
												"currency",
											)}
											{renderField(
												"Payment terms",
												contractAttributes.paymentTerms,
											)}
											{renderField(
												"Payment schedule",
												contractAttributes.paymentSchedule,
											)}
											{renderField(
												"Budget code",
												contractAttributes.budgetCode,
											)}
											{renderField(
												"Cost center",
												contractAttributes.costCenter,
											)}
										</>,
									),
								)}

								{renderSection(
									"compliance",
									"Compliance & risk",
									fieldGrid(
										<>
											{renderField(
												"Compliance level",
												contractAttributes.complianceLevel,
											)}
											{renderField(
												"Compliance status",
												contractAttributes.compliance,
												"compliance",
											)}
											{renderField(
												"Risk level",
												contractAttributes.riskLevel,
											)}
											{renderField(
												"Regulatory requirements",
												contractAttributes.regulatoryRequirements,
											)}
											{renderField(
												"HIPAA required",
												contractAttributes.hipaaRequired,
												"boolean",
											)}
											{renderField(
												"Data privacy requirements",
												contractAttributes.dataPrivacyRequirements,
											)}
										</>,
									),
								)}

								{renderSection(
									"insurance",
									"Insurance & legal",
									fieldGrid(
										<>
											{renderField(
												"Insurance required",
												contractAttributes.insuranceRequired,
												"boolean",
											)}
											{renderField(
												"Insurance verified date",
												contractAttributes.insuranceVerifiedDate,
												"date",
											)}
											{renderField(
												"Insurance expiry date",
												contractAttributes.insuranceExpiryDate,
												"date",
											)}
											{renderField(
												"Indemnification included",
												contractAttributes.indemnificationIncluded,
												"boolean",
											)}
											{renderField(
												"Background check required",
												contractAttributes.backgroundCheckRequired,
												"boolean",
											)}
										</>,
									),
								)}

								{renderSection(
									"terms",
									"Contract terms",
									fieldGrid(
										<>
											{renderField(
												"Auto renew",
												contractAttributes.autoRenew,
												"boolean",
											)}
											{renderField(
												"Renewal notice days",
												contractAttributes.renewalNoticeDays,
											)}
											{renderField(
												"Termination notice days",
												contractAttributes.terminationNoticeDays,
											)}
											{renderField(
												"Termination rights",
												contractAttributes.terminationRights,
											)}
											{renderField(
												"Cure period days",
												contractAttributes.curePeriodDays,
											)}
											{renderField(
												"Post termination obligations",
												contractAttributes.postTerminationObligations,
											)}
										</>,
									),
								)}

								{renderSection(
									"organization",
									"Organization & ownership",
									fieldGrid(
										<>
											{renderField(
												"Organization ID",
												contractAttributes.orgId,
											)}
											{renderField(
												"Contract owner",
												contractOwnerFullName ||
													contractAttributes.contractOwnerId,
											)}
											{renderField(
												"Department owner",
												contractAttributes.departmentOwner,
											)}
											{renderField(
												"Business unit",
												contractAttributes.businessUnit,
											)}
											{renderField(
												"Sub department",
												contractAttributes.subDepartment,
											)}
											{renderField(
												"Division",
												contractAttributes.division,
											)}
										</>,
									),
								)}

								{renderSection(
									"approval",
									"Approval & workflow",
									fieldGrid(
										<>
											{renderField(
												"Approval workflow template",
												contractAttributes.approvalWorkflowTemplate,
											)}
											{renderField(
												"Current approval stage",
												contractAttributes.currentApprovalStage,
											)}
											{renderField(
												"Approval history log",
												contractAttributes.approvalHistoryLog,
											)}
											{renderField(
												"Reviewer comments",
												contractAttributes.reviewerComments,
											)}
											{renderField(
												"Internal approver IDs",
												contractAttributes.internalApproverIds,
												"array",
											)}
										</>,
									),
								)}

								{renderSection(
									"documents",
									"Related documents",
									fieldGrid(
										<>
											{renderField(
												"Related document IDs",
												contractAttributes.relatedDocumentIds,
												"array",
											)}
											{renderField(
												"Attachment references",
												contractAttributes.attachmentReferences,
												"array",
											)}
											{renderField(
												"Parent contract ID",
												contractAttributes.parentContractId,
											)}
											{renderField(
												"Template used",
												contractAttributes.templateUsed,
											)}
											{renderField(
												"Version number",
												contractAttributes.versionNumber,
											)}
										</>,
									),
								)}

								{renderSection(
									"performance",
									"Performance & metrics",
									fieldGrid(
										<>
											{renderField(
												"Service level agreements",
												contractAttributes.serviceLevelAgreements,
											)}
											{renderField(
												"Performance metrics",
												contractAttributes.performanceMetrics,
											)}
											{renderField(
												"Reporting requirements",
												contractAttributes.reportingRequirements,
											)}
											{renderField(
												"Audit rights granted",
												contractAttributes.auditRightsGranted,
												"boolean",
											)}
											{renderField(
												"Key obligations",
												contractAttributes.keyObligations,
												"array",
											)}
										</>,
									),
								)}

								{renderSection(
									"additional",
									"Additional details",
									<div className="min-w-0 py-1">
										<p className="mb-2 text-xs font-medium text-slate-500">
											Assigned to
										</p>
										{assignedManagers &&
										(Array.isArray(assignedManagers)
											? assignedManagers.length > 0
											: Boolean(assignedManagers)) ? (
											renderAssignedManagers()
										) : (
											<p className="text-sm font-normal text-slate-400">
												{EMPTY_VALUE}
											</p>
										)}
									</div>,
								)}
							</>
						)}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="glass-dialog-footer-wrap shrink-0">
				<div className="flex items-center justify-between gap-3">
					<p className="text-xs text-slate-500">{lastSynced}</p>
					{onDownload ? (
						<Button
							type="button"
							disabled={downloading}
							onClick={() => void onDownload()}
							className="btn-primary px-3 sm:px-4"
						>
							{downloading ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Download className="h-4 w-4" />
							)}
							Download
						</Button>
					) : null}
				</div>
			</div>
		</div>
	)
};

interface Props {
	file: UIFileDoc;
	onInputChange: React.Dispatch<React.SetStateAction<string[]>>;
	onRemove: (email: string) => void;
	currentUsers?: string[]; // Optional prop to override file.users for real-time updates
}

type DirectoryUser = {
	$id: string;
	fullName: string;
	email: string;
	department: string;
	/** Appwrite profile picture file id, when set */
	avatar?: string | null;
};

function formatDeptLabel(department: string): string {
	return department
		.replace(/[-_]/g, " ")
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function userInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

/** Colored initials, or uploaded profile photo when available (same rules as assistant avatars). */
function ShareUserAvatar({
	userId,
	fullName,
	avatarFileId,
	className,
}: {
	userId: string;
	fullName: string;
	avatarFileId?: string | null;
	className?: string;
}) {
	const [imageFailed, setImageFailed] = React.useState(false);

	React.useEffect(() => {
		setImageFailed(false);
	}, [avatarFileId]);

	const imageUrl =
		avatarFileId && !imageFailed
			? getProfilePictureUrl(avatarFileId)
			: null;
	const initials = userInitials(fullName);

	return (
		<span
			className={cn(
				"flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white",
				className,
			)}
			style={imageUrl ? undefined : { backgroundColor: getAvatarColor(userId) }}
			aria-hidden
		>
			{imageUrl ? (
				// eslint-disable-next-line @next/next/no-img-element -- remote Appwrite storage URL
				<img
					src={imageUrl}
					alt=""
					className="h-full w-full object-cover"
					onError={() => setImageFailed(true)}
				/>
			) : (
				initials
			)}
		</span>
	);
}

export const ShareInput = ({
	file,
	onInputChange,
	onRemove,
	currentUsers,
}: Props) => {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [shareTab, setShareTab] = React.useState<
		"invite" | "shared" | "file-info"
	>("invite");

	const displayUsers =
		currentUsers !== undefined ? currentUsers : file.users || [];
	const selectedSet = React.useMemo(
		() => new Set(displayUsers.map(normalizeEmail).filter(Boolean)),
		[displayUsers],
	);

	const [ownerFullName, setOwnerFullName] = React.useState<string | null>(null);
	const [emailDisplayNames, setEmailDisplayNames] = React.useState<
		Record<string, string>
	>({});
	const [directoryUsers, setDirectoryUsers] = React.useState<DirectoryUser[]>(
		[],
	);
	const [directoryLoading, setDirectoryLoading] = React.useState(true);
	const [directoryError, setDirectoryError] = React.useState<string | null>(
		null,
	);
	const [userSearch, setUserSearch] = React.useState("");
	const [emailDraft, setEmailDraft] = React.useState("");

	React.useEffect(() => {
		const fetchOwnerName = async () => {
			if (typeof file.owner === "string") {
				try {
					const users = await fetchUserNamesByIds([file.owner]);
					if (users.length > 0 && users[0].fullName) {
						setOwnerFullName(users[0].fullName);
					} else {
						setOwnerFullName(file.owner);
					}
				} catch {
					setOwnerFullName(file.owner);
				}
			} else if (file.owner?.fullName) {
				setOwnerFullName(file.owner.fullName);
			}
		};
		fetchOwnerName();
	}, [file.owner]);

	React.useEffect(() => {
		let cancelled = false;
		const loadDirectory = async () => {
			setDirectoryLoading(true);
			setDirectoryError(null);
			try {
				const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : "";
				const res = await fetch(`/api/users/directory${qs}`);
				if (!res.ok) {
					throw new Error("Failed to load users");
				}
				const data = (await res.json()) as DirectoryUser[];
				if (!cancelled) {
					setDirectoryUsers(Array.isArray(data) ? data : []);
				}
			} catch {
				if (!cancelled) {
					setDirectoryUsers([]);
					setDirectoryError("Could not load CAALM users");
				}
			} finally {
				if (!cancelled) setDirectoryLoading(false);
			}
		};
		void loadDirectory();
		return () => {
			cancelled = true;
		};
	}, [orgId]);

	React.useEffect(() => {
		let cancelled = false;
		const emails = displayUsers
			.map((email) => email.trim())
			.filter((email) => email.length > 0);

		if (emails.length === 0) {
			setEmailDisplayNames({});
			return;
		}

		const fromDirectory: Record<string, string> = {};
		for (const user of directoryUsers) {
			fromDirectory[normalizeEmail(user.email)] = user.fullName;
		}

		const resolveNames = async () => {
			const next: Record<string, string> = {};
			await Promise.all(
				emails.map(async (email) => {
					const key = normalizeEmail(email);
					if (fromDirectory[key]) {
						next[email] = fromDirectory[key];
						return;
					}
					try {
						let user = await getUserByEmail(email);
						if (!user && email !== email.toLowerCase()) {
							user = await getUserByEmail(email.toLowerCase());
						}
						const fullName =
							user &&
							typeof user === "object" &&
							"fullName" in user &&
							typeof user.fullName === "string"
								? user.fullName.trim()
								: "";
						next[email] = fullName || email;
					} catch {
						next[email] = email;
					}
				}),
			);
			if (!cancelled) setEmailDisplayNames(next);
		};

		void resolveNames();
		return () => {
			cancelled = true;
		};
	}, [displayUsers.join("|"), directoryUsers]);

	const addEmails = React.useCallback(
		(incoming: string[]) => {
			const cleaned = incoming
				.map((e) => e.trim())
				.filter((e) => e.length > 0 && isValidEmail(e));
			if (cleaned.length === 0) return;

			onInputChange((prev) => {
				const existing = new Set(prev.map(normalizeEmail));
				const next = [...prev];
				for (const email of cleaned) {
					const key = normalizeEmail(email);
					if (!existing.has(key)) {
						existing.add(key);
						next.push(email.trim());
					}
				}
				return next;
			});
		},
		[onInputChange],
	);

	const toggleDirectoryUser = React.useCallback(
		(user: DirectoryUser, checked: boolean) => {
			const key = normalizeEmail(user.email);
			if (checked) {
				addEmails([user.email]);
				setEmailDisplayNames((prev) => ({
					...prev,
					[user.email.trim()]: user.fullName,
					[key]: user.fullName,
				}));
			} else {
				const match = displayUsers.find((e) => normalizeEmail(e) === key);
				if (match) onRemove(match);
			}
		},
		[addEmails, displayUsers, onRemove],
	);

	const handleAddEmail = React.useCallback(() => {
		const value = emailDraft.trim();
		if (!value) return;
		if (!isValidEmail(value)) {
			toast({
				variant: "destructive",
				description: "Enter a valid email address.",
			});
			return;
		}
		if (selectedSet.has(normalizeEmail(value))) {
			toast({ description: "That recipient is already selected." });
			setEmailDraft("");
			return;
		}
		addEmails([value]);
		setEmailDraft("");
	}, [addEmails, emailDraft, selectedSet, toast]);

	const filteredUsers = React.useMemo(() => {
		const q = userSearch.trim().toLowerCase();
		if (!q) return directoryUsers;
		return directoryUsers.filter(
			(u) =>
				u.fullName.toLowerCase().includes(q) ||
				u.email.toLowerCase().includes(q) ||
				u.department.toLowerCase().includes(q),
		);
	}, [directoryUsers, userSearch]);

	const usersByDepartment = React.useMemo(() => {
		const groups = new Map<string, DirectoryUser[]>();
		for (const user of filteredUsers) {
			const dept = user.department || "Other";
			const list = groups.get(dept) || [];
			list.push(user);
			groups.set(dept, list);
		}
		return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
	}, [filteredUsers]);

	const ownerName =
		ownerFullName ||
		(typeof file.owner === "string" ? file.owner : file.owner?.fullName || "");

	const shareTabs = [
		{ id: "invite" as const, label: "Invite people" },
		{
			id: "shared" as const,
			label: `Shared with · ${displayUsers.length}`,
		},
		{ id: "file-info" as const, label: "File info" },
	];

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			{/* Flat file strip — outside scroll so nothing shows through under the dialog header */}
			<div className="shrink-0 border-b border-slate-200 bg-slate-50 px-6 py-3">
				<div className="flex items-center gap-3">
					<Thumbnail
						type={file.type}
						extension={file.extension}
						url={file.url}
					/>
					<div className="min-w-0 flex-1">
						<p className="subtitle-2 truncate text-slate-800">
							{file.contractName || file.name}
						</p>
						<p className="caption text-slate-500">
							<FormattedDateTime
								date={file.$createdAt}
								className="caption"
							/>
							<span className="mx-1.5">·</span>
							{convertFileSize({ sizeInBytes: file.size })}
						</p>
					</div>
				</div>
			</div>

			<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
			<nav
				className="border-b border-slate-200"
				aria-label="Share sections"
			>
				<div className="flex flex-wrap gap-1" role="tablist">
					{shareTabs.map((tab) => {
						const selected = shareTab === tab.id;
						return (
							<button
								key={tab.id}
								type="button"
								role="tab"
								aria-selected={selected}
								data-state={selected ? "active" : undefined}
								onClick={(e) => {
									e.stopPropagation();
									setShareTab(tab.id);
								}}
								className={cn(
									"tabs-underline cursor-pointer px-3 py-2.5 text-sm font-medium",
									"rounded-none border-0 bg-transparent shadow-none",
									"text-slate-600 transition-colors duration-200 hover:text-slate-700",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									selected && "sidebar-gradient-text",
								)}
							>
								{tab.label}
							</button>
						);
					})}
				</div>
			</nav>

			{shareTab === "invite" ? (
				<div className="space-y-4">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input
							value={userSearch}
							onChange={(e) => setUserSearch(e.target.value)}
							placeholder="Search by name, email, or department"
							data-with-leading-icon="true"
							className="h-10 border-[0.25px] border-slate-300 bg-white pl-10"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>

					<div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
						{directoryLoading ? (
							<div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading users...
							</div>
						) : directoryError ? (
							<p className="px-4 py-6 text-center text-sm text-slate-500">
								{directoryError}. You can still share by email below.
							</p>
						) : usersByDepartment.length === 0 ? (
							<p className="px-4 py-6 text-center text-sm text-slate-500">
								No users match your search.
							</p>
						) : (
							<div className="divide-y divide-slate-100">
								{usersByDepartment.map(([department, users]) => (
									<div key={department} className="p-2">
										<p className="px-2 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
											{formatDeptLabel(department)}{" "}
											<span className="tabular-nums">{users.length}</span>
										</p>
										<ul className="space-y-0.5">
											{users.map((user) => {
												const checked = selectedSet.has(
													normalizeEmail(user.email),
												);
												return (
													<li key={user.$id}>
														<label
															className={cn(
																"flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200",
																"hover:bg-blue-50",
																checked && "bg-blue-50/80",
															)}
															onClick={(e) => e.stopPropagation()}
														>
															<ShareUserAvatar
																userId={user.$id}
																fullName={user.fullName}
																avatarFileId={user.avatar}
															/>
															<span className="min-w-0 flex-1">
																<span className="block truncate text-sm font-medium text-slate-800">
																	{user.fullName}
																</span>
																<span className="block truncate text-xs text-slate-500">
																	{user.email}
																</span>
															</span>
															<span className="inline-block shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
																Can view
															</span>
															<Checkbox
																checked={checked}
																onCheckedChange={(value) =>
																	toggleDirectoryUser(user, value === true)
																}
																aria-label={`Share with ${user.fullName}`}
																className="cursor-pointer"
															/>
														</label>
													</li>
												);
											})}
										</ul>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="rounded-lg border border-slate-200 bg-white p-3">
						<div className="flex items-center gap-2">
							<Input
								id="share-email"
								type="email"
								value={emailDraft}
								placeholder="name@example.com"
								onChange={(e) => setEmailDraft(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										e.stopPropagation();
										handleAddEmail();
									}
								}}
								onClick={(e) => e.stopPropagation()}
								className="h-9 flex-1 border-[0.25px] border-slate-300 bg-white text-sm"
							/>
							<Button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleAddEmail();
								}}
								className="primary-btn h-9! min-h-9! w-auto! shrink-0 px-3! py-1.5! text-sm sm:w-auto!"
							>
								<Plus className="h-3.5 w-3.5" />
								Add
							</Button>
						</div>
						<p className="mt-2 text-xs text-slate-500">
							Use this for people who are not in CAALM yet.
						</p>
					</div>
				</div>
			) : null}

			{shareTab === "shared" ? (
				<div className="space-y-2">
					{displayUsers.length > 0 ? (
						displayUsers.map((email: string) => {
							const trimmed = email.trim();
							const directoryMatch = directoryUsers.find(
								(u) => normalizeEmail(u.email) === normalizeEmail(trimmed),
							);
							const displayName =
								emailDisplayNames[trimmed] ||
								emailDisplayNames[normalizeEmail(trimmed)] ||
								directoryMatch?.fullName ||
								trimmed;
							return (
								<div
									key={email}
									className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
								>
									<div className="flex min-w-0 items-center gap-3">
										<ShareUserAvatar
											userId={directoryMatch?.$id || trimmed}
											fullName={displayName}
											avatarFileId={directoryMatch?.avatar}
										/>
										<span
											className="min-w-0 truncate text-sm text-slate-700"
											title={
												displayName !== trimmed
													? `${displayName} (${trimmed})`
													: trimmed
											}
										>
											<span className="block font-medium text-slate-800">
												{displayName}
											</span>
											{displayName !== trimmed ? (
												<span className="block truncate text-xs text-slate-500">
													{trimmed}
												</span>
											) : null}
										</span>
									</div>
									<div className="flex shrink-0 items-center gap-2">
										<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
											Can view
										</span>
										<Button
											onClick={(e) => {
												e.stopPropagation();
												onRemove(email);
											}}
											variant="ghost"
											size="sm"
											className="h-7 w-7 cursor-pointer rounded-full p-0 hover:bg-red/10"
											aria-label={`Remove ${displayName}`}
										>
											<X className="h-4 w-4 text-red" />
										</Button>
									</div>
								</div>
							);
						})
					) : (
						<p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
							No one is shared yet. Invite people from the first tab.
						</p>
					)}
				</div>
			) : null}

			{shareTab === "file-info" ? (
				<div className="space-y-3">
					{[
						{ label: "Format", value: file.extension || "—" },
						{
							label: "Size",
							value: convertFileSize({ sizeInBytes: file.size }),
						},
						{ label: "Owner", value: ownerName || "—" },
						{
							label: "Last modified",
							value: formatDateTime(file.$updatedAt),
						},
					].map((row) => (
						<div
							key={row.label}
							className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3"
						>
							<span className="text-sm font-medium text-slate-600">
								{row.label}
							</span>
							<span className="min-w-0 truncate text-sm font-semibold text-slate-800">
								{row.value}
							</span>
						</div>
					))}
				</div>
			) : null}
			</div>
		</div>
	);
};
