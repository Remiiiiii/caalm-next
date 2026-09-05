"use client";

import * as VisuallyHiddenPrimitive from "@radix-ui/react-visually-hidden";
import {
	addDays,
	addMonths,
	addWeeks,
	endOfMonth,
	endOfWeek,
	format,
	startOfMonth,
	startOfWeek,
	subDays,
	subMonths,
	subWeeks,
} from "date-fns";
import {
	AlertTriangle,
	Ban,
	CalendarDays,
	Calendar as CalendarIcon,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	Grid3X3,
	List,
	Loader2,
	MapPin,
	MessageSquare,
	Paperclip,
	Pencil,
	Plus,
	SlidersHorizontal,
	Tag,
	Trash2,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import CalendarAIChat from "@/components/CalendarAIChat";
import { CalendarDelegationManager } from "@/components/CalendarDelegationManager";
import CalendarSettings from "@/components/CalendarSettings";
import { CalendarSidebar } from "@/components/CalendarSidebar";
import { CreateSharedCalendarDialog } from "@/components/CreateSharedCalendarDialog";
import { AgendaView } from "@/components/calendar/AgendaView";
import { ApprovalReviewDialog } from "@/components/calendar/ApprovalReviewDialog";
import { CalendarApprovalsRail } from "@/components/calendar/CalendarApprovalsRail";
import { CalendarFiltersDrawer } from "@/components/calendar/CalendarFiltersDrawer";
import { ConflictDialog } from "@/components/calendar/ConflictDialog";
import { DayView } from "@/components/calendar/DayView";
import { DeleteEventDialog } from "@/components/calendar/DeleteEventDialog";
import { EventReviewDialog } from "@/components/calendar/EventReviewDialog";
import type { CalendarSource } from "@/components/calendar/eventChipStyles";
import { MonthView } from "@/components/calendar/MonthView";
import { OverflowDialog } from "@/components/calendar/OverflowDialog";
import type {
	EventAttachment,
	LocalCalendarEvent,
	NewEventForm,
	OutlookStyleCalendarProps,
	ParticipantOption,
} from "@/components/calendar/outlookStyleCalendarTypes";
import {
	QuickCreateEventPopover,
	type QuickCreatePayload,
} from "@/components/calendar/QuickCreateEventPopover";
import { ShareEventDialog } from "@/components/calendar/ShareEventDialog";
import { TimeGridWeekView } from "@/components/calendar/TimeGridWeekView";
import { EventReminderConfig as EventReminderConfigComponent } from "@/components/EventReminderConfig";
import { ResourceManager } from "@/components/ResourceManager";
import { SharedCalendarManager } from "@/components/SharedCalendarManager";
import { SharePrimaryCalendarDialog } from "@/components/SharePrimaryCalendarDialog";
import Avatar from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type CalendarSensitivity,
	type PermissionOverrideRecord,
	SENSITIVITY_LABELS,
} from "@/constants/rbac";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { useToast } from "@/hooks/use-toast";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useCalendarApprovals } from "@/hooks/useCalendarApprovals";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendarPermissions } from "@/hooks/useCalendarPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useSharedCalendars } from "@/hooks/useSharedCalendars";
import { useUserRole } from "@/hooks/useUserRole";
import {
	hasMicrosoftCalendarIntegration,
	syncMicrosoftCalendar,
} from "@/lib/actions/calendar.actions";
import type { CalendarApprovalRequest } from "@/lib/actions/calendar-approval.actions";
import {
	getCalendarApprovalById,
	getLatestApprovalRequestByEventId,
} from "@/lib/actions/calendar-approval.actions";
import type { SharedCalendar } from "@/lib/actions/shared-calendar.actions";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import {
	isCalendarEventOwner,
	resolveCalendarPermissions,
} from "@/lib/auth/permissions";
import {
	formatTimeForDisplay,
	parseTimeToMinutes,
} from "@/lib/calendar/eventDisplayFormat";
import { cn, convertFileSize, getFileType } from "@/lib/utils";
import {
	getEnterpriseInputAccept,
	validateEnterpriseFile,
} from "@/lib/files/enterprise-file-formats";
import { getUSHolidaysForMonth, parseHolidayDate } from "@/lib/utils/holidays";

type CalendarViewMode = "day" | "week" | "month" | "agenda";

const OutlookStyleCalendar: React.FC<OutlookStyleCalendarProps> = ({
	events = [],
	onDateSelect,
	user,
}) => {
	const { toast } = useToast();
	const timeZone = useOrgTimezone();

	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		new Date(),
	);

	// Participant names state
	const [participantNames, setParticipantNames] = useState<string[]>([]);
	const [loadingNames, setLoadingNames] = useState(false);

	// Delete modal state
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [deleteReason, setDeleteReason] = useState("");

	// Pending approvals rail — expanded by default on desktop when items exist
	const [isApprovalsExpanded, setIsApprovalsExpanded] = useState(true);
	const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);
	const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
	const [quickCreateDate, setQuickCreateDate] = useState<Date | null>(null);
	const [quickCreateHour, setQuickCreateHour] = useState<number | null>(null);

	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const [isEditEventOpen, setIsEditEventOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<LocalCalendarEvent | null>(
		null,
	);
	// State for fetched attachment details
	const [attachmentDetails, setAttachmentDetails] = useState<
		Record<string, EventAttachment>
	>({});
	// Overflow dialog state for days with more than 3 events
	const [isOverflowOpen, setIsOverflowOpen] = useState(false);
	const [overflowDate, setOverflowDate] = useState<Date | null>(null);
	const [overflowEvents, setOverflowEvents] = useState<LocalCalendarEvent[]>(
		[],
	);
	const [creatingEvent, setCreatingEvent] = useState(false);
	const [outlookConnected, setOutlookConnected] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	// Calendar selection state
	const [selectedMyCalendars, setSelectedMyCalendars] = useState({
		calendar: true, // Default checked
		usHolidays: false,
		resources: true,
	});
	const [selectedSharedCalendars, setSelectedSharedCalendars] = useState<
		string[]
	>([]);
	const [sharedCalendars, setSharedCalendars] = useState<SharedCalendar[]>([]);
	const [loadingSharedCalendars, setLoadingSharedCalendars] = useState(false);
	const [sharedCalendarOwnerNames, setSharedCalendarOwnerNames] = useState<
		Record<string, string>
	>({});
	const calendarContainerRef = React.useRef<HTMLDivElement>(null);
	const [calendarWidth, setCalendarWidth] = useState<string>("100%");

	// Conflict dialog state
	const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
	const [conflictData, setConflictData] = useState<{
		conflicts: Array<{
			type: "participant" | "resource";
			conflictingEvent: any;
			conflictReason: string;
		}>;
		alternateSlots: Array<{
			startDate: string;
			startTime: string;
			endDate: string;
			endTime: string;
		}>;
		pendingEventData: any;
	} | null>(null);

	// Enable automatic sync with Outlook (polls every 5 minutes)
	useAutoSync(user?.$id, outlookConnected);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [isCreateSharedCalendarOpen, setIsCreateSharedCalendarOpen] =
		useState(false);
	const [isSharePrimaryCalendarOpen, setIsSharePrimaryCalendarOpen] =
		useState(false);
	const [shareSettings, setShareSettings] = useState({
		users: [],
		permissions: "view" as "view" | "edit",
		linkEnabled: false,
	});

	// Participant search state
	const [participantSearch, setParticipantSearch] = useState("");
	const [searchResults, setSearchResults] = useState<ParticipantOption[]>([]);
	const [selectedParticipants, setSelectedParticipants] = useState<
		ParticipantOption[]
	>([]);
	const [isSearching, setIsSearching] = useState(false);

	// Contracts state for dropdown
	const [contracts, setContracts] = useState<
		Array<{ id: string; name: string }>
	>([]);
	const [loadingContracts, setLoadingContracts] = useState(false);

	// Location search state
	const [locationSearch, setLocationSearch] = useState("");
	const [locationResults, setLocationResults] = useState<
		Array<{
			id: string;
			name: string;
			address: string;
			type?: "external" | "resource";
			resourceId?: string;
		}>
	>([]);
	const [isSearchingLocation, setIsSearchingLocation] = useState(false);
	const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
		null,
	);

	// AI Panel state
	const [showAiPanel, setShowAiPanel] = useState(false);
	const [aiPanelMode, setAiPanelMode] = useState<"pre-reads" | "chat">("chat");
	const [contractData, setContractData] = useState<{
		title?: string;
		description?: string;
		noticeId?: string;
		content?: string;
	} | null>(null);
	const [loadingContract, setLoadingContract] = useState(false);

	const { userId, accountId } = useUserRole();
	const { permissions: basePermissions } = useCalendarPermissions({ userId });
	const canCreateEvent = basePermissions.createEvent;
	const { permissions } = usePermissions();
	const isApprover = permissions.includes(PERMISSIONS.EVENTS.APPROVE);

	const {
		approvals,
		isLoading: approvalsLoading,
		refresh: refreshApprovals,
	} = useCalendarApprovals({
		status: "pending",
		enabled: isApprover,
	});

	// Auto-expand approvals section when there are pending approvals
	useEffect(() => {
		if (!approvalsLoading && approvals.length > 0) {
			setIsApprovalsExpanded(true);
		} else if (!approvalsLoading && approvals.length === 0) {
			setIsApprovalsExpanded(false);
		}
	}, [approvals, approvalsLoading]);

	// Approval dialog state
	const [selectedApproval, setSelectedApproval] =
		useState<CalendarApprovalRequest | null>(null);
	const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
	const [isProcessingApproval, setIsProcessingApproval] = useState(false);

	const [reviewerNotes, setReviewerNotes] = useState("");
	const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
	const [loadingUserNames, setLoadingUserNames] = useState(false);
	const [eventApprovalRequest, setEventApprovalRequest] =
		useState<CalendarApprovalRequest | null>(null);
	const [loadingApprovalRequest, setLoadingApprovalRequest] = useState(false);
	const [attachmentNamesMap, setAttachmentNamesMap] = useState<
		Record<string, string>
	>({});
	const [loadingAttachmentNames, setLoadingAttachmentNames] = useState(false);

	// Fetch user names for account/user IDs in approval change summary
	useEffect(() => {
		const fetchUserNames = async () => {
			if (!selectedApproval || selectedApproval.changeType !== "update") {
				setUserNamesMap({});
				return;
			}

			const summary = selectedApproval.changeSummary || {};
			const after = (summary.after || {}) as Record<string, unknown>;
			const before = (summary.before || {}) as Record<string, unknown>;

			const userIds: string[] = [];
			const accountIds: string[] = [];

			// Collect all user IDs and account IDs from change summary
			// Also check consolidated fields
			const updatedByBefore = (before.updatedByAccountId ||
				before.updatedByUserId) as string | undefined;
			const updatedByAfter = (after.updatedByAccountId ||
				after.updatedByUserId) as string | undefined;
			const createdByBefore = (before.createdByAccountId ||
				before.createdByUserId) as string | undefined;
			const createdByAfter = (after.createdByAccountId ||
				after.createdByUserId) as string | undefined;

			// Add consolidated Updated By and Created By values
			if (updatedByBefore && typeof updatedByBefore === "string") {
				accountIds.push(updatedByBefore);
			}
			if (updatedByAfter && typeof updatedByAfter === "string") {
				accountIds.push(updatedByAfter);
			}
			if (createdByBefore && typeof createdByBefore === "string") {
				accountIds.push(createdByBefore);
			}
			if (createdByAfter && typeof createdByAfter === "string") {
				accountIds.push(createdByAfter);
			}

			// Also collect from individual fields
			Object.keys(after).forEach((key) => {
				if (key.includes("UserId") || key.includes("userId")) {
					const value = after[key] || before[key];
					if (value && typeof value === "string") {
						userIds.push(value);
					}
				}
				if (key.includes("AccountId") || key.includes("accountId")) {
					const value = after[key] || before[key];
					if (value && typeof value === "string") {
						accountIds.push(value);
					}
				}
			});

			if (userIds.length === 0 && accountIds.length === 0) {
				setUserNamesMap({});
				return;
			}

			setLoadingUserNames(true);
			try {
				const users = await fetchUserNamesByIds([...userIds, ...accountIds]);
				const namesMap: Record<string, string> = {};
				users.forEach((user) => {
					if (user.$id) namesMap[user.$id] = user.fullName || "Unknown User";
					if (user.accountId)
						namesMap[user.accountId] = user.fullName || "Unknown User";
				});
				setUserNamesMap(namesMap);
			} catch (error) {
				console.error("Failed to fetch user names:", error);
				setUserNamesMap({});
			} finally {
				setLoadingUserNames(false);
			}
		};

		fetchUserNames();
	}, [selectedApproval]);

	// Fetch attachment file names for attachment IDs in approval change summary
	useEffect(() => {
		const fetchAttachmentNames = async () => {
			if (!selectedApproval || selectedApproval.changeType !== "update") {
				setAttachmentNamesMap({});
				return;
			}

			const summary = selectedApproval.changeSummary || {};
			const after = (summary.after || {}) as Record<string, unknown>;
			const before = (summary.before || {}) as Record<string, unknown>;

			// Collect all attachment file IDs from change summary
			const attachmentFileIds: string[] = [];

			// Extract attachments from before and after
			const beforeAttachments = before.attachments;
			const afterAttachments = after.attachments;

			if (Array.isArray(beforeAttachments)) {
				beforeAttachments.forEach((att) => {
					if (typeof att === "string") {
						attachmentFileIds.push(att);
					} else if (att && typeof att === "object" && "$id" in att) {
						attachmentFileIds.push(String(att.$id));
					}
				});
			}

			if (Array.isArray(afterAttachments)) {
				afterAttachments.forEach((att) => {
					if (typeof att === "string") {
						if (!attachmentFileIds.includes(att)) {
							attachmentFileIds.push(att);
						}
					} else if (att && typeof att === "object" && "$id" in att) {
						const fileId = String(att.$id);
						if (!attachmentFileIds.includes(fileId)) {
							attachmentFileIds.push(fileId);
						}
					}
				});
			}

			if (attachmentFileIds.length === 0) {
				setAttachmentNamesMap({});
				return;
			}

			setLoadingAttachmentNames(true);
			try {
				const response = await fetch("/api/files/get-by-ids", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ fileIds: attachmentFileIds }),
				});

				if (response.ok) {
					const files: EventAttachment[] = await response.json();
					const namesMap: Record<string, string> = {};
					files.forEach((file) => {
						if (file.$id && file.name) {
							namesMap[file.$id] = file.name;
						}
					});
					setAttachmentNamesMap(namesMap);
				} else {
					console.error(
						"Failed to fetch attachment names:",
						response.statusText,
					);
					setAttachmentNamesMap({});
				}
			} catch (error) {
				console.error("Failed to fetch attachment names:", error);
				setAttachmentNamesMap({});
			} finally {
				setLoadingAttachmentNames(false);
			}
		};

		fetchAttachmentNames();
	}, [selectedApproval]);

	// Fetch approval request when event review dialog opens for events with changes_requested or rejected status
	useEffect(() => {
		const fetchApprovalRequest = async () => {
			if (
				!isEditEventOpen ||
				!selectedEvent ||
				(selectedEvent.approvalStatus !== "changes_requested" &&
					selectedEvent.approvalStatus !== "rejected")
			) {
				console.log(
					"[OutlookStyleCalendar] Skipping fetch - conditions not met",
				);
				setEventApprovalRequest(null);
				return;
			}

			setLoadingApprovalRequest(true);
			try {
				let approval: CalendarApprovalRequest | null = null;

				// First try to get by pendingApprovalId if it exists
				if (selectedEvent.pendingApprovalId) {
					console.log(
						"[OutlookStyleCalendar] Trying to fetch by pendingApprovalId:",
						selectedEvent.pendingApprovalId,
					);
					approval = await getCalendarApprovalById(
						selectedEvent.pendingApprovalId,
					);
					console.log(
						"[OutlookStyleCalendar] Result from getCalendarApprovalById:",
						{
							found: !!approval,
							status: approval?.status,
							reviewerNotes: approval?.reviewerNotes,
						},
					);
				}

				// If not found and status is changes_requested, get the most recent one
				if (
					!approval &&
					selectedEvent.approvalStatus === "changes_requested" &&
					selectedEvent.$id
				) {
					console.log(
						"[OutlookStyleCalendar] Calling getLatestApprovalRequestByEventId for changes_requested",
						{
							eventId: selectedEvent.$id,
							status: "changes_requested",
						},
					);
					try {
						approval = await getLatestApprovalRequestByEventId(
							selectedEvent.$id,
							"changes_requested",
						);
						console.log(
							"[OutlookStyleCalendar] getLatestApprovalRequestByEventId returned:",
							{
								found: !!approval,
								approvalId: approval?.$id,
								status: approval?.status,
								reviewerNotes: approval?.reviewerNotes,
								reviewerNotesType: typeof approval?.reviewerNotes,
								reviewerNotesLength: approval?.reviewerNotes?.length,
							},
						);
					} catch (error) {
						console.error(
							"[OutlookStyleCalendar] Error calling getLatestApprovalRequestByEventId:",
							error,
						);
					}
				}

				// If still not found and status is rejected, try to get rejected one
				if (
					!approval &&
					selectedEvent.approvalStatus === "rejected" &&
					selectedEvent.$id
				) {
					console.log(
						"[OutlookStyleCalendar] Calling getLatestApprovalRequestByEventId for rejected",
					);
					approval = await getLatestApprovalRequestByEventId(
						selectedEvent.$id,
						"rejected",
					);
				}

				setEventApprovalRequest(approval);
			} catch (error) {
				console.error("Failed to fetch approval request:", error);
				setEventApprovalRequest(null);
			} finally {
				setLoadingApprovalRequest(false);
			}
		};

		fetchApprovalRequest();
	}, [
		isEditEventOpen,
		selectedEvent?.$id,
		selectedEvent?.pendingApprovalId,
		selectedEvent?.approvalStatus,
		selectedEvent,
	]);

	// Check if selected event is a US holiday
	const isHolidayEvent = useMemo(() => {
		if (!selectedEvent) return false;
		return (
			selectedEvent.$id?.startsWith("holiday-") ||
			selectedEvent.id?.startsWith("holiday-")
		);
	}, [selectedEvent]);

	const selectedEventWithDetails = useMemo(() => {
		if (!selectedEvent) return null;
		if (!selectedEvent.attachments || selectedEvent.attachments.length === 0) {
			return selectedEvent;
		}

		const enrichedAttachments = selectedEvent.attachments.map((attachment) => {
			const fileId =
				typeof attachment === "string" ? attachment : attachment.$id;
			const detail = attachmentDetails[fileId];
			return detail ?? attachment;
		});

		return {
			...selectedEvent,
			attachments: enrichedAttachments,
		} as LocalCalendarEvent;
	}, [selectedEvent, attachmentDetails]);

	const selectedEventPermissions = useMemo(() => {
		if (!selectedEvent) {
			return null;
		}

		// Parse overrides from JSON string if needed (defensive parsing)
		let overrides: PermissionOverrideRecord[] = [];
		if (selectedEvent.overrides) {
			if (typeof selectedEvent.overrides === "string") {
				try {
					overrides = JSON.parse(
						selectedEvent.overrides,
					) as PermissionOverrideRecord[];
				} catch (error) {
					console.error(
						"[OutlookStyleCalendar] Error parsing overrides:",
						error,
					);
					overrides = [];
				}
			} else if (Array.isArray(selectedEvent.overrides)) {
				overrides = selectedEvent.overrides;
			}
		}

		return resolveCalendarPermissions({
			heldPermissions: permissions,
			isEventOwner: isCalendarEventOwner({
				userId,
				userAccountId: accountId,
				event: selectedEvent,
			}),
			overrides,
			context: {
				userId: userId || "",
				teamIds: [],
			},
		});
	}, [selectedEvent, permissions, userId, accountId]);

	const canViewSelectedEventSensitiveDetails =
		!selectedEvent ||
		(selectedEvent.sensitivityLevel || "standard") === "standard" ||
		(selectedEventPermissions?.viewSensitiveDetails ?? false);

	const resolvePermissionsForEvent = (event: LocalCalendarEvent) =>
		resolveCalendarPermissions({
			heldPermissions: permissions,
			isEventOwner: isCalendarEventOwner({
				userId,
				userAccountId: accountId,
				event,
			}),
			overrides: (event.overrides || []) as PermissionOverrideRecord[],
			context: {
				userId: userId || "",
				teamIds: [],
			},
		});

	const canViewEventSensitiveDetails = (event: LocalCalendarEvent) => {
		const sensitivity = event.sensitivityLevel || "standard";
		if (sensitivity === "standard") {
			return true;
		}
		const permissions = resolvePermissionsForEvent(event);
		return permissions.viewSensitiveDetails;
	};

	// Fetch contract data for event
	const fetchContractForEvent = async (event: LocalCalendarEvent) => {
		if (!event.contractName) return null;

		setLoadingContract(true);
		try {
			// Fetch contract data if contractName exists, regardless of event type
			// This allows contract access in chat mode even for non-contract-review events

			// Try to fetch from SAM API first (if contractName looks like a noticeId)
			// Notice IDs are typically alphanumeric strings
			const isLikelyNoticeId = /^[A-Z0-9-]+$/.test(event.contractName.trim());

			if (isLikelyNoticeId) {
				try {
					const response = await fetch(
						`/api/sam/contract-details?noticeId=${encodeURIComponent(
							event.contractName,
						)}`,
					);

					if (response.ok) {
						const result = await response.json();
						if (result.success && result.data) {
							const contractResult = {
								title: result.data.title || event.contractName,
								description: result.data.description || "",
								noticeId: result.data.noticeId || event.contractName,
								content: result.data.description || "",
							};
							setContractData(contractResult);
							return contractResult;
						}
					}
				} catch (error) {
					console.warn("Failed to fetch from SAM API:", error);
					// Continue to try database
				}
			}

			// Scoped lookup by name or id — avoids loading the full contract list
			try {
				const response = await fetch(
					`/api/contracts/database?name=${encodeURIComponent(event.contractName)}`,
				);
				if (response.ok) {
					const result = await response.json();
					const contracts = result.data?.contracts ?? result.contracts;
					if (result.success && contracts?.length) {
						const matchingContract = contracts[0];
						try {
							const contractDetailsResponse = await fetch(
								`/api/contracts/get-details?contractId=${encodeURIComponent(
									matchingContract.id,
								)}`,
							);

							if (contractDetailsResponse.ok) {
								const contractDetails = await contractDetailsResponse.json();

								if (contractDetails.success && contractDetails.data) {
									const contractInfo = contractDetails.data;
									const contractDataResult = {
										title: contractInfo.contractName || matchingContract.name,
										description: contractInfo.description || "",
										noticeId: matchingContract.id,
										content: "",
									};

									setContractData(contractDataResult);
									return contractDataResult;
								}
							}
						} catch (detailsError) {
							console.warn("Failed to fetch contract details:", detailsError);
						}

						const fallbackResult = {
							title: matchingContract.name,
							description: "",
							noticeId: matchingContract.id,
							content: "",
						};
						setContractData(fallbackResult);
						return fallbackResult;
					}
				}
			} catch (error) {
				console.warn("Failed to fetch from database:", error);
			}

			// Fallback: use contractName as title
			const fallbackContract = {
				title: event.contractName,
				description: "",
				noticeId: "",
				content: "",
			};
			setContractData(fallbackContract);
			return fallbackContract;
		} catch (error) {
			console.error("Error fetching contract:", error);
			return null;
		} finally {
			setLoadingContract(false);
		}
	};

	// Handle opening AI panel
	const handleOpenAiPanel = async (
		mode: "pre-reads" | "chat",
		event: LocalCalendarEvent | null,
	) => {
		if (!canViewSelectedEventSensitiveDetails) {
			toast({
				title: "Permission denied",
				description:
					"You do not have permission to access AI insights for this event.",
				variant: "destructive",
			});
			return;
		}

		setAiPanelMode(mode);
		setShowAiPanel(true);

		// Fetch contract data if event has a contract associated with it
		// This applies to both pre-reads and chat modes
		if (event?.contractName) {
			await fetchContractForEvent(event);
		} else {
			setContractData(null);
		}
	};

	// Reset contract data when panel closes
	useEffect(() => {
		if (!showAiPanel) {
			setContractData(null);
		}
	}, [showAiPanel]);

	// Function to generate smart placeholder times
	const getSmartPlaceholderTimes = (selectedDate: Date) => {
		const now = new Date();
		const isToday = selectedDate.toDateString() === now.toDateString();

		if (isToday) {
			// If it's today, use next hour from current time
			const nextHour = new Date(now);
			nextHour.setHours(now.getHours() + 1, 0, 0, 0);

			const startTime = nextHour.toTimeString().slice(0, 5); // HH:MM format
			const endTime = new Date(nextHour.getTime() + 30 * 60 * 1000)
				.toTimeString()
				.slice(0, 5); // +30 minutes

			return { startTime, endTime };
		} else {
			// If it's not today, use 8:00 AM as default
			return { startTime: "08:00", endTime: "08:30" };
		}
	};

	// Function to generate time options for dropdowns (30-minute intervals, 12-hour format)
	// Filters out past times when the selected date is today
	const generateTimeOptions = (selectedDate?: Date) => {
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const isToday =
			selectedDate &&
			new Date(
				selectedDate.getFullYear(),
				selectedDate.getMonth(),
				selectedDate.getDate(),
			).getTime() === today.getTime();

		const times = [];
		for (let hour = 0; hour < 24; hour++) {
			for (let minute = 0; minute < 60; minute += 30) {
				// Check if this time is in the past (only if date is today)
				let isPast = false;
				if (isToday) {
					const timeInMinutes = hour * 60 + minute;
					const nowInMinutes = now.getHours() * 60 + now.getMinutes();
					// Add a small buffer (5 minutes) to allow times very close to now
					isPast = timeInMinutes < nowInMinutes - 5;
				}

				// Format as 12-hour time
				const hours12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
				const ampm = hour >= 12 ? "PM" : "AM";
				const minutesStr = minute.toString().padStart(2, "0");
				const displayTime = `${hours12}:${minutesStr} ${ampm}`;

				// Also create the 24-hour format for storage
				const hours24 = hour.toString().padStart(2, "0");
				const time24 = `${hours24}:${minutesStr}`;

				times.push({
					value: time24, // Store as 24-hour format
					label: displayTime, // Display as 12-hour format
					disabled: isPast, // Disable past times
				});
			}
		}
		return times;
	};

	// Function to fetch contracts from database
	const fetchContracts = async () => {
		setLoadingContracts(true);
		try {
			const response = await fetch("/api/contracts/database");
			if (response.ok) {
				const data = await response.json();
				if (data.success && data.contracts) {
					setContracts(data.contracts);
				}
			}
		} catch (error) {
			console.error("Error fetching contracts:", error);
		} finally {
			setLoadingContracts(false);
		}
	};

	// Function to search for users
	const searchUsers = async (query: string) => {
		if (query.length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		try {
			const response = await fetch(
				`/api/users/search?q=${encodeURIComponent(query)}`,
			);
			if (response.ok) {
				const rawUsers: Array<ParticipantOption & { displayName?: string }> =
					await response.json();
				const normalized = rawUsers
					.filter((userOption) => Boolean(userOption?.$id))
					.map<ParticipantOption>((userOption) => ({
						$id: userOption.$id,
						fullName:
							userOption.fullName ||
							userOption.displayName ||
							userOption.name ||
							"",
						name: userOption.name,
						email: userOption.email || "",
					}))
					.filter((userOption) => userOption.email.length > 0);

				setSearchResults(normalized);
			}
		} catch (error) {
			console.error("Error searching users:", error);
			setSearchResults([]);
		} finally {
			setIsSearching(false);
		}
	};

	// Function to search for locations (both external and managed resources)
	const searchLocations = async (query: string) => {
		if (query.length < 2) {
			setLocationResults([]);
			return;
		}

		setIsSearchingLocation(true);
		try {
			// Search both external locations and managed resources in parallel
			const [externalResponse, resourcesResponse] = await Promise.all([
				fetch(`/api/locations/search?q=${encodeURIComponent(query)}`),
				fetch(`/api/calendar/resources?search=${encodeURIComponent(query)}`),
			]);

			const results: Array<{
				id: string;
				name: string;
				address: string;
				type?: "external" | "resource";
				resourceId?: string;
			}> = [];

			// Add external locations
			if (externalResponse.ok) {
				const externalData = await externalResponse.json();
				if (externalData.success && externalData.locations) {
					externalData.locations.forEach(
						(loc: { id: string; name: string; address: string }) => {
							results.push({
								...loc,
								type: "external",
							});
						},
					);
				}
			}

			// Add managed resources
			if (resourcesResponse.ok) {
				const resourcesData = await resourcesResponse.json();
				if (resourcesData.success && resourcesData.resources) {
					resourcesData.resources.forEach(
						(resource: {
							$id: string;
							name: string;
							location?: string;
							type: string;
						}) => {
							results.push({
								id: resource.$id,
								name: `${resource.name}${
									resource.type === "room" ? " (Room)" : " (Equipment)"
								}`,
								address: resource.location || "No location specified",
								type: "resource",
								resourceId: resource.$id,
							});
						},
					);
				}
			}

			setLocationResults(results);
		} catch (error) {
			console.error("Error searching locations:", error);
			setLocationResults([]);
		} finally {
			setIsSearchingLocation(false);
		}
	};

	// Function to add participant
	const addParticipant = (participant: ParticipantOption) => {
		if (!selectedParticipants.find((p) => p.$id === participant.$id)) {
			setSelectedParticipants([...selectedParticipants, participant]);
		}
		setParticipantSearch("");
		setSearchResults([]);
	};

	// Function to remove participant
	const removeParticipant = (userId: string) => {
		setSelectedParticipants(
			selectedParticipants.filter((p) => p.$id !== userId),
		);
	};

	// Function to handle cancel event creation
	const handleCancelEvent = () => {
		setIsAddEventOpen(false);
		setNewEvent({
			title: "",
			date: new Date(),
			endDate: new Date(),
			type: "meeting",
			description: "",
			startTime: "",
			endTime: "",
			contractName: "",
			participants: "",
			location: "",
			sensitivityLevel: "standard",
		});
		// Reset participant state
		setSelectedParticipants([]);
		setParticipantSearch("");
		setSearchResults([]);
		// Reset location state
		setLocationSearch("");
		setLocationResults([]);
		setSelectedResourceId(null);
	};

	// Initialize with smart placeholder times
	const initialDate = new Date();
	const initialEndDate = new Date();
	const initialSmartTimes = getSmartPlaceholderTimes(initialDate);

	const [newEvent, setNewEvent] = useState<NewEventForm>({
		title: "",
		date: initialDate,
		endDate: initialEndDate,
		type: "meeting",
		description: "",
		startTime: initialSmartTimes.startTime,
		endTime: initialSmartTimes.endTime,
		contractName: "",
		participants: "",
		location: "",
		attachments: [],
		sensitivityLevel: "standard",
	});

	// State for file uploads
	const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);

	// Handle file upload for event attachments
	const handleFileUpload = async (files: FileList | null) => {
		if (!files || files.length === 0) return;

		const filesToUpload: File[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const validation = validateEnterpriseFile(file, "attachment");
			if (!validation.ok) {
				toast({
					title: "Invalid file type",
					description: validation.reason,
					variant: "destructive",
				});
				continue;
			}

			if (file.size > 50 * 1024 * 1024) {
				toast({
					title: "File too large",
					description: `File "${file.name}" exceeds 50MB limit`,
					variant: "destructive",
				});
				continue;
			}

			filesToUpload.push(file);
		}

		if (filesToUpload.length === 0) return;

		setUploadingFiles(true);
		const uploadedAttachments: EventAttachment[] = [];

		try {
			for (const file of filesToUpload) {
				const formData = new FormData();
				formData.append("file", file);
				formData.append("userId", user?.$id || "");
				formData.append("uploadId", `event_${Date.now()}_${Math.random()}`);

				const response = await fetch("/api/files/upload", {
					method: "POST",
					body: formData,
				});

				const result = await response.json();

				if (!response.ok) {
					const errorMessage =
						result.error || result.details || `Failed to upload ${file.name}`;
					throw new Error(errorMessage);
				}

				if (result.data) {
					// Store the file ID reference (same as how contracts store fileId)
					// The file is already stored in the files collection with all metadata
					const { type, extension } = getFileType(result.data.name);
					uploadedAttachments.push({
						$id: result.data.$id, // This is the file document ID from files collection
						name: result.data.name,
						url: result.data.url,
						type: type,
						extension: extension,
						size: result.data.size,
						bucketFileId: result.data.bucketFileId,
					});
				}
			}

			setNewEvent((prev) => ({
				...prev,
				attachments: [...(prev.attachments || []), ...uploadedAttachments],
			}));

			toast({
				title: "Success",
				description: `${uploadedAttachments.length} file(s) uploaded successfully`,
			});
		} catch (error) {
			console.error("File upload error:", error);
			toast({
				title: "Upload failed",
				description:
					error instanceof Error ? error.message : "Failed to upload files",
				variant: "destructive",
			});
		} finally {
			setUploadingFiles(false);
		}
	};

	// Remove attachment
	const handleRemoveAttachment = (attachmentId: string) => {
		setNewEvent((prev) => ({
			...prev,
			attachments: (prev.attachments || []).filter(
				(att) => att.$id !== attachmentId,
			),
		}));
	};

	// Check if event type supports attachments
	const supportsAttachments = (eventType: string): boolean => {
		const type = eventType.toLowerCase();
		return [
			"meeting",
			"audit",
			"deadline discussion",
			"contract review",
			"internal review",
		].includes(type);
	};

	// Populate form when editing an event
	useEffect(() => {
		if (selectedEvent && isAddEventOpen) {
			const eventDate =
				selectedEvent.startDate instanceof Date
					? selectedEvent.startDate
					: new Date(selectedEvent.startDate);
			const endDate = selectedEvent.endDate
				? selectedEvent.endDate instanceof Date
					? selectedEvent.endDate
					: new Date(selectedEvent.endDate)
				: eventDate;

			setNewEvent({
				title: selectedEvent.title || "",
				date: eventDate,
				endDate: endDate,
				type: selectedEvent.type || "meeting",
				description: selectedEvent.description || "",
				startTime: selectedEvent.startTime || "",
				endTime: selectedEvent.endTime || "",
				contractName: selectedEvent.contractName || "",
				participants: selectedEvent.participants || "",
				location: selectedEvent.location || "",
				attachments: Array.isArray(selectedEvent.attachments)
					? selectedEvent.attachments
							.map((attachment) => {
								if (!attachment) return null;
								// If it's already an object, return it as-is
								if (typeof attachment !== "string") {
									// If it has all the required fields, return it
									if (attachment.name && attachment.size !== undefined) {
										return attachment;
									}
									// Otherwise, try to get details
									const detail = attachmentDetails[attachment.$id];
									if (detail) {
										// Merge detail with existing attachment (detail takes precedence)
										return { ...attachment, ...detail };
									}
									// If no details yet, return the attachment as-is (might be missing some fields)
									return attachment;
								}
								// If it's a string (file ID), look up the details
								const detail = attachmentDetails[attachment];
								if (detail?.$id) {
									// Return the detail even if some fields are missing
									// The display will handle showing "Unknown file" etc.
									return detail;
								}
								// If details not loaded yet, return the string ID as-is
								// The useEffect will re-run when attachmentDetails updates
								// For now, return a minimal object with just the ID
								return {
									$id: attachment,
								} as EventAttachment;
							})
							.filter(
								(attachment): attachment is EventAttachment =>
									attachment !== null && attachment.$id !== undefined,
							)
					: [],
				sensitivityLevel: selectedEvent.sensitivityLevel || "standard",
			});
		}
	}, [selectedEvent, isAddEventOpen, attachmentDetails]);

	// Fetch contracts when Contract Name becomes visible (when type is contract)
	useEffect(() => {
		const t = (newEvent.type as unknown as string)?.toLowerCase?.() || "";
		if (
			(t === "contract" || t === "contract review") &&
			contracts.length === 0
		) {
			fetchContracts();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newEvent.type, fetchContracts, contracts.length]);

	// Use proper data fetching hook with current month
	const { events: calendarEvents, forceRefresh } = useCalendarEvents({
		month: currentMonth,
		enableRealTime: true,
		pollingInterval: 10000,
	});

	// Assistant (and other) creates: optimistic SWR + this event for an immediate redraw
	useEffect(() => {
		const onCalendarUpdated = () => {
			void forceRefresh();
		};
		window.addEventListener("caalm:calendar-updated", onCalendarUpdated);
		return () => {
			window.removeEventListener("caalm:calendar-updated", onCalendarUpdated);
		};
	}, [forceRefresh]);

	const normalizedEvents = useMemo(() => {
		const combined = [...events, ...(calendarEvents || [])];
		return combined.map((event) => {
			const extended = event as LocalCalendarEvent & { resourceId?: string };
			return {
				...extended,
				resourceId: extended.resourceId,
				sensitivityLevel: extended.sensitivityLevel || "standard",
				approvalStatus: extended.approvalStatus || "not_required",
				requiresApproval: Boolean(extended.requiresApproval),
				pendingApprovalId:
					extended.pendingApprovalId !== undefined
						? extended.pendingApprovalId
						: null,
				overrides: extended.overrides || [],
				source: extended.source || (extended.resourceId ? "resource" : "my"),
			};
		});
	}, [events, calendarEvents]);

	// Filter events for default calendar (exclude events from shared calendars)
	const defaultCalendarEvents = useMemo(() => {
		if (!selectedMyCalendars.calendar) return [];

		// Get owner IDs of all shared calendars
		const sharedCalendarOwnerIds = new Set(
			sharedCalendars.map((cal) => cal.ownerId).filter(Boolean),
		);

		// Filter out events created by shared calendar owners
		return normalizedEvents.filter((event) => {
			if (!selectedMyCalendars.resources && event.resourceId) {
				return false;
			}
			// Include events created by current user
			if (
				event.createdByUserId === user?.$id ||
				event.createdByAccountId === user?.accountId
			) {
				return true;
			}
			// Include participant events (user is invited)
			if (event.participants) {
				const participantsStr = String(event.participants).toLowerCase();
				const userEmail = user?.email?.toLowerCase() || "";
				const userAccountId = user?.accountId?.toLowerCase() || "";
				if (
					participantsStr.includes(userEmail) ||
					participantsStr.includes(userAccountId) ||
					(user?.$id && participantsStr.includes(user.$id.toLowerCase()))
				) {
					return true;
				}
			}
			// Exclude events from shared calendar owners (these belong in shared calendar views)
			if (
				event.createdByUserId &&
				sharedCalendarOwnerIds.has(event.createdByUserId)
			) {
				return false;
			}
			// Include other events (fallback)
			return true;
		});
	}, [
		normalizedEvents,
		selectedMyCalendars.calendar,
		selectedMyCalendars.resources,
		sharedCalendars,
		user,
	]);

	// Helper to get events for a specific shared calendar
	const getSharedCalendarEvents = useCallback(
		(calendar: SharedCalendar): LocalCalendarEvent[] => {
			return normalizedEvents
				.filter((event) => {
					if (!selectedMyCalendars.resources && event.resourceId) {
						return false;
					}
					return (
						event.createdByUserId === calendar.ownerId ||
						event.createdByAccountId === calendar.ownerAccountId
					);
				})
				.map((event) => ({ ...event, source: "shared" as CalendarSource }));
		},
		[normalizedEvents, selectedMyCalendars.resources],
	);

	// US holidays are computed locally (date-holidays) — no Microsoft sync, no API cache
	const usHolidaysEvents = useMemo((): LocalCalendarEvent[] => {
		if (!selectedMyCalendars.usHolidays) return [];

		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth() + 1;

		return getUSHolidaysForMonth(year, month).map((holiday) => {
			const holidayDate = parseHolidayDate(holiday.date);
			return {
				$id: `holiday-${holiday.date}`,
				id: `holiday-${holiday.date}`,
				title: holiday.name,
				startDate: holidayDate,
				endDate: holidayDate,
				type: "meeting" as const,
				startTime: undefined,
				endTime: undefined,
				sensitivityLevel: "standard" as const,
				approvalStatus: "not_required" as const,
				requiresApproval: false,
				pendingApprovalId: null,
				overrides: [],
				source: "holidays" as CalendarSource,
			};
		});
	}, [currentMonth, selectedMyCalendars.usHolidays]);

	// Prefer Agenda on narrow screens (once on mount)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const mq = window.matchMedia("(max-width: 1023px)");
		if (mq.matches) {
			setViewMode("agenda");
		}
	}, []);

	// Handlers for calendar selection
	const handleMyCalendarChange = (
		calendar: "calendar" | "usHolidays" | "resources",
		checked: boolean,
	) => {
		setSelectedMyCalendars((prev) => {
			if (calendar === "resources") {
				return { ...prev, resources: checked };
			}

			// Count how many calendars are currently checked (before this change)
			const currentCheckedCount =
				(prev.calendar ? 1 : 0) +
				(prev.usHolidays ? 1 : 0) +
				selectedSharedCalendars.length;

			// If trying to uncheck Calendar and it's the only checked calendar, prevent it
			if (calendar === "calendar" && !checked && currentCheckedCount === 1) {
				return prev; // Don't allow unchecking Calendar if it's the last one
			}

			const newState = {
				...prev,
				[calendar]: checked,
			};

			// Count how many calendars will be checked after this change
			const newCheckedCount =
				(newState.calendar ? 1 : 0) +
				(newState.usHolidays ? 1 : 0) +
				selectedSharedCalendars.length;

			// If no calendars will be checked, ensure Calendar is checked by default
			if (newCheckedCount === 0) {
				return {
					...newState,
					calendar: true,
				};
			}

			return newState;
		});
	};

	const handleSharedCalendarChange = (calendarId: string, checked: boolean) => {
		setSelectedSharedCalendars((prev) => {
			const newSharedCalendars = checked
				? [...prev, calendarId]
				: prev.filter((id) => id !== calendarId);

			// Count how many calendars will be checked after this change
			const checkedCount =
				(selectedMyCalendars.calendar ? 1 : 0) +
				(selectedMyCalendars.usHolidays ? 1 : 0) +
				newSharedCalendars.length;

			// If no calendars will be checked, ensure Calendar is checked by default
			if (checkedCount === 0) {
				setSelectedMyCalendars((prevMy) => ({
					...prevMy,
					calendar: true,
				}));
			}

			return newSharedCalendars;
		});
	};

	const handleCloseCalendar = (
		calendarType: "calendar" | "usHolidays" | string,
	) => {
		if (calendarType === "calendar" || calendarType === "usHolidays") {
			// Use handleMyCalendarChange which already has the logic to prevent unchecking Calendar if it's the last one
			handleMyCalendarChange(calendarType, false);
		} else {
			// It's a shared calendar ID
			// Use handleSharedCalendarChange which already has the logic to ensure Calendar is checked if all become unchecked
			handleSharedCalendarChange(calendarType, false);
		}
	};

	// Debug logging
	console.log("Calendar events from hook:", calendarEvents);
	console.log("All events (normalized):", normalizedEvents);
	console.log("Current month:", currentMonth);
	console.log(
		"API key should be:",
		`/api/calendar/events?year=${currentMonth.getFullYear()}&month=${
			currentMonth.getMonth() + 1
		}`,
	);

	// Use optimized SWR hook for shared calendars
	const {
		calendars: swrCalendars,
		isLoading: swrLoading,
		refresh: refreshSharedCalendars,
	} = useSharedCalendars();

	// Update shared calendars state from SWR
	useEffect(() => {
		if (swrCalendars.length > 0) {
			setSharedCalendars(swrCalendars);
			setLoadingSharedCalendars(swrLoading);

			// Fetch owner names (cached by SWR hook)
			const ownerIds = swrCalendars
				.map((cal: SharedCalendar) => cal.ownerId)
				.filter((id: string) => id);
			if (ownerIds.length > 0) {
				fetchUserNamesByIds(ownerIds).then((ownerNames) => {
					const namesMap: Record<string, string> = {};
					ownerNames.forEach((user) => {
						swrCalendars.forEach((cal: SharedCalendar) => {
							if (cal.ownerId === user.$id) {
								namesMap[cal.$id] = user.fullName || "Unknown";
							}
						});
					});
					setSharedCalendarOwnerNames(namesMap);
				});
			}
		} else if (!swrLoading) {
			setSharedCalendars([]);
			setLoadingSharedCalendars(false);
		}
	}, [swrCalendars, swrLoading]);

	// Calculate calendar width based on container and number of calendars
	useEffect(() => {
		const calculateWidth = () => {
			const visibleCalendarsCount =
				(selectedMyCalendars.calendar ? 1 : 0) +
				(selectedMyCalendars.usHolidays ? 1 : 0) +
				selectedSharedCalendars.length;

			if (visibleCalendarsCount === 1) {
				setCalendarWidth("100%");
			} else if (calendarContainerRef.current && visibleCalendarsCount > 1) {
				// When multiple calendars, use the container's width as fixed width for each
				// This ensures each calendar is the same size as when only one is displayed
				const containerWidth = calendarContainerRef.current.offsetWidth;
				if (containerWidth > 0) {
					// Account for padding (32px total: 16px on each side)
					// Each calendar should be the full container width minus padding
					const singleCalendarWidth = containerWidth - 32;
					setCalendarWidth(`${singleCalendarWidth}px`);
				} else {
					// If container width is 0, retry after a short delay
					setTimeout(calculateWidth, 100);
				}
			}
		};

		// Use setTimeout to ensure DOM is fully rendered
		const timeoutId = setTimeout(() => {
			calculateWidth();
		}, 0);

		window.addEventListener("resize", calculateWidth);
		return () => {
			clearTimeout(timeoutId);
			window.removeEventListener("resize", calculateWidth);
		};
	}, [
		selectedMyCalendars.calendar,
		selectedMyCalendars.usHolidays,
		selectedSharedCalendars.length,
	]);

	// Check Outlook connection status
	useEffect(() => {
		const checkOutlookConnection = async () => {
			if (user?.$id) {
				try {
					const connected = await hasMicrosoftCalendarIntegration(user.$id);
					setOutlookConnected(connected);
				} catch (error) {
					console.error("Error checking Outlook connection:", error);
				}
			}
		};

		checkOutlookConnection();
	}, [user]);

	// Add this useEffect to fetch participant names
	useEffect(() => {
		if (selectedEvent?.participants && selectedEvent.participants.length > 0) {
			setLoadingNames(true);
			// Handle both string and array formats
			const participantIds = Array.isArray(selectedEvent.participants)
				? selectedEvent.participants
				: selectedEvent.participants
						.split(",")
						.map((id: string) => id.trim())
						.filter((id: string) => id.length > 0);

			fetchUserNamesByIds(participantIds)
				.then((users) => {
					setParticipantNames(users.map((user) => user.fullName));
					setLoadingNames(false);
				})
				.catch((error) => {
					console.error("Failed to fetch participant names:", error);
					setParticipantNames([]);
					setLoadingNames(false);
				});
		} else {
			setParticipantNames([]);
			setLoadingNames(false);
		}
	}, [selectedEvent?.participants]); // Re-run when participants change

	// Fetch attachment details when selectedEvent changes
	useEffect(() => {
		const fetchAttachmentDetails = async () => {
			if (selectedEvent?.attachments && selectedEvent.attachments.length > 0) {
				const fileIds = selectedEvent.attachments.map((att) =>
					typeof att === "string" ? att : att.$id,
				);

				if (fileIds.length === 0) {
					setAttachmentDetails({});
					return;
				}

				try {
					const response = await fetch("/api/files/get-by-ids", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ fileIds }),
					});

					if (response.ok) {
						const files = await response.json();
						console.log(
							"[OutlookStyleCalendar] Fetched files from API:",
							files,
						);
						const detailsMap: Record<string, EventAttachment> = {};
						files.forEach((file: any) => {
							// Only store files that have at least an $id
							if (file?.$id) {
								// Preserve actual values from API
								// Only convert null to undefined if the value is truly missing
								// Don't use defaults here - let the display layer handle missing values
								const attachment: EventAttachment = {
									$id: file.$id,
									// Only set name if it exists and is not null/empty
									name:
										file.name != null &&
										file.name !== "" &&
										file.name !== null &&
										file.name !== "null"
											? String(file.name).trim() || undefined
											: undefined,
									// Only set url if it exists and is not null/empty
									url:
										file.url != null && file.url !== "" && file.url !== null
											? String(file.url).trim() || undefined
											: undefined,
									// Only set type if it exists and is not null/empty
									type:
										file.type != null && file.type !== "" && file.type !== null
											? String(file.type).trim() || undefined
											: undefined,
									// Only set extension if it exists and is not null/empty
									extension:
										file.extension != null &&
										file.extension !== "" &&
										file.extension !== null
											? String(file.extension).trim() || undefined
											: undefined,
									// Only set size if it's a valid number
									size: (() => {
										// Check if size is null, undefined, empty string, or the string "null"
										if (
											file.size == null ||
											file.size === "" ||
											file.size === null ||
											file.size === "null"
										) {
											return undefined;
										}
										const sizeNum = Number(file.size);
										// Only return a number if it's valid and non-negative
										if (Number.isNaN(sizeNum) || sizeNum < 0) {
											return undefined;
										}
										return sizeNum;
									})(),
									// Only set bucketFileId if it exists and is not null/empty
									bucketFileId:
										file.bucketFileId != null &&
										file.bucketFileId !== "" &&
										file.bucketFileId !== null
											? String(file.bucketFileId).trim() || undefined
											: undefined,
								};

								console.log(
									"[OutlookStyleCalendar] Created attachment object:",
									{
										$id: attachment.$id,
										name: attachment.name,
										nameFromAPI: file.name,
										size: attachment.size,
										sizeFromAPI: file.size,
										sizeTypeFromAPI: typeof file.size,
										extension: attachment.extension,
										extensionFromAPI: file.extension,
										url: attachment.url,
										urlFromAPI: file.url,
										hasName: !!attachment.name,
										hasSize: attachment.size !== undefined,
										allFileKeys: Object.keys(file),
									},
								);

								// Only store if we have at least an $id
								if (attachment.$id) {
									detailsMap[file.$id] = attachment;
								}
							}
						});
						console.log(
							"[OutlookStyleCalendar] Final attachment details map:",
							detailsMap,
						);
						setAttachmentDetails(detailsMap);
					} else {
						// Try to get the actual error message from the response
						let errorMessage = response.statusText;
						try {
							const errorData = await response.json();
							errorMessage =
								errorData.error || errorData.message || response.statusText;
							console.error("Failed to fetch attachment details:", {
								status: response.status,
								statusText: response.statusText,
								error: errorMessage,
								details: errorData.details,
							});
						} catch (parseError) {
							console.error("Failed to fetch attachment details:", {
								status: response.status,
								statusText: response.statusText,
								parseError,
							});
						}
						setAttachmentDetails({});
					}
				} catch (error) {
					console.error("Error fetching attachment details:", error);
					setAttachmentDetails({});
				}
			} else {
				setAttachmentDetails({});
			}
		};

		fetchAttachmentDetails();
	}, [selectedEvent?.attachments]);

	const handleSync = async () => {
		if (!user?.$id) return;

		try {
			setSyncing(true);
			const result = await syncMicrosoftCalendar(user.$id);

			if (result.success) {
				// Force refresh immediately to show synced events
				await forceRefresh();

				toast({
					title: "Success",
					description: result.message,
				});
			} else {
				toast({
					title: "Sync Failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Sync error:", error);
			toast({
				title: "Sync Error",
				description: "Failed to sync calendar",
				variant: "destructive",
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			if (date < today) {
				toast({
					title: "Error",
					description: "Cannot select dates in the past",
					variant: "destructive",
				});
				return;
			}
		}

		setSelectedDate(date);
		onDateSelect?.(date!);

		if (date && isAddEventOpen) {
			setNewEvent((prev) => ({
				...prev,
				date: date,
			}));
		}
	};

	const openQuickCreate = (date: Date, hour?: number) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const check = new Date(date);
		check.setHours(0, 0, 0, 0);
		if (check < today) {
			toast({
				title: "Error",
				description: "Cannot create events in the past",
				variant: "destructive",
			});
			return;
		}
		if (!canCreateEvent) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to create events.",
				variant: "destructive",
			});
			return;
		}
		setSelectedDate(date);
		setQuickCreateDate(date);
		setQuickCreateHour(hour ?? null);
		setIsQuickCreateOpen(true);
	};

	const applyQuickCreateToForm = (payload: QuickCreatePayload) => {
		setSelectedEvent(null);
		setNewEvent((prev) => ({
			...prev,
			title: payload.title,
			date: payload.date,
			endDate: payload.date,
			startTime: payload.startTime,
			endTime: payload.endTime,
			type: payload.type,
		}));
	};

	const handleQuickCreate = async (payload: QuickCreatePayload) => {
		if (!payload.title.trim()) {
			toast({
				title: "Error",
				description: "Event title is required",
				variant: "destructive",
			});
			return;
		}
		applyQuickCreateToForm(payload);
		setIsQuickCreateOpen(false);
		// Prefill + open create dialog so existing validation/API path runs
		setIsAddEventOpen(true);
	};

	const handleQuickCreateMoreOptions = (payload: QuickCreatePayload) => {
		applyQuickCreateToForm(payload);
		setIsQuickCreateOpen(false);
		setIsAddEventOpen(true);
	};

	const handleCreateEvent = async () => {
		if (!newEvent.title.trim()) {
			toast({
				title: "Error",
				description: "Event title is required",
				variant: "destructive",
			});
			return;
		}

		if (!canCreateEvent) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to create events.",
				variant: "destructive",
			});
			return;
		}

		// Validate that event is not in the past
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const eventDate = new Date(
			newEvent.date.getFullYear(),
			newEvent.date.getMonth(),
			newEvent.date.getDate(),
		);

		// Check if the date is in the past
		if (eventDate < today) {
			toast({
				title: "Invalid Date",
				description:
					"Cannot create events in the past. Please select a current or future date.",
				variant: "destructive",
			});
			return;
		}

		// If date is today, check if the time is in the past
		if (eventDate.getTime() === today.getTime() && newEvent.startTime) {
			const [hours, minutes] = newEvent.startTime.includes(":")
				? newEvent.startTime.split(":").map(Number)
				: [0, 0];

			// Handle 12-hour format (e.g., "2:00 PM")
			let hour24 = hours;
			if (newEvent.startTime.includes("PM") && hours !== 12) {
				hour24 = hours + 12;
			} else if (newEvent.startTime.includes("AM") && hours === 12) {
				hour24 = 0;
			}

			const eventDateTime = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
				hour24,
				minutes,
			);

			if (eventDateTime < now) {
				toast({
					title: "Invalid Time",
					description:
						"Cannot create events in the past. Please select a current or future time.",
					variant: "destructive",
				});
				return;
			}
		}

		setCreatingEvent(true);
		try {
			// Create date string in YYYY-MM-DD format to avoid timezone issues
			const year = newEvent.date.getFullYear();
			const month = String(newEvent.date.getMonth() + 1).padStart(2, "0");
			const day = String(newEvent.date.getDate()).padStart(2, "0");
			const dateString = `${year}-${month}-${day}`;

			// Create end date string in YYYY-MM-DD format to avoid timezone issues
			const endYear = newEvent.endDate.getFullYear();
			const endMonth = String(newEvent.endDate.getMonth() + 1).padStart(2, "0");
			const endDay = String(newEvent.endDate.getDate()).padStart(2, "0");
			const endDateString = `${endYear}-${endMonth}-${endDay}`;

			// Store only file IDs (same pattern as contracts use fileId)
			// Files are already stored in the files collection via /api/files/upload
			const attachmentFileIds = (newEvent.attachments || []).map(
				(att) => att.$id,
			);

			const eventData = {
				title: newEvent.title,
				startDate: dateString,
				endDate: endDateString,
				type: newEvent.type,
				description: newEvent.description,
				startTime: newEvent.startTime,
				endTime: newEvent.endTime,
				contractName: newEvent.contractName,
				participants: selectedParticipants
					.map((p) => `${p.fullName || p.name} <${p.email}>`)
					.join(", "),
				location: newEvent.location || undefined,
				resourceId: selectedResourceId || undefined, // Priority 2: Resource booking
				createdBy: accountId || user?.$id || "user",
				createdByAccountId: accountId || user?.$id || "user",
				createdByUserId: userId,
				attachments: attachmentFileIds, // Store array of file IDs (references to files collection)
				sensitivityLevel: newEvent.sensitivityLevel,
				requiresApproval: newEvent.sensitivityLevel !== "standard",
			};

			console.log("Creating event with data:", {
				...eventData,
				originalDate: newEvent.date.toISOString(),
				originalDateLocal: newEvent.date.toLocaleDateString(),
				dateStringCreated: dateString,
				startTime: eventData.startTime,
				endTime: eventData.endTime,
			});
			console.log("Date details:", {
				year,
				month,
				day,
				dateString,
				endYear,
				endMonth,
				endDay,
				endDateString,
			});

			const response = await fetch("/api/calendar/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			});

			if (!response.ok) {
				let errorData: {
					message?: string;
					reason?: string;
					conflicts?: any[];
					alternateSlots?: any[];
					requiresConfirmation?: boolean;
					error?:
						| string
						| {
								details?: string;
								message?: string;
								code?: string;
								type?: string;
						  };
				} = {};
				try {
					errorData = await response.json();
				} catch (_parseError) {
					// If response isn't JSON, use status text
					errorData = { message: response.statusText || "Unknown error" };
				}

				// Handle conflict detection (409 status)
				if (
					response.status === 409 &&
					errorData.requiresConfirmation &&
					errorData.conflicts
				) {
					// Store conflict data and show dialog
					setConflictData({
						conflicts: errorData.conflicts || [],
						alternateSlots: errorData.alternateSlots || [],
						pendingEventData: eventData,
					});
					setIsConflictDialogOpen(true);
					setCreatingEvent(false);
					return; // Don't throw error, user will confirm in dialog
				}

				// Extract error message from response
				const errorObj =
					errorData?.error &&
					typeof errorData.error === "object" &&
					!Array.isArray(errorData.error)
						? errorData.error
						: null;
				const errorMessage =
					errorData?.message ||
					(errorObj && "details" in errorObj ? errorObj.details : null) ||
					(errorObj && "message" in errorObj ? errorObj.message : null) ||
					errorData?.reason ||
					(typeof errorData?.error === "string" ? errorData.error : null) ||
					response.statusText ||
					"Failed to create event";

				console.error("Failed to create event:", {
					status: response.status,
					statusText: response.statusText,
					errorData,
					errorMessage,
					errorCode: errorObj && "code" in errorObj ? errorObj.code : undefined,
					errorType: errorObj && "type" in errorObj ? errorObj.type : undefined,
				});

				// Provide clearer error messages based on status code
				let _userFriendlyMessage = errorMessage;
				if (response.status === 404) {
					_userFriendlyMessage =
						"API route not found. Please restart the development server.";
				} else if (response.status === 403) {
					_userFriendlyMessage = errorMessage || "Permission denied";
				} else if (response.status === 401) {
					_userFriendlyMessage =
						"Authentication required. Please sign in again.";
				} else if (response.status === 500) {
					_userFriendlyMessage =
						errorMessage ||
						"Server error. Please try again or contact support.";
				}

				throw new Error(errorMessage);
			}

			const result = await response.json();
			console.log("Event created successfully:", result);

			toast({
				title: "Success",
				description: "Event created successfully",
			});

			setIsAddEventOpen(false);
			setNewEvent({
				title: "",
				date: new Date(),
				endDate: new Date(),
				type: "meeting",
				description: "",
				startTime: "",
				endTime: "",
				contractName: "",
				participants: "",
				location: "",
				attachments: [],
				sensitivityLevel: "standard",
			});
			// Reset participant state
			setSelectedParticipants([]);
			setParticipantSearch("");
			setSearchResults([]);

			// Force refresh of calendar events to ensure UI is updated
			await forceRefresh();
			console.log("Calendar events refreshed after creation");

			// If an approval was created, refresh the approvals list immediately
			if (result.approval && isApprover) {
				console.log("Approval created, refreshing approvals list...");
				// Use both local refresh and SWR global mutate for immediate update
				await refreshApprovals();
				// Also trigger global refresh for other components using the same hook
				const { mutate } = await import("swr");
				mutate(["/api/approvals", "pending"]);
				console.log("Approvals list refreshed");
			}

			// Auto-sync with Outlook if connected
			if (outlookConnected && user?.$id) {
				console.log("Auto-syncing with Outlook after event creation...");
				try {
					await syncMicrosoftCalendar(user.$id);
					console.log("Auto-sync completed");
				} catch (syncError) {
					console.warn("Auto-sync failed:", syncError);
					// Don't show error to user as the main event was created successfully
				}
			}
		} catch (error) {
			console.error("Error creating event:", {
				error,
				message: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
			});
			console.error("Error details:", {
				message: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
				eventData: {
					title: newEvent.title,
					date: newEvent.date.toISOString(),
					type: newEvent.type,
					description: newEvent.description,
					startTime: newEvent.startTime,
					endTime: newEvent.endTime,
					contractName: newEvent.contractName,
					participants: newEvent.participants,
					createdBy: user?.$id || "user",
				},
				user: user,
			});
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			toast({
				title:
					errorMessage === "Permission denied" ? "Permission Denied" : "Error",
				description:
					errorMessage === "Permission denied"
						? "You do not have permission to create calendar events. Please contact your administrator."
						: `Failed to create event: ${errorMessage}`,
				variant: "destructive",
			});
		} finally {
			setCreatingEvent(false);
		}
	};

	// Update handler when using the Create/Update dialog in update mode
	const handleUpdateEventFromDialog = async () => {
		if (!selectedEvent?.$id) return;

		// Check if user has permission to update this event
		if (!canCreateEvent || !selectedEventPermissions?.updateEvent) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to update this event.",
				variant: "destructive",
			});
			return;
		}

		setCreatingEvent(true);
		try {
			const normalizeType = (
				t: string,
			): "contract" | "deadline" | "meeting" | "review" | "audit" => {
				const v = (t || "").toLowerCase().trim();
				if (v === "contract review" || v === "contract") return "contract";
				if (v === "deadline discussion" || v === "deadline") return "deadline";
				if (v === "internal review" || v === "review") return "review";
				if (v === "meeting") return "meeting";
				return "audit";
			};

			// Create date string in YYYY-MM-DD format to avoid timezone issues
			const eventDate = newEvent.date || new Date();
			const year = eventDate.getFullYear();
			const month = String(eventDate.getMonth() + 1).padStart(2, "0");
			const day = String(eventDate.getDate()).padStart(2, "0");
			const dateString = `${year}-${month}-${day}`;
			const endEventDate = newEvent.endDate || eventDate;
			const endYear = endEventDate.getFullYear();
			const endMonth = String(endEventDate.getMonth() + 1).padStart(2, "0");
			const endDay = String(endEventDate.getDate()).padStart(2, "0");
			const endDateString = `${endYear}-${endMonth}-${endDay}`;

			const eventData = {
				title: newEvent.title,
				startDate: dateString,
				endDate: endDateString,
				type: normalizeType(newEvent.type as unknown as string),
				description: newEvent.description || "",
				startTime: newEvent.startTime || "",
				endTime: newEvent.endTime || "",
				contractName: newEvent.contractName || "",
				participants:
					selectedParticipants.length > 0
						? selectedParticipants
								.map((p) => `${p.fullName || p.name} <${p.email}>`)
								.join(", ")
						: "",
				location: newEvent.location || undefined,
				attachments: (newEvent.attachments || []).map((att) => att.$id), // Store only file IDs
				sensitivityLevel: newEvent.sensitivityLevel,
				requiresApproval: newEvent.sensitivityLevel !== "standard",
			};

			// Use API route instead of direct function call to ensure proper handling
			const response = await fetch(
				`/api/calendar/events?id=${selectedEvent.$id}`,
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(eventData),
				},
			);

			if (!response.ok) {
				let errorData: {
					message?: string;
					reason?: string;
					error?: string;
					requiredApproval?: boolean;
				} = {};
				try {
					errorData = await response.json();
				} catch (_parseError) {
					errorData = { message: response.statusText || "Unknown error" };
				}

				// Handle pending approval error gracefully
				if (errorData.reason === "pending_approval") {
					toast({
						title: "Cannot update event",
						description:
							errorData.message ||
							"Events with pending approval status cannot be updated. Please wait for the approval decision before making changes.",
						variant: "default",
					});
					return;
				}

				// Handle other permission errors
				if (errorData.reason === "permission_denied") {
					toast({
						title: "Permission denied",
						description:
							errorData.message ||
							"You do not have permission to update this event.",
						variant: "destructive",
					});
					return;
				}

				// Handle other errors
				const errorMessage =
					errorData.message ||
					errorData.reason ||
					errorData.error ||
					"Failed to update event";
				toast({
					title: "Error",
					description: errorMessage,
					variant: "destructive",
				});
				return;
			}

			const result = await response.json();
			console.log("Event updated successfully:", result);

			// Check if the update created a new approval request
			if (result.requiresApproval || result.pendingApprovalId) {
				toast({
					title: "Update submitted for approval",
					description:
						result.message ||
						"Your event update has been submitted and is pending approval.",
					variant: "default",
				});
			} else {
				toast({
					title: "Success",
					description: "Event updated successfully",
				});
			}

			setIsAddEventOpen(false);
			setSelectedEvent(null);
			await forceRefresh();

			// If an approval was created or updated, refresh the approvals list immediately
			// This ensures resubmissions after changes_requested show updated changes
			if (result.approval && isApprover) {
				console.log(
					"Approval involved in update, refreshing approvals list...",
				);
				// Use both local refresh and SWR global mutate for immediate update
				await refreshApprovals();
				// Also trigger global refresh for other components using the same hook
				const { mutate } = await import("swr");
				mutate(["/api/approvals", "pending"]);
				console.log("Approvals list refreshed");
			}
		} catch (error) {
			// Error handling is already done in the response.ok check above
			// This catch block handles unexpected errors (network errors, etc.)
			console.error("Error updating event from dialog:", error);

			// Only show error if it wasn't already handled above
			// (The error handling above returns early, so this should rarely execute)
			if (
				error instanceof Error &&
				!error.message.includes("pending_approval") &&
				!error.message.includes("permission_denied")
			) {
				toast({
					title: "Error",
					description:
						error.message || "Failed to update event. Please try again.",
					variant: "destructive",
				});
			}
		} finally {
			setCreatingEvent(false);
		}
	};

	// Handle conflict confirmation
	const handleConfirmConflict = async () => {
		if (!conflictData) return;

		setCreatingEvent(true);
		setIsConflictDialogOpen(false);

		try {
			// Retry creation with forceCreate flag
			const eventDataWithForce = {
				...conflictData.pendingEventData,
				forceCreate: true,
			};

			const response = await fetch("/api/calendar/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventDataWithForce),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to create event");
			}

			const result = await response.json();
			console.log(
				"Event created successfully after conflict confirmation:",
				result,
			);

			toast({
				title: "Success",
				description: "Event created successfully despite conflicts",
			});

			setIsAddEventOpen(false);
			setNewEvent({
				title: "",
				date: new Date(),
				endDate: new Date(),
				type: "meeting",
				description: "",
				startTime: "",
				endTime: "",
				contractName: "",
				participants: "",
				location: "",
				attachments: [],
				sensitivityLevel: "standard",
			});
			setSelectedParticipants([]);
			setParticipantSearch("");
			setSearchResults([]);
			setConflictData(null);

			await forceRefresh();
		} catch (error) {
			console.error("Error creating event after conflict confirmation:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to create event",
				variant: "destructive",
			});
		} finally {
			setCreatingEvent(false);
		}
	};

	const handleCancelConflict = () => {
		setIsConflictDialogOpen(false);
		setConflictData(null);
		setCreatingEvent(false);
	};

	const handleDeleteEvent = () => {
		if (!selectedEvent || (!selectedEvent.$id && !selectedEvent.id)) {
			return;
		}

		// Creating is required to edit/delete; cancelEvent gates delete for the role
		const hasCancelPermission = selectedEventPermissions?.cancelEvent ?? false;

		if (!canCreateEvent || !hasCancelPermission) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to cancel this event.",
				variant: "destructive",
			});
			return;
		}

		setIsDeleteModalOpen(true);
	};

	const handleEditSelectedEvent = () => {
		if (!selectedEvent) return;
		// Pre-fill edit form
		setNewEvent({
			title: selectedEvent.title || "",
			date: new Date(selectedEvent.startDate),
			endDate: new Date(selectedEvent.endDate || selectedEvent.startDate), // Use endDate if available, otherwise startDate
			type: selectedEvent.type || "meeting",
			description: selectedEvent.description || "",
			startTime: selectedEvent.startTime || "",
			endTime: selectedEvent.endTime || "",
			contractName: selectedEvent.contractName || "",
			participants: selectedEvent.participants || "",
			location: selectedEvent.location || "",
			sensitivityLevel: selectedEvent.sensitivityLevel || "standard",
		});
		setLocationSearch(selectedEvent.location || "");

		// Parse participants string to populate selectedParticipants
		if (
			selectedEvent.participants &&
			typeof selectedEvent.participants === "string"
		) {
			const participantStrings = selectedEvent.participants.split(", ");
			const parsedParticipants = participantStrings.map((p) => {
				// Parse "Name <email>" format
				const match = p.match(/^(.+?) <(.+?)>$/);
				if (match) {
					return {
						$id: match[2], // Use email as ID for now
						fullName: match[1],
						name: match[1],
						email: match[2],
					};
				}
				// Fallback for old format (just user ID)
				return {
					$id: p,
					fullName: p,
					name: p,
					email: p,
				};
			});
			setSelectedParticipants(parsedParticipants);
		} else {
			setSelectedParticipants([]);
		}

		setIsEditEventOpen(false);
		setIsAddEventOpen(true);
	};

	const confirmDeleteEvent = async () => {
		if (!selectedEvent || (!selectedEvent.$id && !selectedEvent.id)) {
			return;
		}

		if (
			!canCreateEvent ||
			(selectedEventPermissions && !selectedEventPermissions.cancelEvent)
		) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to cancel this event.",
				variant: "destructive",
			});
			setIsDeleteModalOpen(false);
			return;
		}

		// Use $id if available (from database), otherwise use id (from converted event)
		const eventId = selectedEvent.$id || selectedEvent.id;

		try {
			const response = await fetch(
				`/api/calendar/events?id=${eventId}${
					deleteReason ? `&reason=${encodeURIComponent(deleteReason)}` : ""
				}`,
				{
					method: "DELETE",
				},
			);

			console.log("Delete response status:", response.status);
			console.log("Delete response ok:", response.ok);

			if (!response.ok) {
				const errorData = await response.json();
				console.log("Delete error data:", errorData);

				// Handle different error cases with appropriate messages
				if (
					response.status === 409 &&
					errorData.reason === "pending_approval"
				) {
					// Event requires approval - cancellation request was created
					if (errorData.requiredApproval) {
						toast({
							title: "Cancellation pending approval",
							description:
								"Your cancellation request has been submitted and is pending approval.",
							variant: "default",
						});
						// Close dialogs and refresh
						setIsEditEventOpen(false);
						setIsDeleteModalOpen(false);
						setSelectedEvent(null);
						setDeleteReason("");
						await forceRefresh();
						return;
					}
				}

				throw new Error(errorData.message || "Failed to delete event");
			}

			const result = await response.json();
			console.log("Delete success result:", result);

			// Close dialogs and clear state IMMEDIATELY to prevent errors
			setIsEditEventOpen(false);
			setIsDeleteModalOpen(false);
			setSelectedEvent(null);
			setDeleteReason("");

			// Immediately force refresh to update the UI
			await forceRefresh();

			// Show appropriate success message
			if (result.requiresApproval || result.approvalId) {
				toast({
					title: "Cancellation request submitted",
					description:
						result.message || "Your cancellation request is pending approval.",
					variant: "default",
				});
			} else {
				toast({
					title: "Success",
					description: "Event deleted successfully",
				});
			}
		} catch (error) {
			console.error("Error deleting event:", error);

			// Close dialogs even on error to prevent UI issues
			setIsEditEventOpen(false);
			setIsDeleteModalOpen(false);
			setSelectedEvent(null);
			setDeleteReason("");

			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to delete event",
				variant: "destructive",
			});
		}
	};

	const cancelDelete = () => {
		setIsDeleteModalOpen(false);
		setDeleteReason("");
	};

	const openEditDialog = (event: LocalCalendarEvent) => {
		setSelectedEvent(event);
		setIsEditEventOpen(true);
	};

	const handleApprovalDecision = async (
		decision: "approved" | "rejected" | "changes_requested",
	) => {
		if (!selectedApproval) return;

		setIsProcessingApproval(true);

		try {
			const response = await fetch("/api/approvals", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					approvalId: selectedApproval.$id,
					action: decision,
					reviewerNotes: reviewerNotes.trim() || undefined,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to process approval");
			}

			const _result = await response.json();

			// Show success toast
			const decisionLabels: Record<string, string> = {
				approved: "Approved",
				rejected: "Denied",
				changes_requested: "Changes Requested",
			};

			toast({
				title: `Request ${decisionLabels[decision]}`,
				description: `The approval request has been ${decisionLabels[
					decision
				].toLowerCase()}.`,
				variant: "default",
			});

			// Refresh approvals list and calendar events immediately
			if (refreshApprovals) {
				await refreshApprovals();
			}
			// Also trigger global refresh for other components using the same hook
			const { mutate } = await import("swr");
			mutate(["/api/approvals", "pending"]);
			await forceRefresh();

			// Close dialog and reset state
			setIsApprovalDialogOpen(false);
			setSelectedApproval(null);
			setReviewerNotes("");
		} catch (error) {
			console.error("Error processing approval:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to process approval request",
				variant: "destructive",
			});
		} finally {
			setIsProcessingApproval(false);
		}
	};

	const handleShare = async () => {
		if (
			selectedEventPermissions &&
			!selectedEventPermissions.manageParticipants
		) {
			toast({
				title: "Permission denied",
				description: "You do not have permission to manage participants.",
				variant: "destructive",
			});
			return;
		}

		try {
			// Generate shareable link
			const shareLink = `${window.location.origin}/calendar?shared=true&id=${selectedEvent?.$id}`;

			if (navigator.share) {
				await navigator.share({
					title: selectedEvent?.title || "Calendar Event",
					text: selectedEvent?.description || "",
					url: shareLink,
				});
			} else {
				// Fallback: copy to clipboard
				await navigator.clipboard.writeText(shareLink);
				toast({
					title: "Link Copied",
					description: "Shareable link copied to clipboard",
				});
			}

			setIsShareOpen(false);
		} catch {
			toast({
				title: "Error",
				description: "Failed to share event",
				variant: "destructive",
			});
		}
	};

	const renderMonthView = (
		eventsToRender: LocalCalendarEvent[] = normalizedEvents,
	) => {
		return (
			<MonthView
				currentMonth={currentMonth}
				selectedDate={selectedDate}
				events={eventsToRender}
				canViewEventSensitiveDetails={canViewEventSensitiveDetails}
				onSelectDay={(day) => {
					handleDateSelect(day);
					openQuickCreate(day);
				}}
				onEventClick={openEditDialog}
				onOverflow={(day, dayEvents) => {
					setOverflowDate(day);
					setOverflowEvents(dayEvents);
					setIsOverflowOpen(true);
				}}
			/>
		);
	};

	// Overflow dialog listing all events for a selected day
	const overflowDialog = (
		<OverflowDialog
			open={isOverflowOpen}
			onOpenChange={setIsOverflowOpen}
			overflowDate={overflowDate}
			overflowEvents={overflowEvents}
			canViewEventSensitiveDetails={canViewEventSensitiveDetails}
			onSelectEvent={openEditDialog}
		/>
	);

	const renderWeekView = (
		eventsToRender: LocalCalendarEvent[] = normalizedEvents,
	) => {
		return (
			<TimeGridWeekView
				selectedDate={selectedDate || new Date()}
				events={eventsToRender}
				canViewSensitive={(e) =>
					canViewEventSensitiveDetails(e as LocalCalendarEvent)
				}
				formatTime={formatTimeForDisplay}
				parseTimeToMinutes={parseTimeToMinutes}
				onSelectDay={(day) => {
					setSelectedDate(day);
					setCurrentMonth(day);
				}}
				onEventClick={(e) => openEditDialog(e as LocalCalendarEvent)}
				onSlotClick={(day, hour) => openQuickCreate(day, hour)}
			/>
		);
	};

	const renderDayView = (
		eventsToRender: LocalCalendarEvent[] = normalizedEvents,
	) => {
		return (
			<DayView
				selectedDate={selectedDate || new Date()}
				events={eventsToRender}
				canViewSensitive={(e) =>
					canViewEventSensitiveDetails(e as LocalCalendarEvent)
				}
				formatTime={formatTimeForDisplay}
				parseTimeToMinutes={parseTimeToMinutes}
				onSelectDay={(day) => {
					setSelectedDate(day);
					setCurrentMonth(day);
				}}
				onEventClick={(e) => openEditDialog(e as LocalCalendarEvent)}
				onSlotClick={(day, hour) => openQuickCreate(day, hour)}
			/>
		);
	};

	const renderAgendaView = (
		eventsToRender: LocalCalendarEvent[] = normalizedEvents,
	) => {
		const rangeStart = startOfMonth(currentMonth);
		const rangeEnd = endOfMonth(currentMonth);
		return (
			<AgendaView
				events={eventsToRender}
				rangeStart={rangeStart}
				rangeEnd={rangeEnd}
				canViewSensitive={(e) =>
					canViewEventSensitiveDetails(e as LocalCalendarEvent)
				}
				formatTime={formatTimeForDisplay}
				parseTimeToMinutes={parseTimeToMinutes}
				onEventClick={(e) => openEditDialog(e as LocalCalendarEvent)}
			/>
		);
	};

	const renderActiveView = (eventsToRender: LocalCalendarEvent[]) => {
		switch (viewMode) {
			case "day":
				return renderDayView(eventsToRender);
			case "week":
				return renderWeekView(eventsToRender);
			case "agenda":
				return renderAgendaView(eventsToRender);
			default:
				return renderMonthView(eventsToRender);
		}
	};

	const navigatePeriod = (direction: -1 | 1) => {
		const base = selectedDate || currentMonth;
		if (viewMode === "day") {
			const next = direction === 1 ? addDays(base, 1) : subDays(base, 1);
			setSelectedDate(next);
			setCurrentMonth(next);
			return;
		}
		if (viewMode === "week") {
			const next = direction === 1 ? addWeeks(base, 1) : subWeeks(base, 1);
			setSelectedDate(next);
			setCurrentMonth(next);
			return;
		}
		setCurrentMonth(
			direction === 1 ? addMonths(currentMonth, 1) : subMonths(currentMonth, 1),
		);
	};

	const periodLabel = (() => {
		const base = selectedDate || currentMonth;
		if (viewMode === "day") return format(base, "EEEE, MMMM d, yyyy");
		if (viewMode === "week") {
			const ws = startOfWeek(base);
			const we = endOfWeek(base);
			return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
		}
		return format(currentMonth, "MMMM yyyy");
	})();

	return (
		<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="space-y-6">
				{/* Calendar Title and Outlook Status */}
				<div className="flex items-center justify-between">
					<h1 className="h1 capitalize sidebar-gradient-text">Calendar</h1>
					{outlookConnected && (
						<div className="flex items-center border border-green/20 rounded-full gap-1 px-3 py-1 bg-green/10 text-green text-sm">
							<CheckCircle className="h-4 w-4 text-green" />
							<span>Outlook</span>
						</div>
					)}
				</div>

				<Card className="glass-card overflow-hidden">
					<div className="glass-card-cap" />
					<CardContent className="p-0">
						{/* Clean toolbar — pt clears absolute glass-card-cap (h-4) */}
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-7 px-4 pb-4 border-b border-slate-200 bg-white/60">
							<div className="flex items-center gap-2 sm:gap-3 flex-wrap min-w-0">
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										const today = new Date();
										setCurrentMonth(today);
										setSelectedDate(today);
									}}
									className="px-3 sm:px-4 border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 cursor-pointer shrink-0"
								>
									Today
								</Button>
								<div className="flex items-center gap-1 shrink-0">
									<Button
										size="sm"
										variant="ghost"
										onClick={() => navigatePeriod(-1)}
										className="h-8 w-8 p-0 hover:bg-slate-100 cursor-pointer"
										aria-label="Previous period"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={() => navigatePeriod(1)}
										className="h-8 w-8 p-0 hover:bg-slate-100 cursor-pointer"
										aria-label="Next period"
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
								<div className="text-xl sm:text-2xl font-bold sidebar-gradient-text truncate min-w-0">
									{periodLabel}
								</div>
							</div>

							<div className="flex items-center gap-2 flex-wrap">
								<Tabs
									value={viewMode}
									onValueChange={(value) =>
										setViewMode(value as CalendarViewMode)
									}
								>
									<TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
										<TabsTrigger
											value="day"
											className="hidden sm:flex items-center space-x-1 cursor-pointer"
										>
											<CalendarIcon className="h-4 w-4 text-slate-700 shrink-0" />
											<span className="sidebar-gradient-text">Day</span>
										</TabsTrigger>
										<TabsTrigger
											value="week"
											className="flex items-center space-x-1 cursor-pointer"
										>
											<CalendarDays className="h-4 w-4 shrink-0" />
											<span className="sidebar-gradient-text">Week</span>
										</TabsTrigger>
										<TabsTrigger
											value="month"
											className="flex items-center space-x-1 cursor-pointer"
										>
											<Grid3X3 className="h-4 w-4 text-slate-700 shrink-0" />
											<span className="sidebar-gradient-text">Month</span>
										</TabsTrigger>
										<TabsTrigger
											value="agenda"
											className="flex items-center space-x-1 cursor-pointer"
										>
											<List className="h-4 w-4 shrink-0" />
											<span className="sidebar-gradient-text">Agenda</span>
										</TabsTrigger>
									</TabsList>
								</Tabs>

								{/* New Event Button - PRIMARY ACTION */}
								<Dialog
									open={isAddEventOpen}
									onOpenChange={(open) => {
										if (open && !canCreateEvent) {
											toast({
												title: "Permission denied",
												description:
													"You do not have permission to create events.",
												variant: "destructive",
											});
											return;
										}
										setIsAddEventOpen(open);
									}}
								>
									<DialogTrigger asChild>
										<Button
											size="sm"
											variant="outline"
											className="primary-btn px-3 sm:px-4"
											disabled={!canCreateEvent}
											onClick={() => {
												// Ensure this dialog opens in create mode
												setSelectedEvent(null);
												setNewEvent({
													title: "",
													date: new Date(),
													endDate: new Date(),
													type: "meeting",
													description: "",
													startTime: getSmartPlaceholderTimes(new Date())
														.startTime,
													endTime: getSmartPlaceholderTimes(new Date()).endTime,
													contractName: "",
													participants: "",
													location: "",
													sensitivityLevel: "standard",
												});
											}}
										>
											<Plus className="h-4 w-4 text-white" />
											New Event
										</Button>
									</DialogTrigger>
									<DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-[700px] p-0 max-h-[90vh] flex flex-col">
										<VisuallyHiddenPrimitive.Root>
											<DialogTitle>
												{selectedEvent ? "Update Event" : "Create New Event"}
											</DialogTitle>
										</VisuallyHiddenPrimitive.Root>
										<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
										{/* Professional Header */}
										<div className="glass-dialog-wizard-header mt-4">
											<div className="flex items-center justify-between ml-6">
												<div className="flex items-center">
													<div>
														<div className="flex items-center gap-2">
															{selectedEvent ? (
																<Pencil className="h-5 w-5 text-[#0f5384]" />
															) : (
																<CalendarIcon className="h-5 w-5 text-[#0f5384]" />
															)}
															<h2 className="text-xl font-semibold sidebar-gradient-text">
																{selectedEvent
																	? "Update Event"
																	: "Create New Event"}
															</h2>
														</div>
														<p className="text-sm text-slate-600 mt-1 ml-7">
															{selectedEvent
																? "Update the details for your event"
																: "Schedule a professional meeting or event"}
														</p>
													</div>
												</div>
											</div>
										</div>

										{/* Content section with scroll */}
										<div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
											{/* Event Title Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label
													className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
													htmlFor="title"
												>
													<FileText className="w-4 h-4 text-blue-600" />
													Event Title
												</Label>
												<Input
													id="title"
													value={newEvent.title}
													onChange={(e) =>
														setNewEvent({ ...newEvent, title: e.target.value })
													}
													placeholder="Enter a descriptive title for your event"
													className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11 text-base"
												/>
											</div>
											{/* Participants Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label
													className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
													htmlFor="participants"
												>
													<Users className="w-4 h-4 text-blue-600" />
													Participants
												</Label>

												{/* Selected Participants Display */}
												{selectedParticipants.length > 0 && (
													<div className="flex flex-wrap gap-2 mb-3">
														{selectedParticipants.map((participant) => (
															<Badge
																key={participant.$id}
																variant="secondary"
																className="flex items-center gap-2 bg-blue-100 text-blue-800 border-blue-200 px-3 py-1"
															>
																<Avatar
																	name={
																		participant.fullName || participant.name
																	}
																	userId={participant.$id}
																	size="sm"
																/>
																<span className="text-sm font-medium">
																	{participant.fullName || participant.name}
																</span>
																<Button
																	variant="ghost"
																	size="sm"
																	className="h-4 w-4 p-0 hover:bg-blue-200 rounded-full"
																	onClick={() =>
																		removeParticipant(participant.$id)
																	}
																>
																	<X className="h-3 w-3" />
																</Button>
															</Badge>
														))}
													</div>
												)}

												{/* Participant Search */}
												<div className="space-y-2">
													<Input
														placeholder="Search for team members..."
														value={participantSearch}
														onChange={(e) => {
															const value = e.target.value;
															setParticipantSearch(value);
															searchUsers(value);
														}}
														className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500 h-11"
													/>

													{/* Search Results */}
													{participantSearch.length >= 2 && (
														<div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
															{isSearching && (
																<div className="p-3 text-sm text-slate-500 flex items-center gap-2">
																	<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																	Searching team members...
																</div>
															)}
															{!isSearching && searchResults.length === 0 && (
																<div className="p-3 text-sm text-slate-500">
																	No team members found.
																</div>
															)}
															{searchResults.length > 0 && (
																<div className="divide-y divide-slate-100">
																	{searchResults.map((user) => (
																		<div
																			key={user.$id}
																			className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
																			onClick={() => addParticipant(user)}
																		>
																			<div className="flex items-center gap-3">
																				<div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-sm font-medium">
																					{(user.fullName || user.name || "?")
																						.charAt(0)
																						.toUpperCase()}
																				</div>
																				<div className="flex flex-col">
																					<span className="font-medium text-sm text-slate-700">
																						{user.fullName || user.name}
																					</span>
																					<span className="text-xs text-slate-500">
																						{user.email}
																					</span>
																				</div>
																			</div>
																			<Button
																				variant="ghost"
																				size="sm"
																				className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
																			>
																				<UserPlus className="h-4 w-4 text-blue-600" />
																			</Button>
																		</div>
																	))}
																</div>
															)}
														</div>
													)}
												</div>
											</div>
											{/* Date and Time Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
													<Clock className="w-4 h-4 text-blue-600" />
													Schedule
												</div>

												<div className="grid grid-cols-2 gap-4">
													{/* Column 1: Dates */}
													<div className="space-y-4">
														<div>
															<Label
																htmlFor="date"
																className="text-sm font-medium text-slate-700 mb-2 block"
															>
																Start Date
															</Label>
															<Popover>
																<PopoverTrigger asChild>
																	<Button
																		variant="outline"
																		className="w-full justify-between font-normal text-sm h-11 bg-white border-slate-300 hover:border-blue-500"
																	>
																		{newEvent.date
																			? newEvent.date.toLocaleDateString(
																					"en-US",
																					{
																						weekday: "short",
																						month: "short",
																						day: "numeric",
																						year: "numeric",
																					},
																				)
																			: "Select start date"}
																		<CalendarDays className="h-4 w-4 text-slate-500" />
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-auto overflow-hidden p-0 shadow-lg border-slate-200"
																	align="start"
																>
																	<Calendar
																		mode="single"
																		selected={newEvent.date}
																		disabled={(date) => {
																			const today = new Date();
																			today.setHours(0, 0, 0, 0);
																			const checkDate = new Date(date);
																			checkDate.setHours(0, 0, 0, 0);
																			return checkDate < today;
																		}}
																		onSelect={(date) => {
																			const selectedDate = date || new Date();
																			const smartTimes =
																				getSmartPlaceholderTimes(selectedDate);
																			setNewEvent({
																				...newEvent,
																				date: selectedDate,
																				startTime:
																					newEvent.startTime ||
																					smartTimes.startTime,
																				endTime:
																					newEvent.endTime ||
																					smartTimes.endTime,
																			});
																		}}
																	/>
																</PopoverContent>
															</Popover>
														</div>

														<div>
															<Label
																htmlFor="endDate"
																className="text-sm font-medium text-slate-700 mb-2 block"
															>
																End Date
															</Label>
															<Popover>
																<PopoverTrigger asChild>
																	<Button
																		variant="outline"
																		className="w-full justify-between font-normal text-sm h-11 bg-white border-slate-300 hover:border-blue-500"
																	>
																		{newEvent.endDate
																			? newEvent.endDate.toLocaleDateString(
																					"en-US",
																					{
																						weekday: "short",
																						month: "short",
																						day: "numeric",
																						year: "numeric",
																					},
																				)
																			: "Select end date"}
																		<CalendarDays className="h-4 w-4 text-slate-500" />
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-auto overflow-hidden p-0 shadow-lg border-slate-200"
																	align="start"
																>
																	<Calendar
																		mode="single"
																		selected={newEvent.endDate}
																		disabled={(date) => {
																			const today = new Date();
																			today.setHours(0, 0, 0, 0);
																			const checkDate = new Date(date);
																			checkDate.setHours(0, 0, 0, 0);
																			return checkDate < today;
																		}}
																		onSelect={(date) => {
																			const selectedEndDate =
																				date || new Date();
																			setNewEvent({
																				...newEvent,
																				endDate: selectedEndDate,
																			});
																		}}
																	/>
																</PopoverContent>
															</Popover>
														</div>
													</div>

													{/* Column 2: Times */}
													<div className="space-y-4">
														<div>
															<Label
																htmlFor="startTime"
																className="text-sm font-medium text-slate-700 mb-2 block"
															>
																Start Time
															</Label>
															<Select
																value={
																	newEvent.startTime ||
																	getSmartPlaceholderTimes(newEvent.date)
																		.startTime
																}
																onValueChange={(value) =>
																	setNewEvent({ ...newEvent, startTime: value })
																}
															>
																<SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
																	<SelectValue placeholder="Select start time" />
																</SelectTrigger>
																<SelectContent className="shadow-lg border-slate-200">
																	{generateTimeOptions(newEvent.date).map(
																		(time) => (
																			<SelectItem
																				key={time.value}
																				value={time.value}
																				disabled={time.disabled}
																				className={
																					time.disabled
																						? "opacity-50 cursor-not-allowed"
																						: ""
																				}
																			>
																				{time.label}
																			</SelectItem>
																		),
																	)}
																</SelectContent>
															</Select>
														</div>
														<div>
															<Label
																htmlFor="endTime"
																className="text-sm font-medium text-slate-700 mb-2 block"
															>
																End Time
															</Label>
															<Select
																value={
																	newEvent.endTime ||
																	getSmartPlaceholderTimes(newEvent.date)
																		.endTime
																}
																onValueChange={(value) =>
																	setNewEvent({ ...newEvent, endTime: value })
																}
															>
																<SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
																	<SelectValue placeholder="Select end time" />
																</SelectTrigger>
																<SelectContent className="shadow-lg border-slate-200">
																	{generateTimeOptions(newEvent.date).map(
																		(time) => (
																			<SelectItem
																				key={time.value}
																				value={time.value}
																				disabled={time.disabled}
																				className={
																					time.disabled
																						? "opacity-50 cursor-not-allowed"
																						: ""
																				}
																			>
																				{time.label}
																			</SelectItem>
																		),
																	)}
																</SelectContent>
															</Select>
														</div>
													</div>
												</div>
											</div>

											{/* Event Type Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label
													htmlFor="type"
													className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
												>
													<Tag className="w-4 h-4 text-blue-600" />
													Event Type
												</Label>
												<Select
													value={newEvent.type}
													onValueChange={(value) =>
														setNewEvent({
															...newEvent,
															type: value as NewEventForm["type"],
														})
													}
												>
													<SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
														<SelectValue placeholder="Select event type" />
													</SelectTrigger>
													<SelectContent className="shadow-lg border-slate-200">
														<SelectItem value="audit">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 bg-purple-500 rounded-full"></div>
																Audit
															</div>
														</SelectItem>
														<SelectItem value="contract">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 bg-blue rounded-full"></div>
																Contract Review
															</div>
														</SelectItem>
														<SelectItem value="meeting">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 bg-green rounded-full"></div>
																Meeting
															</div>
														</SelectItem>
														<SelectItem value="deadline">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 bg-red rounded-full"></div>
																Deadline Discussion
															</div>
														</SelectItem>
														<SelectItem value="review">
															<div className="flex items-center gap-2">
																<div className="w-2 h-2 bg-orange rounded-full"></div>
																Internal Review
															</div>
														</SelectItem>
													</SelectContent>
												</Select>
											</div>

											{/* Sensitivity Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
													<AlertTriangle className="w-4 h-4 text-blue-600" />
													Sensitivity Level
												</Label>
												<Select
													value={newEvent.sensitivityLevel}
													onValueChange={(value: CalendarSensitivity) =>
														setNewEvent({
															...newEvent,
															sensitivityLevel: value,
														})
													}
												>
													<SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
														<SelectValue placeholder="Select sensitivity level" />
													</SelectTrigger>
													<SelectContent className="shadow-lg border-slate-200">
														{(
															[
																"standard",
																"restricted",
																"confidential",
															] as const
														).map((level) => (
															<SelectItem key={level} value={level}>
																<div className="flex flex-col text-left">
																	<span className="text-sm font-medium">
																		{SENSITIVITY_LABELS[level]}
																	</span>
																	<span className="text-xs text-slate-500">
																		{level === "standard"
																			? "Visible to users with calendar access."
																			: level === "restricted"
																				? "Requires approver review before publishing."
																				: "Visible only to approvers until approved."}
																	</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{newEvent.sensitivityLevel !== "standard" && (
													<p className="mt-2 text-xs text-slate-500">
														This event will remain hidden until an approver
														approves it.
													</p>
												)}
											</div>

											{/* Contract Selection (conditional) */}
											{["contract", "contract review"].includes(
												(newEvent.type as unknown as string).toLowerCase(),
											) && (
												<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
													<Label
														htmlFor="contractName"
														className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
													>
														<FileText className="w-4 h-4 text-blue-600" />
														Related Contract
													</Label>
													<Select
														value={newEvent.contractName}
														onValueChange={(value) =>
															setNewEvent({ ...newEvent, contractName: value })
														}
													>
														<SelectTrigger className="h-11 bg-white border-slate-300 hover:border-blue-500">
															<SelectValue placeholder="Select a contract to review" />
														</SelectTrigger>
														<SelectContent className="shadow-lg border-slate-200">
															{loadingContracts ? (
																<SelectItem value="loading" disabled>
																	<div className="flex items-center gap-2">
																		<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																		Loading contracts...
																	</div>
																</SelectItem>
															) : contracts.length > 0 ? (
																contracts.map((contract) => (
																	<SelectItem
																		key={contract.id}
																		value={contract.name}
																	>
																		<div className="flex items-center gap-2">
																			<FileText className="w-4 h-4 text-slate-500" />
																			{contract.name}
																		</div>
																	</SelectItem>
																))
															) : (
																<SelectItem value="no-contracts" disabled>
																	No contracts available
																</SelectItem>
															)}
														</SelectContent>
													</Select>
												</div>
											)}

											{/* Location Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label
													htmlFor="location"
													className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
												>
													<MapPin className="w-4 h-4 text-blue-600" />
													Location
												</Label>
												{/* Location Search */}
												<div className="space-y-2">
													<SearchField
														id="location"
														placeholder="Search for a meeting room or location..."
														value={locationSearch}
														onChange={(e) => {
															const value = e.target.value;
															setLocationSearch(value);
															setNewEvent({ ...newEvent, location: value });
															searchLocations(value);
														}}
														onFocus={() => {
															if (locationSearch.length >= 2) {
																searchLocations(locationSearch);
															}
														}}
														className="h-11 bg-white"
													/>

													{/* Location Search Results */}
													{locationSearch.length >= 2 &&
														locationResults.length > 0 && (
															<div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
																{isSearchingLocation && (
																	<div className="p-3 text-sm text-slate-500 flex items-center gap-2">
																		<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
																		Searching locations...
																	</div>
																)}
																{!isSearchingLocation &&
																	locationResults.length > 0 && (
																		<div className="divide-y divide-slate-100">
																			{locationResults.map((location) => (
																				<div
																					key={location.id}
																					className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
																					onClick={() => {
																						setNewEvent({
																							...newEvent,
																							location: location.address,
																						});
																						setLocationSearch(location.address);
																						setLocationResults([]);
																						// If this is a resource, set the resourceId
																						if (
																							location.type === "resource" &&
																							location.resourceId
																						) {
																							setSelectedResourceId(
																								location.resourceId,
																							);
																						} else {
																							setSelectedResourceId(null);
																						}
																					}}
																				>
																					<div className="flex items-center gap-3">
																						<div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
																							<MapPin className="h-4 w-4 text-slate-500" />
																						</div>
																						<div className="flex flex-col">
																							<span className="font-medium text-sm text-slate-700">
																								{location.name}
																							</span>
																							<span className="text-xs text-slate-500">
																								{location.address}
																							</span>
																						</div>
																					</div>
																					<Button
																						variant="ghost"
																						size="sm"
																						className="h-8 w-8 p-0 hover:bg-blue-100 rounded-full"
																					>
																						<Plus className="h-4 w-4 text-blue-600" />
																					</Button>
																				</div>
																			))}
																		</div>
																	)}
															</div>
														)}

													{/* No results message - only show when actively searching and no results */}
													{locationSearch.length >= 2 &&
														!isSearchingLocation &&
														locationResults.length === 0 &&
														!newEvent.location && (
															<div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-sm">
																<div className="p-3 text-sm text-slate-500">
																	No locations found. You can enter a custom
																	location.
																</div>
															</div>
														)}
												</div>
											</div>

											{/* Priority 2: Reminders Section */}
											<EventReminderConfigComponent
												reminders={newEvent.reminders || []}
												onChange={(reminders) =>
													setNewEvent({ ...newEvent, reminders })
												}
											/>

											{/* Description Section */}
											<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
												<Label
													htmlFor="description"
													className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3"
												>
													<MessageSquare className="w-4 h-4 text-blue-600" />
													Description
												</Label>
												<Textarea
													id="description"
													value={newEvent.description}
													onChange={(e) =>
														setNewEvent({
															...newEvent,
															description: e.target.value,
														})
													}
													placeholder="Add meeting agenda, objectives, or any additional details..."
													rows={4}
													className="bg-white border-slate-300 focus:border-[#078FAB] focus:ring-1 focus:ring-[#078FAB] focus-visible:ring-1 focus-visible:ring-[#078FAB] focus-visible:ring-offset-0 resize-none"
												/>
											</div>

											{/* Attachments Section - Only for specific event types */}
											{supportsAttachments(newEvent.type) && (
												<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
													<Label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
														<Paperclip className="w-4 h-4 text-blue-600" />
														Attachments
													</Label>
													<div className="space-y-3">
														<div className="flex items-center gap-2">
															<Input
																type="file"
																id="file-upload"
																multiple
																accept={getEnterpriseInputAccept("attachment")}
																onChange={(e) =>
																	handleFileUpload(e.target.files)
																}
																className="hidden"
																disabled={uploadingFiles}
															/>
															<Label
																htmlFor="file-upload"
																className={cn(
																	"flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors",
																	uploadingFiles &&
																		"opacity-50 cursor-not-allowed",
																)}
															>
																{uploadingFiles ? (
																	<>
																		<Loader2 className="w-4 h-4 animate-spin text-blue-600" />
																		<span className="text-sm text-slate-600">
																			Uploading...
																		</span>
																	</>
																) : (
																	<>
																		<Paperclip className="w-4 h-4 text-blue-600" />
																		<span className="text-sm text-slate-700">
																			Upload Documents
																		</span>
																	</>
																)}
															</Label>
															<span className="text-xs text-slate-500">
																JPG, JPEG, PNG, PDF, DOC, DOCX (Max 50MB each)
															</span>
														</div>

														{/* Display uploaded attachments */}
														{newEvent.attachments &&
															newEvent.attachments.length > 0 && (
																<div className="space-y-2">
																	{newEvent.attachments.map((attachment) => (
																		<div
																			key={attachment.$id}
																			className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg"
																		>
																			<div className="flex items-center gap-2 flex-1 min-w-0">
																				<FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
																				<div className="flex-1 min-w-0">
																					<p className="text-sm font-medium text-slate-700 truncate">
																						{attachment.name || "Unknown file"}
																					</p>
																					<p className="text-xs text-slate-500">
																						{convertFileSize({
																							sizeInBytes: attachment.size,
																						})}
																						{attachment.extension && (
																							<>
																								{" "}
																								•{" "}
																								{attachment.extension.toUpperCase()}
																							</>
																						)}
																					</p>
																				</div>
																			</div>
																			<Button
																				type="button"
																				variant="ghost"
																				size="sm"
																				className="h-8 w-8 p-0 hover:bg-red-50"
																				onClick={() =>
																					handleRemoveAttachment(attachment.$id)
																				}
																			>
																				<Trash2 className="w-4 h-4 text-red-600" />
																			</Button>
																		</div>
																	))}
																</div>
															)}
													</div>
												</div>
											)}
										</div>

										{/* Professional Footer */}
										<div className="border-t border-white/40 bg-white/35 px-6 py-4 backdrop-blur-sm">
											<div className="flex items-center justify-between">
												<div className="text-sm text-slate-500">
													{newEvent.description
														? `${newEvent.description.length} characters`
														: "Enter event details"}
												</div>
												<div className="flex items-center gap-3">
													<Button
														variant="outline"
														className="primary-btn px-3 sm:px-4"
														onClick={handleCancelEvent}
													>
														<Ban className="w-4 h-4" />
														Cancel
													</Button>
													<Button
														className="primary-btn px-3 sm:px-4"
														onClick={
															selectedEvent
																? handleUpdateEventFromDialog
																: handleCreateEvent
														}
														disabled={
															creatingEvent ||
															!newEvent.title.trim() ||
															!canCreateEvent
														}
													>
														{creatingEvent ? (
															<>
																<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
																{selectedEvent ? "Updating..." : "Creating..."}
															</>
														) : (
															<>
																{selectedEvent ? (
																	<Pencil className="w-4 h-4" />
																) : (
																	<Plus className="w-4 h-4" />
																)}
																{selectedEvent
																	? "Update Event"
																	: "Create Event"}
															</>
														)}
													</Button>
												</div>
											</div>
										</div>
									</DialogContent>
								</Dialog>

								<Button
									size="sm"
									className="btn-primary px-3 sm:px-4 cursor-pointer"
									onClick={() => setIsFiltersDrawerOpen(true)}
								>
									<SlidersHorizontal className="h-4 w-4" />
									Manage
								</Button>
							</div>
						</div>

						<Dialog open={showSettings} onOpenChange={setShowSettings}>
							<DialogContent className="sm:max-w-[460px] max-h-[80vh] overflow-y-auto p-4 sm:p-4 gap-2 shadow-xl">
								<DialogHeader>
									<DialogTitle className="sidebar-gradient-text">
										Calendar Settings
									</DialogTitle>
								</DialogHeader>
								{showSettings ? (
									<CalendarSettings
										userId={user?.$id || ""}
										onClose={() => setShowSettings(false)}
									/>
								) : null}
							</DialogContent>
						</Dialog>

						{/* Management + Calendar View */}
						<div className="flex flex-col lg:flex-row gap-0 min-h-[640px]">
							<CalendarSidebar
								selectedMyCalendars={selectedMyCalendars}
								selectedSharedCalendars={selectedSharedCalendars}
								onMyCalendarChange={handleMyCalendarChange}
								onSharedCalendarChange={handleSharedCalendarChange}
								sharedCalendars={sharedCalendars.map((cal) => ({
									...cal,
									ownerName: sharedCalendarOwnerNames[cal.$id] || cal.name,
								}))}
								loadingSharedCalendars={loadingSharedCalendars}
								selectedDate={selectedDate}
								currentMonth={currentMonth}
								onSelectDate={(date) => setSelectedDate(date)}
								onMonthChange={(month) => setCurrentMonth(month)}
							>
								<SharedCalendarManager />
								<ResourceManager />
								<CalendarDelegationManager />
							</CalendarSidebar>

							{/* Calendar Display Area */}
							<div
								ref={calendarContainerRef}
								className={`flex-1 bg-white/40 ${
									(selectedMyCalendars.calendar ? 1 : 0) +
										(selectedMyCalendars.usHolidays ? 1 : 0) +
										selectedSharedCalendars.length >
									1
										? "overflow-x-auto"
										: "overflow-x-hidden"
								}`}
							>
								<div
									className="flex gap-4 p-4"
									style={{
										minWidth:
											(selectedMyCalendars.calendar ? 1 : 0) +
												(selectedMyCalendars.usHolidays ? 1 : 0) +
												selectedSharedCalendars.length >
											1
												? "max-content"
												: "auto",
									}}
								>
									{(() => {
										// Calculate number of visible calendars
										const _visibleCalendarsCount =
											(selectedMyCalendars.calendar ? 1 : 0) +
											(selectedMyCalendars.usHolidays ? 1 : 0) +
											selectedSharedCalendars.length;

										// Use the calculated calendarWidth from state

										return (
											<>
												{/* Main Calendar */}
												{selectedMyCalendars.calendar && (
													<div
														className="flex-shrink-0"
														style={{ width: calendarWidth }}
													>
														<div className="flex items-center justify-between mb-2 px-1">
															<h3 className="text-lg font-semibold text-slate-700">
																Calendar
															</h3>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => handleCloseCalendar("calendar")}
																className="h-6 w-6 p-0 hover:bg-slate-100"
															>
																<X className="h-4 w-4" />
															</Button>
														</div>
														<Card>
															<CardContent className="p-0">
																{renderActiveView(defaultCalendarEvents)}
															</CardContent>
														</Card>
													</div>
												)}

												{/* US Holidays Calendar */}
												{selectedMyCalendars.usHolidays && (
													<div
														className="flex-shrink-0"
														style={{ width: calendarWidth }}
													>
														<div className="flex items-center justify-between mb-2 px-1">
															<h3 className="text-lg font-semibold text-slate-700">
																United States holidays
															</h3>
															<Button
																variant="ghost"
																size="sm"
																onClick={() =>
																	handleCloseCalendar("usHolidays")
																}
																className="h-6 w-6 p-0 hover:bg-slate-100"
															>
																<X className="h-4 w-4" />
															</Button>
														</div>
														<Card>
															<CardContent className="p-0">
																{renderActiveView(usHolidaysEvents)}
															</CardContent>
														</Card>
													</div>
												)}

												{/* Shared Calendars */}
												{selectedSharedCalendars.map((calendarId) => {
													const calendar = sharedCalendars.find(
														(cal) => cal.$id === calendarId,
													);
													if (!calendar) return null;

													// Get events for this specific shared calendar (filtered by owner)
													const sharedCalendarEvents =
														getSharedCalendarEvents(calendar);

													return (
														<div
															key={calendarId}
															className="flex-shrink-0"
															style={{ width: calendarWidth }}
														>
															<div className="flex items-center justify-between mb-2 px-1">
																<h3 className="text-lg font-semibold text-slate-700">
																	{sharedCalendarOwnerNames[calendarId] ||
																		calendar.name}
																</h3>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() =>
																		handleCloseCalendar(calendarId)
																	}
																	className="h-6 w-6 p-0 hover:bg-slate-100"
																>
																	<X className="h-4 w-4" />
																</Button>
															</div>
															<Card>
																<CardContent className="p-0">
																	{renderActiveView(sharedCalendarEvents)}
																</CardContent>
															</Card>
														</div>
													);
												})}
											</>
										);
									})()}
								</div>
							</div>

							{isApprover && (
								<CalendarApprovalsRail
									approvals={approvals}
									isLoading={approvalsLoading}
									isExpanded={isApprovalsExpanded}
									onExpandedChange={setIsApprovalsExpanded}
									onSelectApproval={(approval) => {
										setSelectedApproval(approval);
										setIsApprovalDialogOpen(true);
										setReviewerNotes("");
									}}
								/>
							)}
						</div>

						<CalendarFiltersDrawer
							open={isFiltersDrawerOpen}
							onOpenChange={setIsFiltersDrawerOpen}
							outlookConnected={outlookConnected}
							syncing={syncing}
							onShare={() => setIsSharePrimaryCalendarOpen(true)}
							onPrint={() => window.print()}
							onSettings={() => setShowSettings(true)}
							onSync={() => {
								void handleSync();
							}}
						/>

						<QuickCreateEventPopover
							open={isQuickCreateOpen}
							onOpenChange={setIsQuickCreateOpen}
							anchorDate={quickCreateDate}
							canCreate={canCreateEvent}
							creating={creatingEvent}
							defaultStartTime={
								quickCreateHour != null
									? `${String(quickCreateHour).padStart(2, "0")}:00`
									: "09:00"
							}
							onCreate={handleQuickCreate}
							onMoreOptions={handleQuickCreateMoreOptions}
						/>
					</CardContent>
				</Card>

				<ApprovalReviewDialog
					open={isApprovalDialogOpen}
					onOpenChange={setIsApprovalDialogOpen}
					selectedApproval={selectedApproval}
					reviewerNotes={reviewerNotes}
					onReviewerNotesChange={setReviewerNotes}
					isProcessingApproval={isProcessingApproval}
					userNamesMap={userNamesMap}
					loadingUserNames={loadingUserNames}
					attachmentNamesMap={attachmentNamesMap}
					loadingAttachmentNames={loadingAttachmentNames}
					onDecision={handleApprovalDecision}
				/>


				<EventReviewDialog
					isOpen={isEditEventOpen}
					onOpenChange={setIsEditEventOpen}
					event={selectedEvent}
					isHolidayEvent={isHolidayEvent}
					canViewSensitiveDetails={canViewSelectedEventSensitiveDetails}
					canCreateEvent={canCreateEvent}
					eventPermissions={selectedEventPermissions}
					loadingApprovalRequest={loadingApprovalRequest}
					eventApprovalRequest={eventApprovalRequest}
					loadingNames={loadingNames}
					participantNames={participantNames}
					attachmentDetails={attachmentDetails}
					onOpenAiPanel={handleOpenAiPanel}
					onEditEvent={handleEditSelectedEvent}
					onDeleteEvent={handleDeleteEvent}
				/>


				{/* Share Dialog */}
				<ShareEventDialog
					open={isShareOpen}
					onOpenChange={setIsShareOpen}
					permissions={shareSettings.permissions}
					onPermissionsChange={(value) =>
						setShareSettings({ ...shareSettings, permissions: value })
					}
					onShare={handleShare}
				/>

				{/* Delete Confirmation Modal */}

				<DeleteEventDialog
					open={isDeleteModalOpen}
					onOpenChange={setIsDeleteModalOpen}
					eventTitle={selectedEvent?.title}
					deleteReason={deleteReason}
					onDeleteReasonChange={setDeleteReason}
					onCancel={cancelDelete}
					onConfirm={confirmDeleteEvent}
				/>

				{overflowDialog}

				{/* AI Assistant Panel — same dimensions as Ask Caalm preview */}
				<Sheet open={showAiPanel} onOpenChange={setShowAiPanel} modal={false}>
					<SheetContent
						side="right"
						showOverlay={false}
						onInteractOutside={(e) => e.preventDefault()}
						className={cn(
							"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
							"sm:max-w-md",
							"inset-y-auto! top-4! right-4! bottom-4! h-[calc(100vh-2rem)]! max-h-none!",
							"transition-none! duration-200! ease-out!",
							"data-[state=open]:duration-200! data-[state=closed]:duration-200!",
							"data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
							"data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
							"pointer-events-auto",
						)}
						showCloseButton={false}
					>
						<div
							className="glass-card-frosted relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
							style={{ background: "rgba(255, 255, 255, 0.92)" }}
						>
							<div className="glass-card-cap rounded-t-2xl!" />
							<SheetTitle className="sr-only">AI Assistant</SheetTitle>
							<div className="mt-4 min-h-0 flex-1 overflow-hidden">
								<CalendarAIChat
									mode={aiPanelMode}
									event={selectedEventWithDetails || selectedEvent}
									contractData={contractData}
									isContractLoading={loadingContract}
									onClose={() => setShowAiPanel(false)}
								/>
							</div>
						</div>
					</SheetContent>
				</Sheet>

				<ConflictDialog
					open={isConflictDialogOpen}
					onOpenChange={(open) => {
						if (!open) handleCancelConflict();
						else setIsConflictDialogOpen(true);
					}}
					conflictData={conflictData}
					creatingEvent={creatingEvent}
					onCancel={handleCancelConflict}
					onConfirm={handleConfirmConflict}
				/>

				{/* Create Shared Calendar Dialog */}
				<CreateSharedCalendarDialog
					open={isCreateSharedCalendarOpen}
					onOpenChange={setIsCreateSharedCalendarOpen}
					onCalendarCreated={async (_calendar) => {
						// Refresh shared calendars if needed
						if (!loadingSharedCalendars) {
							setLoadingSharedCalendars(true);
							try {
								const response = await fetch("/api/calendar/shared");
								if (response.ok) {
									const data = await response.json();
									setSharedCalendars(data.calendars || []);
								}
							} catch (error) {
								console.error(
									"[CLIENT] OutlookStyleCalendar] Error refreshing shared calendars:",
									error,
								);
							} finally {
								setLoadingSharedCalendars(false);
							}
						}
					}}
				/>

				{/* Share Primary Calendar Dialog */}
				<SharePrimaryCalendarDialog
					open={isSharePrimaryCalendarOpen}
					onOpenChange={setIsSharePrimaryCalendarOpen}
					onShared={async () => {
						// Refresh shared calendars immediately using SWR
						if (refreshSharedCalendars) {
							await refreshSharedCalendars();
						}
					}}
				/>
			</div>
		</div>
	);
};

export default OutlookStyleCalendar;
