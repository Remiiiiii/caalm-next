//

import {
	Ban,
	Clock,
	FileText,
	Loader2,
	Plus,
	Save,
	Search,
	SquarePen,
	Users,
	X,
} from "lucide-react";
import React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
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
	convertFileSize,
	formatDateTime,
	getProfilePictureUrl,
} from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";
import FormattedDateTime from "./FormattedDateTime";
import ManagerAvatars from "./ManagerAvatars";
import Thumbnail from "./Thumbnail";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const ImageThumbnail = ({
	file,
	status,
}: {
	file: UIFileDoc;
	status?: string;
}) => (
	<div className="file-details-thumbnail flex items-start gap-3">
		<Thumbnail type={file.type} extension={file.extension} url={file.url} />
		<div className="flex flex-col flex-1">
			<div className="flex items-center justify-between gap-2">
				<p className="subtitle-2 mb-1">{file.name}</p>
				{status && (
					<div
						className={`inline-block px-2 py-1 ${getStatusBadgeClasses(
							status,
						)}`}
					>
						{getStatusLabel(status)}
					</div>
				)}
			</div>
			<FormattedDateTime date={file.$createdAt} className="caption" />
			<p className="text-sm text-slate-600">
				{convertFileSize({ sizeInBytes: file.size })}
			</p>
		</div>
	</div>
);

// Map contract status to badge color and label (same as Card component)
const getStatusBadgeClasses = (status: string) => {
	switch (status) {
		case "pending-review":
			return "border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium";
		case "action-required":
			return "border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium";
		case "active":
			return "border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium";
		case "inactive":
			return "border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium";
		case "expired":
			return "border-2 border-purple-600 bg-purple-50 text-purple-900 text-xs rounded-xl font-medium";
		default:
			return "border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium";
	}
};

const getStatusLabel = (status: string) => {
	switch (status) {
		case "pending-review":
			return "Pending Review";
		case "action-required":
			return "Action Required";
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
}: {
	file: UIFileDoc;
	onRefresh?: () => void;
	onExpiryDateChange?: (newExpiryDate: string) => void;
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
	const contractName = file.contractName || file.name;
	const contractType = file.contractType;
	const contractNumber = file.contractNumber;
	const amount = file.amount;
	const vendor = file.vendor;
	const department = file.department;
	const priority = file.priority;
	const compliance = file.compliance;
	const assignedManagers = file.assignedManagers || [];
	const description = file.description;
	const currentExpiry: string | undefined = file.contractExpiryDate;
	const status = file.status;

	// Sync displayExpiry with file prop changes
	React.useEffect(() => {
		setDisplayExpiry(file.contractExpiryDate);
	}, [file.contractExpiryDate]);

	// Debug logging to see what data is available
	console.log("🔍 FileDetails Debug:", {
		fileId: file.$id,
		fileName: file.name,
		isContract,
		contractId: file.contractId,
		contractName,
		contractType,
		contractNumber,
		amount,
		vendor,
		department,
		priority,
		compliance,
		assignedManagers,
		description,
		currentExpiry,
		status,
		fullFile: file,
	});

	// Helper function to format date for display (avoiding timezone issues)
	const formatDateForDisplay = (dateString: string | undefined): string => {
		if (!dateString) return "N/A";

		const date = parseLocalDate(dateString);
		if (!date || Number.isNaN(date.getTime())) return "N/A";

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
			return <span className="text-slate-400">-</span>;
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

	// Helper function to format and display values, returning "N/A" for null/empty
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
			return "N/A";
		}

		if (type === "boolean") {
			return value === true ? "Yes" : value === false ? "No" : "N/A";
		}

		if (type === "array") {
			if (Array.isArray(value) && value.length > 0) {
				return value.join(", ");
			}
			return "N/A";
		}

		if (type === "date" && value) {
			try {
				// Parse as local date to avoid timezone issues
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
				// Fallback for ISO strings
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
				// Last resort: use standard Date parsing
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
			return `$${value.toLocaleString()}`;
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

	// Helper component to render a field
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
	) => (
		<div className="bg-white rounded-lg p-3 border border-slate-200 overflow-hidden">
			<p className="text-sm text-slate-500 font-medium mb-1 break-words">
				{label}
			</p>
			{type === "priority" && value ? (
				<div className="flex items-center space-x-2 min-w-0">
					<span
						className={`w-3 h-3 rounded-full flex-shrink-0 ${
							value === "Urgent"
								? "bg-red-500"
								: value === "High"
									? "bg-orange-500"
									: value === "Medium"
										? "bg-yellow-500"
										: "bg-green-500"
						}`}
					></span>
					<span className="text-slate-800 font-semibold break-words min-w-0">
						{formatDisplayValue(value, type)}
					</span>
				</div>
			) : (
				<p className="text-slate-800 font-semibold break-words overflow-wrap-anywhere">
					{formatDisplayValue(value, type)}
				</p>
			)}
		</div>
	);

	const saveExpiry = async () => {
		console.log("saveExpiry called", { selectedDate, file: file.$id });

		if (!selectedDate) {
			console.warn("No date selected");
			toast({
				title: "No Date Selected",
				description: "Please select a date before saving.",
				variant: "destructive",
			});
			return;
		}

		// Validate file ID exists
		if (!file.$id || typeof file.$id !== "string" || file.$id.trim() === "") {
			console.error("Invalid file ID:", file.$id);
			toast({
				title: "Error",
				description: "File document ID is missing or invalid.",
				variant: "destructive",
			});
			return;
		}

		try {
			// Normalize the date to midnight local time to avoid timezone issues
			// Create a new date at midnight local time using the selected date's components
			const normalizedDate = new Date(
				selectedDate.getFullYear(),
				selectedDate.getMonth(),
				selectedDate.getDate(),
			);

			// Extract date components from normalized date (ensures local timezone)
			const year = normalizedDate.getFullYear();
			const month = String(normalizedDate.getMonth() + 1).padStart(2, "0");
			const day = String(normalizedDate.getDate()).padStart(2, "0");
			const expiryDateISO = `${year}-${month}-${day}`;

			console.log("Date conversion:", {
				selectedDate,
				normalizedDate,
				year,
				month,
				day,
				expiryDateISO,
				selectedDateLocalString: selectedDate.toLocaleDateString("en-US"),
				normalizedDateLocalString: normalizedDate.toLocaleDateString("en-US"),
			});

			// Determine the correct document ID to use
			// When file comes from contracts collection (via /api/contracts/all), file.$id IS the contract ID
			// When file has contractId set, use that
			// Otherwise, use file.$id (which should be the contract ID for contracts)
			const documentId = (file as any).contractId || file.$id;

			console.log("Updating expiry date:", {
				documentId,
				expiryDateISO,
				fileId: file.$id,
				contractId: (file as any).contractId,
				currentExpiryDate: file.contractExpiryDate,
				fileObject: file,
			});

			// Use server action to update expiry date (handles authentication properly)
			console.log("Calling updateContractExpiryDate...");
			const result = await updateContractExpiryDate(documentId, expiryDateISO);
			console.log("updateContractExpiryDate result:", result);

			if (!result?.success) {
				console.error("Update did not return success:", result);
				throw new Error("Update did not return success");
			}

			console.log("✅ Expiry date update completed successfully");

			// Update local state to reflect the change immediately
			setDisplayExpiry(expiryDateISO);
			setLastSavedExpiry(expiryDateISO); // Track what we just saved
			setEditing(false);
			setSelectedDate(undefined); // Reset selected date after save

			// Update the file object's contractExpiryDate property directly
			(file as any).contractExpiryDate = expiryDateISO;

			// Optimistically update the card component immediately
			if (onExpiryDateChange) {
				onExpiryDateChange(expiryDateISO);
			}

			// Trigger refresh to update card and table views with latest server data
			// Use a longer delay to ensure the database has been updated and cached data is cleared
			setTimeout(() => {
				if (onRefresh) {
					console.log("🔄 Calling onRefresh callback to update parent data");
					onRefresh();
				}
			}, 1000);

			toast({
				title: "Success",
				description: `Expiry date updated to ${selectedDate.toLocaleDateString()}.`,
			});
		} catch (error: any) {
			console.error("❌ Failed to update expiry date:", {
				error,
				message: error?.message,
				stack: error?.stack,
				selectedDate,
				fileId: file.$id,
				contractId: (file as any).contractId,
			});
			toast({
				title: "Update Failed",
				description:
					error?.message ||
					"An unexpected error occurred while updating the expiry date. Please check the console for details.",
				variant: "destructive",
			});
			// Don't close editing mode on error so user can try again
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

	return (
		<>
			<ImageThumbnail file={file} status={status} />

			<Accordion
				type="multiple"
				className="w-full space-y-4"
				defaultValue={["file-info", "contract-info"]}
			>
				{/* File Information Accordion */}
				<AccordionItem
					value="file-info"
					className="bg-slate-50 rounded-lg border border-slate-200 px-4"
				>
					<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
						<FileText className="w-4 h-4 text-blue-600" />
						File Information
					</AccordionTrigger>
					<AccordionContent>
						<div className="grid grid-cols-3 gap-3 pt-2">
							{renderField("Owner", ownerName || "N/A")}
							{renderField("Created", file.$createdAt, "date")}
							{renderField("Last Modified", file.$updatedAt, "date")}
							{renderField("File ID", contractAttributes.fileId)}
							{renderField("Extension", contractAttributes.extension)}
							{renderField(
								"Size",
								contractAttributes.size
									? convertFileSize({ sizeInBytes: contractAttributes.size })
									: "N/A",
							)}
						</div>
					</AccordionContent>
				</AccordionItem>

				{/* Contract Information Accordion */}
				{isContract && (
					<>
						<AccordionItem
							value="contract-info"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Contract Information
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Priority",
										contractAttributes.priority,
										"priority",
									)}
									{renderField(
										"Contract Amount",
										contractAttributes.amount,
										"currency",
									)}
									{renderField(
										"Contract Type",
										contractAttributes.contractType,
										"contractType",
									)}
									{renderField("Vendor/Supplier", contractAttributes.vendor)}
									{renderField("Department", contractAttributes.department)}
									{renderField(
										"Contract Number",
										contractAttributes.contractNumber,
									)}
									{renderField(
										"Contract Name",
										contractAttributes.contractName,
									)}
									{renderField("Status", contractAttributes.status)}
									{renderField(
										"Lifecycle Status",
										contractAttributes.lifecycleStatus,
									)}
									{renderField(
										"Contract Category",
										contractAttributes.contractCategory,
									)}
									<div className="col-span-3">
										{renderField(
											"Description",
											contractAttributes.description,
										)}
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Dates & Timeline Accordion */}
						<AccordionItem
							value="dates"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<Clock className="w-4 h-4 text-blue-600" />
								Dates & Timeline
							</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-3 pt-2">
									<div className="bg-white rounded-lg p-3 border border-slate-200 overflow-hidden">
										<div className="flex items-center justify-between min-w-0">
											<div className="min-w-0 flex-1">
												<p className="text-sm text-slate-500 font-medium mb-1 break-words">
													Expiry Date
												</p>
												<p className="text-slate-800 font-semibold break-words overflow-wrap-anywhere">
													{formatDateForDisplay(displayExpiry)}
												</p>
											</div>
											{(() => {
												// Check if contract is expired
												const isContractExpired =
													file.status?.toLowerCase() === "expired" ||
													file.isExpired ||
													(file.contractExpiryDate &&
														new Date(file.contractExpiryDate) < new Date());

												// Don't show Edit Date button if contract is expired
												if (isContractExpired) {
													return null;
												}

												return !editing ? (
													<ShadButton
														onClick={() => setEditing(true)}
														variant="outline"
														size="sm"
														className="primary-btn px-3 sm:px-4"
													>
														<SquarePen className="w-4 h-4" />
														Edit Date
													</ShadButton>
												) : (
													<div className="flex items-center space-x-2">
														<Popover>
															<PopoverTrigger asChild>
																<ShadButton
																	variant="outline"
																	size="sm"
																	className="w-[180px] justify-start text-left font-normal border-blue-300"
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
																		console.log(
																			"Calendar date selected:",
																			date,
																		);
																		// Normalize the date to midnight local time to avoid timezone issues
																		if (date) {
																			const normalized = new Date(
																				date.getFullYear(),
																				date.getMonth(),
																				date.getDate(),
																			);
																			console.log("Normalized date:", {
																				original: date,
																				normalized,
																				originalLocal:
																					date.toLocaleDateString("en-US"),
																				normalizedLocal:
																					normalized.toLocaleDateString(
																						"en-US",
																					),
																			});
																			setSelectedDate(normalized);
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
																console.log("Save button clicked", {
																	selectedDate,
																});
																saveExpiry();
															}}
															disabled={!selectedDate}
															className="primary-btn px-3 sm:px-4"
															type="button"
														>
															<Save className="w-4 h-4" />
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
															<Ban className="w-4 h-4" />
															Cancel
														</ShadButton>
													</div>
												);
											})()}
										</div>
									</div>
									{renderField(
										"Start Date",
										contractAttributes.startDate,
										"date",
									)}
									{renderField(
										"Execution Date",
										contractAttributes.executionDate,
										"date",
									)}
									{renderField(
										"Days Until Expiry",
										contractAttributes.daysUntilExpiry,
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Counterparty Information Accordion */}
						<AccordionItem
							value="counterparty"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Counterparty Information
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Counterparty Legal Name",
										contractAttributes.counterpartyLegalName,
									)}
									{renderField(
										"Contact Email",
										contractAttributes.counterpartyContactEmail,
									)}
									{renderField(
										"Contact Phone",
										contractAttributes.counterpartyContactPhone,
									)}
									{renderField(
										"Address",
										contractAttributes.counterpartyAddress,
									)}
									{renderField("Type", contractAttributes.counterpartyType)}
									{renderField("Tax ID", contractAttributes.counterpartyTaxId)}
									{renderField(
										"DUNS Number",
										contractAttributes.counterpartyDunsNumber,
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Financial Details Accordion */}
						<AccordionItem
							value="financial"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Financial Details
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Currency Code",
										contractAttributes.currencyCode,
									)}
									{renderField(
										"Not To Exceed Amount",
										contractAttributes.notToExceedAmount,
										"currency",
									)}
									{renderField(
										"Payment Terms",
										contractAttributes.paymentTerms,
									)}
									{renderField(
										"Payment Schedule",
										contractAttributes.paymentSchedule,
									)}
									{renderField("Budget Code", contractAttributes.budgetCode)}
									{renderField("Cost Center", contractAttributes.costCenter)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Compliance & Risk Accordion */}
						<AccordionItem
							value="compliance"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Compliance & Risk
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Compliance Level",
										contractAttributes.complianceLevel,
									)}
									{renderField(
										"Compliance Status",
										contractAttributes.compliance,
										"compliance",
									)}
									{renderField("Risk Level", contractAttributes.riskLevel)}
									{renderField(
										"Regulatory Requirements",
										contractAttributes.regulatoryRequirements,
									)}
									{renderField(
										"HIPAA Required",
										contractAttributes.hipaaRequired,
										"boolean",
									)}
									{renderField(
										"Data Privacy Requirements",
										contractAttributes.dataPrivacyRequirements,
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Insurance & Legal Accordion */}
						<AccordionItem
							value="insurance"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Insurance & Legal
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Insurance Required",
										contractAttributes.insuranceRequired,
										"boolean",
									)}
									{renderField(
										"Insurance Verified Date",
										contractAttributes.insuranceVerifiedDate,
										"date",
									)}
									{renderField(
										"Insurance Expiry Date",
										contractAttributes.insuranceExpiryDate,
										"date",
									)}
									{renderField(
										"Indemnification Included",
										contractAttributes.indemnificationIncluded,
										"boolean",
									)}
									{renderField(
										"Background Check Required",
										contractAttributes.backgroundCheckRequired,
										"boolean",
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Contract Terms Accordion */}
						<AccordionItem
							value="terms"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Contract Terms
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Auto Renew",
										contractAttributes.autoRenew,
										"boolean",
									)}
									{renderField(
										"Renewal Notice Days",
										contractAttributes.renewalNoticeDays,
									)}
									{renderField(
										"Termination Notice Days",
										contractAttributes.terminationNoticeDays,
									)}
									{renderField(
										"Termination Rights",
										contractAttributes.terminationRights,
									)}
									{renderField(
										"Cure Period Days",
										contractAttributes.curePeriodDays,
									)}
									{renderField(
										"Post Termination Obligations",
										contractAttributes.postTerminationObligations,
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Organization & Ownership Accordion */}
						<AccordionItem
							value="organization"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Organization & Ownership
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField("Organization ID", contractAttributes.orgId)}
									{renderField(
										"Contract Owner",
										contractOwnerFullName || contractAttributes.contractOwnerId,
									)}
									{renderField(
										"Department Owner",
										contractAttributes.departmentOwner,
									)}
									{renderField(
										"Business Unit",
										contractAttributes.businessUnit,
									)}
									{renderField(
										"Sub Department",
										contractAttributes.subDepartment,
									)}
									{renderField("Division", contractAttributes.division)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Approval & Workflow Accordion */}
						<AccordionItem
							value="approval"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Approval & Workflow
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Approval Workflow Template",
										contractAttributes.approvalWorkflowTemplate,
									)}
									{renderField(
										"Current Approval Stage",
										contractAttributes.currentApprovalStage,
									)}
									{renderField(
										"Approval History Log",
										contractAttributes.approvalHistoryLog,
									)}
									{renderField(
										"Reviewer Comments",
										contractAttributes.reviewerComments,
									)}
									{renderField(
										"Internal Approver IDs",
										contractAttributes.internalApproverIds,
										"array",
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Related Documents Accordion */}
						<AccordionItem
							value="documents"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Related Documents
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Related Document IDs",
										contractAttributes.relatedDocumentIds,
										"array",
									)}
									{renderField(
										"Attachment References",
										contractAttributes.attachmentReferences,
										"array",
									)}
									{renderField(
										"Parent Contract ID",
										contractAttributes.parentContractId,
									)}
									{renderField(
										"Template Used",
										contractAttributes.templateUsed,
									)}
									{renderField(
										"Version Number",
										contractAttributes.versionNumber,
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Performance & Metrics Accordion */}
						<AccordionItem
							value="performance"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Performance & Metrics
							</AccordionTrigger>
							<AccordionContent>
								<div className="grid grid-cols-3 gap-3 pt-2">
									{renderField(
										"Service Level Agreements",
										contractAttributes.serviceLevelAgreements,
									)}
									{renderField(
										"Performance Metrics",
										contractAttributes.performanceMetrics,
									)}
									{renderField(
										"Reporting Requirements",
										contractAttributes.reportingRequirements,
									)}
									{renderField(
										"Audit Rights Granted",
										contractAttributes.auditRightsGranted,
										"boolean",
									)}
									{renderField(
										"Key Obligations",
										contractAttributes.keyObligations,
										"array",
									)}
								</div>
							</AccordionContent>
						</AccordionItem>

						{/* Additional Details Accordion */}
						<AccordionItem
							value="additional"
							className="bg-slate-50 rounded-lg border border-slate-200 px-4"
						>
							<AccordionTrigger className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:no-underline">
								<FileText className="w-4 h-4 text-blue-600" />
								Additional Details
							</AccordionTrigger>
							<AccordionContent>
								<div className="space-y-3 pt-2">
									{assignedManagers && assignedManagers.length > 0 && (
										<div className="bg-white rounded-lg p-3 border border-slate-200 overflow-hidden">
											<p className="text-sm text-slate-500 font-medium mb-2 break-words">
												Assigned To
											</p>
											{renderAssignedManagers()}
										</div>
									)}
								</div>
							</AccordionContent>
						</AccordionItem>
					</>
				)}
			</Accordion>
		</>
	);
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

export const ShareInput = ({
	file,
	onInputChange,
	onRemove,
	currentUsers,
}: Props) => {
	const { orgId } = useOrganization();
	const { toast } = useToast();

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

	return (
		<>
			<ImageThumbnail file={file} />

			<div className="space-y-4" style={{ pointerEvents: "none" }}>
				{/* CAALM users by department */}
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
					<Label className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
						<Users className="h-4 w-4 text-blue-600" />
						Select CAALM users
					</Label>

					<div className="relative mb-3" style={{ pointerEvents: "auto" }}>
						<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<Input
							value={userSearch}
							onChange={(e) => setUserSearch(e.target.value)}
							placeholder="Search by name, email, or department"
							data-with-leading-icon="true"
							className="h-10 border-slate-300 bg-white pl-10"
							onClick={(e) => e.stopPropagation()}
						/>
					</div>

					<div
						className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white"
						style={{ pointerEvents: "auto" }}
					>
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
							<Accordion
								key={usersByDepartment.map(([dept]) => dept).join("|")}
								type="multiple"
								defaultValue={usersByDepartment.map(([dept]) => dept)}
								className="w-full"
							>
								{usersByDepartment.map(([department, users]) => (
									<AccordionItem
										key={department}
										value={department}
										className="border-b border-slate-100 px-2 last:border-b-0"
									>
										<AccordionTrigger className="py-2.5 text-sm font-semibold text-slate-800 hover:no-underline">
											<span className="flex items-center gap-2">
												{formatDeptLabel(department)}
												<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
													{users.length}
												</span>
											</span>
										</AccordionTrigger>
										<AccordionContent className="pb-2">
											<ul className="space-y-1">
												{users.map((user) => {
													const checked = selectedSet.has(
														normalizeEmail(user.email),
													);
													return (
														<li key={user.$id}>
															<label
																className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-blue-50"
																onClick={(e) => e.stopPropagation()}
															>
																<Checkbox
																	checked={checked}
																	onCheckedChange={(value) =>
																		toggleDirectoryUser(user, value === true)
																	}
																	aria-label={`Share with ${user.fullName}`}
																	className="cursor-pointer"
																/>
																<span className="min-w-0 flex-1">
																	<span className="block truncate text-sm font-medium text-slate-800">
																		{user.fullName}
																	</span>
																	<span className="block truncate text-xs text-slate-500">
																		{user.email}
																	</span>
																</span>
															</label>
														</li>
													);
												})}
											</ul>
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						)}
					</div>
				</div>

				{/* Email entry for external / unknown recipients */}
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
					<Label
						className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700"
						htmlFor="share-email"
					>
						<Users className="h-4 w-4 text-blue-600" />
						Or share by email
					</Label>
					<div
						className="flex items-center gap-2"
						style={{ pointerEvents: "auto" }}
					>
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
							className="h-9 flex-1 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
						/>
						<Button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								handleAddEmail();
							}}
							className="primary-btn h-9! min-h-9! w-auto! shrink-0 rounded-full! px-3! py-1.5! text-sm sm:w-auto!"
						>
							<Plus className="h-3.5 w-3.5" />
							Add
						</Button>
					</div>
					<p className="mt-2 text-xs text-slate-500">
						Use this for people who are not in CAALM yet.
					</p>
				</div>

				{/* Shared with Section */}
				<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
					<div className="mb-3 flex items-center justify-between">
						<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
							<Users className="h-4 w-4 text-blue-600" />
							Shared with
						</Label>
						<span className="text-sm font-medium text-slate-600">
							{displayUsers.length}{" "}
							{displayUsers.length === 1 ? "user" : "users"}
						</span>
					</div>
					{displayUsers.length > 0 ? (
						<div className="space-y-2">
							{displayUsers.map((email: string) => {
								const trimmed = email.trim();
								const displayName =
									emailDisplayNames[trimmed] ||
									emailDisplayNames[normalizeEmail(trimmed)] ||
									trimmed;
								return (
									<div
										key={email}
										className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
										style={{ pointerEvents: "auto" }}
									>
										<span
											className="truncate text-sm text-slate-700"
											title={
												displayName !== trimmed
													? `${displayName} (${trimmed})`
													: trimmed
											}
										>
											{displayName}
										</span>
										<Button
											onClick={(e) => {
												e.stopPropagation();
												onRemove(email);
											}}
											variant="ghost"
											size="sm"
											className="h-6 w-6 rounded-full p-0 hover:bg-red-50"
										>
											<X className="h-4 w-4 text-red-600" />
										</Button>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-sm text-slate-500 italic">No users shared yet</p>
					)}
				</div>

				{/* File Information Section */}
				<div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
					<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
						<FileText className="h-4 w-4 text-blue-600" />
						File Information
					</Label>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
						<div className="flex min-w-0 items-center justify-between">
							<span className="min-w-0 text-sm font-medium wrap-break-word text-slate-600">
								Format
							</span>
							<span className="overflow-wrap-anywhere min-w-0 text-sm font-semibold wrap-break-word text-slate-800">
								{file.extension}
							</span>
						</div>
					</div>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
						<div className="flex min-w-0 items-center justify-between">
							<span className="min-w-0 text-sm font-medium wrap-break-word text-slate-600">
								Size
							</span>
							<span className="overflow-wrap-anywhere min-w-0 text-sm font-semibold wrap-break-word text-slate-800">
								{convertFileSize({ sizeInBytes: file.size })}
							</span>
						</div>
					</div>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
						<div className="flex min-w-0 items-center justify-between">
							<span className="min-w-0 text-sm font-medium wrap-break-word text-slate-600">
								Owner
							</span>
							<span className="overflow-wrap-anywhere min-w-0 text-sm font-semibold wrap-break-word text-slate-800">
								{ownerName}
							</span>
						</div>
					</div>

					<div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
						<div className="flex min-w-0 items-center justify-between">
							<span className="min-w-0 text-sm font-medium wrap-break-word text-slate-600">
								Last Modified
							</span>
							<span className="overflow-wrap-anywhere min-w-0 text-sm font-semibold wrap-break-word text-slate-800">
								{formatDateTime(file.$updatedAt)}
							</span>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};
