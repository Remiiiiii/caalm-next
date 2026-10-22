"use client";

import { ApprovalReviewDialog } from "@/components/calendar/ApprovalReviewDialog";

import {
	addMonths,
	eachDayOfInterval as eachDay,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	formatDistanceToNow,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import {
	AlertCircle,
	CalendarDays,
	CalendarIcon,
	CalendarPlus,
	CheckCircle,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Clock,
	Edit,
	Expand,
	Eye,
	FileCheck,
	FileText,
	Filter,
	Grid3X3,
	Link,
	Loader2,
	MessageSquare,
	Plus,
	Printer,
	RefreshCw,
	Settings,
	Share2,
	Trash2,
	UserPlus,
	Users,
	XCircle,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import CalendarSettings from "@/components/CalendarSettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
	toIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { AppDialog } from "@/components/ui/app-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import {
	type CalendarApprovalStatus,
	type CalendarSensitivity,
	type PermissionOverrideRecord,
	SENSITIVITY_LABELS,
} from "@/constants/rbac";
import { useToast } from "@/hooks/use-toast";
import { useCalendarApprovals } from "@/hooks/useCalendarApprovals";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useCalendarPermissions } from "@/hooks/useCalendarPermissions";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import {
	hasMicrosoftCalendarIntegration,
	syncMicrosoftCalendar,
} from "@/lib/actions/calendar.actions";
import type {
	CalendarApprovalChangeSummary,
	CalendarApprovalRequest,
} from "@/lib/actions/calendar-approval.actions";
import {
	getCalendarApprovalById,
	getLatestApprovalRequestByEventId,
} from "@/lib/actions/calendar-approval.actions";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import {
	isCalendarEventOwner,
	resolveCalendarPermissions,
} from "@/lib/auth/permissions";
import { getSensitivityBadgeClasses } from "@/lib/calendar/calendarStatusDisplay";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

// Local event interface for component use
interface LocalCalendarEvent {
	id: string;
	title: string;
	date?: Date;
	type:
		| "contract"
		| "deadline"
		| "meeting"
		| "review"
		| "audit"
		| "license"
		| "volunteer_shift";
	description?: string;
	participants?: string[];
	contractName?: string;
	amount?: string;
	startTime?: string;
	endTime?: string;
	sensitivityLevel?: CalendarSensitivity;
	requiresApproval?: boolean;
	approvalStatus?: CalendarApprovalStatus;
	pendingApprovalId?: string | null;
	overrides?: PermissionOverrideRecord[];
}

export type CalendarDisplayEvent = LocalCalendarEvent;

type EventWithExtras = LocalCalendarEvent & {
	sensitivityLevel?: CalendarSensitivity;
	approvalStatus?: CalendarApprovalStatus;
	requiresApproval?: boolean;
	pendingApprovalId?: string | null;
	overrides?: PermissionOverrideRecord[];
};

// Internal state interface for new event form
interface NewEventForm {
	title: string;
	date: Date | undefined;
	type: "contract" | "deadline" | "meeting" | "review" | "audit" | "license";
	description: string;
	startTime: string;
	endTime: string;
	sensitivityLevel: CalendarSensitivity;
}

// Sharing interface
interface ShareSettings {
	users: string[];
	permissions: "view" | "edit";
	linkEnabled: boolean;
}

interface ExpandedCalendarViewProps {
	events?: LocalCalendarEvent[];
	onEventClick?: (event: LocalCalendarEvent) => void;
	onDateSelect?: (date: Date) => void;
	onEventCreate?: (event: Omit<LocalCalendarEvent, "id">) => void;
	user?: {
		$id: string;
		fullName?: string;
		role?: string;
		department?: string;
	} | null;
	triggerClassName?: string;
	showExpandLabel?: boolean;
}

const ExpandedCalendarView: React.FC<ExpandedCalendarViewProps> = ({
	events = [],
	onEventClick,
	onDateSelect,
	onEventCreate,
	user,
	triggerClassName,
	showExpandLabel = true,
}) => {
	const { toast } = useToast();
	const timeZone = useOrgTimezone();
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		new Date(),
	);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [viewMode, setViewMode] = useState<"month" | "week">("month");
	const [isExpanded, setIsExpanded] = useState(false);
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [selectedEvent, setSelectedEvent] = useState<LocalCalendarEvent | null>(
		null,
	);
	const [creatingEvent, setCreatingEvent] = useState(false);
	const [shareSettings, setShareSettings] = useState<ShareSettings>({
		users: [],
		permissions: "view",
		linkEnabled: false,
	});
	const [showSettings, setShowSettings] = useState(false);
	const [outlookConnected, setOutlookConnected] = useState(false);
	const [syncing, setSyncing] = useState(false);

	// New event form state
	const [newEvent, setNewEvent] = useState<NewEventForm>({
		title: "",
		date: new Date(),
		type: "meeting",
		description: "",
		startTime: "",
		endTime: "",
		sensitivityLevel: "standard",
	});

	const { events: calendarEvents, refresh } = useCalendarEvents();
	const { userId, accountId } = useUserRole();
	const { permissions: basePermissions } = useCalendarPermissions({
		userId,
	});
	const canCreateEvent = basePermissions.createEvent;
	const { permissions } = usePermissions();
	const isApprover = permissions.includes(PERMISSIONS.EVENTS.APPROVE);
	const {
		approvals,
		isLoading: approvalsLoading,
		refresh: refreshApprovals,
	} = useCalendarApprovals({ status: "pending", enabled: isApprover });

	// Pending approvals collapse state
	const [isApprovalsExpanded, setIsApprovalsExpanded] = useState(true);

	// Approval dialog state
	const [selectedApproval, setSelectedApproval] =
		useState<CalendarApprovalRequest | null>(null);
	const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
	const [isProcessingApproval, setIsProcessingApproval] = useState(false);
	const [reviewerNotes, setReviewerNotes] = useState("");
	const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});
	const [loadingUserNames, setLoadingUserNames] = useState(false);
	const [attachmentNamesMap, setAttachmentNamesMap] = useState<
		Record<string, string>
	>({});
	const [loadingAttachmentNames, setLoadingAttachmentNames] = useState(false);
	const [eventApprovalRequest, setEventApprovalRequest] =
		useState<CalendarApprovalRequest | null>(null);
	const [loadingApprovalRequest, setLoadingApprovalRequest] = useState(false);

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
					const files = await response.json();
					const namesMap: Record<string, string> = {};
					files.forEach((file: any) => {
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

	// Fetch approval request when event detail dialog opens for events with changes_requested or rejected status
	useEffect(() => {
		const fetchApprovalRequest = async () => {
			if (
				!selectedEvent ||
				(selectedEvent.approvalStatus !== "changes_requested" &&
					selectedEvent.approvalStatus !== "rejected")
			) {
				setEventApprovalRequest(null);
				return;
			}

			setLoadingApprovalRequest(true);
			try {
				let approval: CalendarApprovalRequest | null = null;

				// First try to get by pendingApprovalId if it exists
				if (selectedEvent.pendingApprovalId) {
					approval = await getCalendarApprovalById(
						selectedEvent.pendingApprovalId,
					);
				}

				// If not found and status is changes_requested, get the most recent one
				if (
					!approval &&
					selectedEvent.approvalStatus === "changes_requested" &&
					((selectedEvent as any).$id || selectedEvent.id)
				) {
					approval = await getLatestApprovalRequestByEventId(
						(selectedEvent as any).$id || selectedEvent.id,
						"changes_requested",
					);
				}

				// If still not found and status is rejected, try to get rejected one
				if (
					!approval &&
					selectedEvent.approvalStatus === "rejected" &&
					((selectedEvent as any).$id || selectedEvent.id)
				) {
					approval = await getLatestApprovalRequestByEventId(
						(selectedEvent as any).$id || selectedEvent.id,
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
		selectedEvent?.pendingApprovalId,
		selectedEvent?.approvalStatus,
		selectedEvent?.id,
		(selectedEvent as { $id?: string } | null)?.$id,
		selectedEvent,
	]);

	const selectedEventPermissions = useMemo(() => {
		if (!selectedEvent) {
			return null;
		}
		const overrides = (selectedEvent as EventWithExtras)?.overrides || [];
		return resolveCalendarPermissions({
			heldPermissions: permissions,
			isEventOwner: isCalendarEventOwner({
				userId,
				userAccountId: accountId,
				event: selectedEvent as {
					createdByUserId?: string | null;
					createdByAccountId?: string | null;
					createdBy?: string | null;
				},
			}),
			overrides,
			context: {
				userId: userId || "",
				teamIds: [],
			},
		});
	}, [selectedEvent, permissions, userId, accountId]);

	// Combine local events with calendar events
	const allEvents = [...events, ...(calendarEvents || [])];
	const normalizedEvents: EventWithExtras[] = allEvents.map((event) => {
		const extended = event as EventWithExtras;
		return {
			...extended,
			sensitivityLevel: extended.sensitivityLevel || "standard",
			approvalStatus: extended.approvalStatus || "not_required",
			requiresApproval: Boolean(extended.requiresApproval),
			pendingApprovalId:
				extended.pendingApprovalId !== undefined
					? extended.pendingApprovalId
					: null,
			overrides: extended.overrides || [],
		};
	});

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

	const handleSync = async () => {
		if (!user?.$id) return;

		try {
			setSyncing(true);
			const result = await syncMicrosoftCalendar(user.$id);

			if (result.success) {
				toast({
					title: "Success",
					description: result.message,
				});
				// Refresh calendar events
				refresh();
			} else {
				toast({
					title: "Sync Failed",
					description: result.message,
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error syncing calendar:", error);
			toast({
				title: "Error",
				description: "Failed to sync calendar",
				variant: "destructive",
			});
		} finally {
			setSyncing(false);
		}
	};

	const handleDateSelect = (date: Date | undefined) => {
		setSelectedDate(date);
		if (onDateSelect && date) {
			onDateSelect(date);
		}
	};

	const handleMonthChange = (month: Date) => {
		setCurrentMonth(month);
	};

	const getEventTypeConfig = (type: LocalCalendarEvent["type"]) => {
		const configs = {
			contract: {
				color: "bg-blue-100 text-blue-800 border-blue-200",
				icon: FileText,
			},
			deadline: {
				color: "bg-red-100 text-red-800 border-red-200",
				icon: Clock,
			},
			meeting: {
				color: "bg-green-100 text-green-800 border-green-200",
				icon: Users,
			},
			review: {
				color: "bg-yellow-100 text-yellow-800 border-yellow-200",
				icon: FileText,
			},
			audit: {
				color: "bg-purple-100 text-purple-800 border-purple-200",
				icon: FileText,
			},
			license: {
				color: "bg-teal-100 text-teal-800 border-teal-200",
				icon: FileText,
			},
			volunteer_shift: {
				color: "bg-green-100 text-green-800 border-green-200",
				icon: Users,
			},
		};
		return configs[type] ?? configs.meeting;
	};

	// Check if event is from Outlook
	const isOutlookEvent = (event: LocalCalendarEvent): boolean => {
		return !!(event as any).outlook_id || (event as any).source === "outlook";
	};

	const handleAddEvent = async () => {
		if (!newEvent.title.trim()) {
			toast({
				title: "Error",
				description: "Please enter an event title",
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

		setCreatingEvent(true);

		try {
			// Create date string in YYYY-MM-DD format to avoid timezone issues
			const eventDate = newEvent.date || new Date();
			const year = eventDate.getFullYear();
			const month = String(eventDate.getMonth() + 1).padStart(2, "0");
			const day = String(eventDate.getDate()).padStart(2, "0");
			const dateString = `${year}-${month}-${day}`;

			const eventData = {
				title: newEvent.title,
				startDate: dateString,
				type: newEvent.type,
				description: newEvent.description,
				startTime: newEvent.startTime,
				endTime: newEvent.endTime,
				createdBy: accountId || user?.$id || "unknown",
				createdByAccountId: accountId || user?.$id || "unknown",
				createdByUserId: userId,
				sensitivityLevel: newEvent.sensitivityLevel,
				requiresApproval: newEvent.sensitivityLevel !== "standard",
				participants: "",
				contractName: "",
				amount: "",
			} as const;

			// Create event via API to ensure approval is created if needed
			const response = await fetch("/api/calendar/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			});

			if (!response.ok) {
				let errorData: { message?: string; reason?: string; error?: string } =
					{};
				try {
					errorData = await response.json();
				} catch (_parseError) {
					errorData = { message: response.statusText || "Unknown error" };
				}

				const errorMessage =
					errorData.message ||
					errorData.reason ||
					errorData.error ||
					"Failed to create event";
				throw new Error(errorMessage);
			}

			const result = await response.json();
			console.log("Event created successfully:", result);

			// Call parent callback if provided
			if (onEventCreate) {
				onEventCreate({
					title: newEvent.title,
					date: newEvent.date || new Date(),
					type: newEvent.type,
					description: newEvent.description,
					startTime: newEvent.startTime,
					endTime: newEvent.endTime,
				});
			}

			// Reset form
			setNewEvent({
				title: "",
				date: new Date(),
				type: "meeting",
				description: "",
				startTime: "",
				endTime: "",
				sensitivityLevel: "standard",
			});

			// Close modal
			setIsAddEventOpen(false);

			// Refresh events
			if (refresh) {
				refresh();
			}

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

			toast({
				title: result?.approval
					? "Submitted for approval"
					: "Event created successfully",
				description: result?.approval
					? "Your event is awaiting approval before it appears on the shared calendar."
					: "Event created successfully.",
			});
		} catch (error) {
			console.error("Failed to create event:", error);
			toast({
				title: "Error",
				description: "Failed to create event. Please try again.",
				variant: "destructive",
			});
		} finally {
			setCreatingEvent(false);
		}
	};

	const handleEventClick = (event: LocalCalendarEvent) => {
		setSelectedEvent(event);
		if (onEventClick) {
			onEventClick(event);
		}
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
			if (refresh) {
				await refresh();
			}

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
		try {
			// Generate shareable link
			const shareLink = `${window.location.origin}/calendar?shared=true&id=${selectedEvent?.id}`;

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

	// DateCell component that checks if "+n more" is visible and enables scrolling if needed
	const DateCell: React.FC<{
		day: Date;
		dayEvents: EventWithExtras[];
		isCurrentMonth: boolean;
		isSelected: boolean;
		isCurrentDay: boolean;
	}> = ({ day, dayEvents, isCurrentMonth, isSelected, isCurrentDay }) => {
		const cellRef = useRef<HTMLDivElement>(null);
		const eventsContainerRef = useRef<HTMLDivElement>(null);
		const moreIndicatorRef = useRef<HTMLDivElement>(null);
		const [needsScroll, setNeedsScroll] = useState(false);

		useEffect(() => {
			// Check visibility on mount and when events change
			const checkVisibility = () => {
				if (
					!cellRef.current ||
					!eventsContainerRef.current ||
					dayEvents.length <= 3
				) {
					setNeedsScroll(false);
					return;
				}

				// If there's no "+n more" indicator, no need to scroll
				if (!moreIndicatorRef.current) {
					setNeedsScroll(false);
					return;
				}

				const cellRect = cellRef.current.getBoundingClientRect();
				const indicatorRect = moreIndicatorRef.current.getBoundingClientRect();

				// Check if the "+n more" indicator is within the visible bounds of the cell
				const isVisible =
					indicatorRect.top >= cellRect.top &&
					indicatorRect.bottom <= cellRect.bottom;

				setNeedsScroll(!isVisible);
			};

			// Use requestAnimationFrame and setTimeout to ensure DOM is fully rendered
			// This checks visibility after page load
			const timeoutId = setTimeout(() => {
				requestAnimationFrame(() => {
					checkVisibility();
				});
			}, 100);

			return () => clearTimeout(timeoutId);
		}, [dayEvents.length]);

		return (
			<div
				ref={cellRef}
				className={cn(
					"min-h-[120px] p-2 border border-slate-200 cursor-pointer transition-colors flex flex-col",
					!isCurrentMonth && "bg-slate-50 text-slate-400",
					isSelected && "bg-blue-50 border-blue-300",
					isCurrentDay && "bg-blue-100",
				)}
				onClick={() => handleDateSelect(day)}
			>
				<div className="text-sm font-medium mb-1 flex-shrink-0">
					{format(day, "d")}
				</div>

				{/* Events for this day */}
				<div
					ref={eventsContainerRef}
					className={cn(
						"space-y-1 flex-1 min-h-0",
						needsScroll && "overflow-y-auto",
					)}
				>
					{dayEvents.slice(0, 3).map((event) => {
						const config = getEventTypeConfig(event.type);
						return (
							<div
								key={event.id}
								className={cn(
									"text-xs p-1 rounded cursor-pointer truncate relative flex-shrink-0",
									config.color,
								)}
								onClick={(e) => {
									e.stopPropagation();
									handleEventClick(event);
								}}
							>
								<div className="flex items-center gap-1">
									<span className="truncate">{event.title}</span>
									{isOutlookEvent(event) && (
										<CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
									)}
								</div>
							</div>
						);
					})}
					{dayEvents.length > 3 && (
						<div
							ref={moreIndicatorRef}
							className="text-xs text-slate-500 text-center flex-shrink-0"
						>
							+{dayEvents.length - 3} more
						</div>
					)}
				</div>
			</div>
		);
	};

	const renderMonthView = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(currentMonth);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);
		const days = eachDay({ start: startDate, end: endDate });

		return (
			<div className="grid grid-cols-7 gap-1">
				{/* Day headers */}
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
					<div
						key={day}
						className="p-3 text-center text-sm font-medium text-slate-600 bg-slate-50"
					>
						{day}
					</div>
				))}

				{/* Calendar days */}
				{days.map((day) => {
					const dayEvents = normalizedEvents.filter(
						(event) => event.date && isSameDay(new Date(event.date), day),
					);
					const isCurrentMonth = isSameMonth(day, currentMonth);
					const isSelected = Boolean(
						selectedDate && isSameDay(day, selectedDate),
					);
					const isCurrentDay = isToday(day);

					return (
						<DateCell
							key={day.toISOString()}
							day={day}
							dayEvents={dayEvents}
							isCurrentMonth={isCurrentMonth}
							isSelected={isSelected}
							isCurrentDay={isCurrentDay}
						/>
					);
				})}
			</div>
		);
	};

	const renderWeekView = () => {
		const weekStart = startOfWeek(selectedDate || new Date());
		const weekEnd = endOfWeek(selectedDate || new Date());
		const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

		return (
			<div className="grid grid-cols-7 gap-1">
				{/* Day headers */}
				{days.map((day) => (
					<div
						key={day.toISOString()}
						className="p-3 text-center text-sm font-medium text-slate-600 bg-slate-50"
					>
						<div>{format(day, "EEE")}</div>
						<div className="text-lg font-bold">{format(day, "d")}</div>
					</div>
				))}

				{/* Day content */}
				{days.map((day) => {
					const dayEvents = normalizedEvents.filter(
						(event) => event.date && isSameDay(new Date(event.date), day),
					);
					const isSelected = selectedDate && isSameDay(day, selectedDate);
					const isCurrentDay = isToday(day);

					return (
						<div
							key={day.toISOString()}
							className={cn(
								"min-h-[200px] p-2 border border-slate-200 cursor-pointer transition-colors",
								isSelected && "bg-blue-50 border-blue-300",
								isCurrentDay && "bg-blue-100",
							)}
							onClick={() => handleDateSelect(day)}
						>
							<div className="space-y-1">
								{dayEvents.map((event) => {
									const config = getEventTypeConfig(event.type);
									return (
										<div
											key={event.id}
											className={cn(
												"text-xs p-2 rounded cursor-pointer",
												config.color,
											)}
											onClick={(e) => {
												e.stopPropagation();
												handleEventClick(event);
											}}
										>
											<div className="flex items-center gap-1 mb-1">
												<div className="font-medium flex-1">{event.title}</div>
												{isOutlookEvent(event) && (
													<CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0" />
												)}
											</div>
											{event.startTime && (
												<div className="text-xs opacity-75">
													{event.startTime}
												</div>
											)}
											{event.approvalStatus === "pending" && (
												<Badge
													variant="outline"
													className="mt-1 text-[10px] uppercase"
												>
													Pending
												</Badge>
											)}
										</div>
									);
								})}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<>
			{/* Expand Button */}
			<Button
				type="button"
				variant="outline"
				onClick={() => setIsExpanded(true)}
				className={cn(
					"flex h-auto shrink-0 items-center justify-center gap-1.5 border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-none transition-colors duration-200 hover:bg-slate-50 sm:text-[12.5px]",
					triggerClassName,
				)}
				title="Expand calendar"
			>
				<Expand className="h-3.5 w-3.5" />
				{showExpandLabel && "Expand"}
			</Button>

			{/* Expanded Calendar Modal */}
			<Dialog open={isExpanded} onOpenChange={setIsExpanded}>
				<DialogContent className="w-[calc(100%-1.5rem)] sm:w-full max-w-5xl max-sm:inset-2 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:left-2 max-sm:top-2 max-sm:h-[calc(100vh-1rem)] h-[90vh] p-0">
					<DialogHeader className="sr-only">
						<DialogTitle>Expanded Calendar View</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col h-full">
						{/* Header */}
						<div className="flex items-center justify-between p-6 border-b bg-white">
							<div className="flex items-center space-x-4">
								<h2 className="text-2xl font-bold sidebar-gradient-text">
									Calendar
								</h2>
								<div className="flex items-center space-x-2">
									<Button
										size="sm"
										variant="ghost"
										onClick={() =>
											handleMonthChange(subMonths(currentMonth, 1))
										}
										className="h-8 w-8 p-0 hover:bg-slate-100"
									>
										<ChevronLeft className="h-4 w-4" />
									</Button>
									<Button
										size="sm"
										variant="ghost"
										onClick={() =>
											handleMonthChange(addMonths(currentMonth, 1))
										}
										className="h-8 w-8 p-0 hover:bg-slate-100"
									>
										<ChevronRight className="h-4 w-4" />
									</Button>
								</div>
								<div className="text-lg font-medium">
									{format(currentMonth, "MMMM yyyy")}
								</div>
								<Button
									size="sm"
									variant="outline"
									onClick={() => {
										setCurrentMonth(new Date());
										setSelectedDate(new Date());
									}}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
								>
									Today
								</Button>
							</div>

							<div className="flex items-center space-x-2">
								<Tabs
									value={viewMode}
									onValueChange={(value) =>
										setViewMode(value as "month" | "week")
									}
								>
									<TabsList>
										<TabsTrigger
											value="month"
											className="flex items-center space-x-2"
										>
											<Grid3X3 className="h-4 w-4" />
											<span>Month</span>
										</TabsTrigger>
										<TabsTrigger
											value="week"
											className="flex items-center space-x-2"
										>
											<CalendarDays className="h-4 w-4" />
											<span>Week</span>
										</TabsTrigger>
									</TabsList>
								</Tabs>

								<Button
									size="sm"
									variant="outline"
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
								>
									<Filter className="h-4 w-4" />
									Filter
								</Button>

								<Button
									size="sm"
									variant="outline"
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
								>
									<Share2 className="h-4 w-4" />
									Share
								</Button>

								<Button
									size="sm"
									variant="outline"
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
								>
									<Printer className="h-4 w-4" />
									Print
								</Button>

								{/* Outlook Status and Controls */}
								{outlookConnected && (
									<div className="flex items-center gap-2">
										<div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
											<CheckCircle className="h-3 w-3" />
											<span>Outlook</span>
										</div>
										<Button
											size="sm"
											variant="outline"
											onClick={handleSync}
											disabled={syncing}
											className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
										>
											{syncing ? (
												<>
													<Loader2 className="h-4 w-4 animate-spin" />{" "}
													Syncing...
												</>
											) : (
												<>
													<RefreshCw className="h-4 w-4" /> Sync
												</>
											)}
										</Button>
									</div>
								)}

								{/* Settings Button */}
								<Button
									size="sm"
									variant="outline"
									className="border border-white/40 bg-white/30 text-slate-700 shadow-md backdrop-blur hover:bg-white/40"
									onClick={() => setShowSettings(true)}
								>
									<Settings className="h-4 w-4" />
									Settings
								</Button>
								<AppDialog
									open={showSettings}
									onOpenChange={setShowSettings}
									size="form"
									className="max-h-[80vh]"
									icon={<Settings className="h-5 w-5" />}
									title="Calendar Settings"
								>
									{showSettings ? (
										<CalendarSettings
											userId={user?.$id || ""}
											onClose={() => setShowSettings(false)}
										/>
									) : null}
								</AppDialog>

								<Button
									onClick={() => canCreateEvent && setIsAddEventOpen(true)}
									disabled={!canCreateEvent}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
								>
									<Plus className="h-4 w-4" />
									New Event
								</Button>
							</div>
						</div>

						{isApprover && (
							<div className="border-b border-white/40 bg-gradient-to-r from-slate-50/85 to-white/90 px-6 py-5 shadow-sm backdrop-blur-sm">
								<div className="flex items-center justify-between mb-1">
									<div className="flex items-center gap-3">
										<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100">
											<FileCheck className="h-4 w-4 text-blue-600" />
										</div>
										<div>
											<h3 className="text-base font-semibold text-slate-700">
												Pending Approvals
											</h3>
											<p className="text-xs font-medium text-slate-600 mt-0.5">
												{approvalsLoading ? (
													<span className="flex items-center gap-1.5">
														<Loader2 className="h-3 w-3 animate-spin" />
														Loading approvals...
													</span>
												) : approvals.length > 0 ? (
													<span className="flex items-center gap-1.5">
														<AlertCircle className="h-3 w-3 text-amber-500" />
														{approvals.length}{" "}
														{approvals.length === 1 ? "request" : "requests"}{" "}
														awaiting your review
													</span>
												) : (
													<span className="flex items-center gap-1.5 text-green-600">
														<CheckCircle2 className="h-3 w-3" />
														All caught up
													</span>
												)}
											</p>
										</div>
									</div>
									<button
										onClick={() => setIsApprovalsExpanded(!isApprovalsExpanded)}
										className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
										aria-expanded={isApprovalsExpanded}
										aria-label={
											isApprovalsExpanded
												? "Collapse approvals"
												: "Expand approvals"
										}
									>
										{isApprovalsExpanded ? (
											<ChevronUp className="h-5 w-5 text-slate-600 group-hover:text-slate-700 transition-colors" />
										) : (
											<ChevronDown className="h-5 w-5 text-slate-600 group-hover:text-slate-700 transition-colors" />
										)}
									</button>
								</div>
								{isApprovalsExpanded && (
									<div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
										{!approvalsLoading &&
											approvals.length > 0 &&
											approvals.map((approval: CalendarApprovalRequest) => {
												const summary =
													(approval.changeSummary as CalendarApprovalChangeSummary) ||
													{};
												const after = (summary.after || {}) as Record<
													string,
													unknown
												>;
												const before = (summary.before || {}) as Record<
													string,
													unknown
												>;
												const title =
													(after.title as string) ||
													(before.title as string) ||
													"Untitled Event";
												const sensitivityLevel =
													(after.sensitivityLevel as CalendarSensitivity) ||
													approval.sensitivityLevel ||
													"standard";
												const submittedTime = approval.submittedAt
													? new Date(approval.submittedAt)
													: null;
												const timeAgo = submittedTime
													? formatDistanceToNow(submittedTime, {
															addSuffix: true,
														})
													: "recently";

												// Icon and color based on change type
												const getChangeTypeConfig = (
													type: string,
												): {
													icon: React.ReactNode;
													color: string;
													bgColor: string;
												} => {
													switch (type) {
														case "create":
															return {
																icon: <Plus className="h-4 w-4" />,
																color: "text-green-600",
																bgColor: "bg-green-50",
															};
														case "update":
															return {
																icon: <Edit className="h-4 w-4" />,
																color: "text-blue-600",
																bgColor: "bg-blue-50",
															};
														case "cancel":
															return {
																icon: <XCircle className="h-4 w-4" />,
																color: "text-red-600",
																bgColor: "bg-red-50",
															};
														default:
															return {
																icon: <FileCheck className="h-4 w-4" />,
																color: "text-slate-600",
																bgColor: "bg-slate-50",
															};
													}
												};

												const changeTypeConfig = getChangeTypeConfig(
													approval.changeType,
												);

												return (
													<div
														key={approval.$id}
														className="group relative rounded-lg border border-slate-200 bg-white px-4 py-3.5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 cursor-pointer"
														onClick={() => {
															setSelectedApproval(approval);
															setIsApprovalDialogOpen(true);
															setReviewerNotes("");
														}}
													>
														<div className="flex items-start gap-3">
															<div
																className={cn(
																	"flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0",
																	changeTypeConfig.bgColor,
																)}
															>
																<div className={changeTypeConfig.color}>
																	{changeTypeConfig.icon}
																</div>
															</div>
															<div className="flex-1 min-w-0">
																<div className="flex items-start justify-between gap-2 mb-1.5">
																	<h4 className="text-sm font-semibold text-slate-700 line-clamp-1 group-hover:text-blue-600 transition-colors">
																		{title}
																	</h4>
																	<div className="flex items-center gap-2 flex-shrink-0">
																		<Badge
																			variant="outline"
																			className="text-[10px] px-2 py-0.5 uppercase tracking-wide border-slate-300 text-slate-700"
																		>
																			{approval.changeType}
																		</Badge>
																		{sensitivityLevel !== "standard" && (
																			<Badge
																				className={cn(
																					"text-[10px] px-2 py-0.5 border hover:opacity-100",
																					getSensitivityBadgeClasses(
																						sensitivityLevel,
																					),
																				)}
																			>
																				{SENSITIVITY_LABELS[sensitivityLevel]}
																			</Badge>
																		)}
																	</div>
																</div>
																<div className="flex items-center gap-3 text-xs text-slate-500">
																	<span className="flex items-center gap-1.5">
																		<Clock className="h-3 w-3" />
																		{timeAgo}
																	</span>
																	{submittedTime && (
																		<span className="text-slate-400">
																			{formatInTimezone(
																				submittedTime,
																				"MMM d, h:mm a",
																				timeZone,
																			)}
																		</span>
																	)}
																</div>
															</div>
														</div>
													</div>
												);
											})}
										{!approvalsLoading && approvals.length === 0 && (
											<div className="flex flex-col items-center justify-center py-8 px-4 text-center">
												<div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
													<CheckCircle2 className="h-6 w-6 text-green-600" />
												</div>
												<p className="text-sm font-medium text-slate-700 mb-1">
													All caught up
												</p>
												<p className="text-xs text-slate-500">
													No pending approval requests at this time
												</p>
											</div>
										)}
										{approvalsLoading && (
											<div className="flex items-center justify-center py-8">
												<div className="flex items-center gap-2 text-sm text-slate-500">
													<Loader2 className="h-4 w-4 animate-spin" />
													<span>Loading approval requests...</span>
												</div>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* Calendar Content */}
						<div className="flex-1 p-2 overflow-auto">
							{viewMode === "month" ? renderMonthView() : renderWeekView()}
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Approval Review Dialog */}
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
			<AppDialog
				open={isAddEventOpen}
				onOpenChange={setIsAddEventOpen}
				size="form"
				icon={<CalendarPlus className="h-5 w-5" />}
				title="Create New Event"
				pending={creatingEvent}
				footer={
					<>
						<Button
							type="button"
							variant="outline"
							className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							onClick={() => setIsAddEventOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							className="btn-primary"
							onClick={handleAddEvent}
							disabled={
								!newEvent.title.trim() || creatingEvent || !canCreateEvent
							}
						>
							<Plus className="h-4 w-4" />
							{creatingEvent ? "Creating..." : "Create Event"}
						</Button>
					</>
				}
			>
					<div className="space-y-4 pb-1">
						<div>
							<Label
								htmlFor="title"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Event Title
							</Label>
							<Input
								id="title"
								value={newEvent.title}
								onChange={(e) =>
									setNewEvent({ ...newEvent, title: e.target.value })
								}
								placeholder="Enter event title"
								className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
							/>
						</div>

						<div>
							<Label
								htmlFor="date"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Date
							</Label>
							<CaalmDatePicker
								id="date"
								value={newEvent.date ? toIsoDateLocal(newEvent.date) : ""}
								placeholder="Select date"
								className="bg-white/30 backdrop-blur border-white/40 shadow-md"
								onChange={(iso) => {
									const next = parseIsoDateLocal(iso);
									if (!next) return;
									setNewEvent({ ...newEvent, date: next });
								}}
							/>
						</div>

						<div>
							<Label
								htmlFor="type"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Event Type
							</Label>
							<Select
								value={newEvent.type}
								onValueChange={(value: string) =>
									setNewEvent({
										...newEvent,
										type: value as NewEventForm["type"],
									})
								}
							>
								<SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="meeting">Meeting</SelectItem>
									<SelectItem value="contract">Contract</SelectItem>
									<SelectItem value="deadline">Deadline</SelectItem>
									<SelectItem value="review">Review</SelectItem>
									<SelectItem value="audit">Audit</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label
									htmlFor="startTime"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									Start Time
								</Label>
								<Input
									id="startTime"
									type="time"
									value={newEvent.startTime}
									onChange={(e) =>
										setNewEvent({ ...newEvent, startTime: e.target.value })
									}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
								/>
							</div>
							<div>
								<Label
									htmlFor="endTime"
									className="block text-sm font-medium text-slate-700 mb-1"
								>
									End Time
								</Label>
								<Input
									id="endTime"
									type="time"
									value={newEvent.endTime}
									onChange={(e) =>
										setNewEvent({ ...newEvent, endTime: e.target.value })
									}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
								/>
							</div>
						</div>

						<div>
							<Label
								htmlFor="description"
								className="block text-sm font-medium text-slate-700 mb-1"
							>
								Description
							</Label>
							<Textarea
								id="description"
								value={newEvent.description}
								onChange={(e) =>
									setNewEvent({ ...newEvent, description: e.target.value })
								}
								placeholder="Enter event description"
								rows={3}
								className="bg-white/30 backdrop-blur border border-white/40 shadow-md"
							/>
						</div>

						<div>
							<Label className="block text-sm font-medium text-slate-700 mb-1">
								Sensitivity
							</Label>
							<Select
								value={newEvent.sensitivityLevel}
								onValueChange={(value: string) =>
									setNewEvent({
										...newEvent,
										sensitivityLevel: value as CalendarSensitivity,
									})
								}
							>
								<SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="standard">
										<div className="flex flex-col">
											<span className="text-sm font-medium">Standard</span>
											<span className="text-xs text-slate-500">
												Visible immediately, no approval needed.
											</span>
										</div>
									</SelectItem>
									<SelectItem value="restricted">
										<div className="flex flex-col">
											<span className="text-sm font-medium">Restricted</span>
											<span className="text-xs text-slate-500">
												Requires approval before publishing.
											</span>
										</div>
									</SelectItem>
									<SelectItem value="confidential">
										<div className="flex flex-col">
											<span className="text-sm font-medium">Confidential</span>
											<span className="text-xs text-slate-500">
												Approval required, sensitive details hidden until
												approved.
											</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
							{newEvent.sensitivityLevel !== "standard" && (
								<p className="mt-2 text-xs text-slate-500">
									This event will remain hidden until an approver approves it.
								</p>
							)}
						</div>

					</div>
			</AppDialog>

			{/* Event Detail Dialog */}
			<Dialog
				open={!!selectedEvent}
				onOpenChange={() => setSelectedEvent(null)}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between">
							<span>Event Details</span>
							<div className="flex space-x-2">
								<Button
									size="sm"
									variant="outline"
									onClick={() => setIsShareOpen(true)}
									disabled={
										selectedEventPermissions
											? !selectedEventPermissions.manageParticipants
											: false
									}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
									title={
										selectedEventPermissions &&
										!selectedEventPermissions.manageParticipants
											? "You do not have permission to manage participants"
											: undefined
									}
								>
									<Share2 className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={
										!canCreateEvent ||
										(selectedEventPermissions
											? !selectedEventPermissions.updateEvent
											: false)
									}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
									title={
										!canCreateEvent ||
										(selectedEventPermissions &&
											!selectedEventPermissions.updateEvent)
											? "You do not have permission to edit this event"
											: undefined
									}
								>
									<Edit className="h-4 w-4" />
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={
										!canCreateEvent ||
										(selectedEventPermissions
											? !selectedEventPermissions.cancelEvent
											: false)
									}
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40 disabled:opacity-50"
									title={
										!canCreateEvent ||
										(selectedEventPermissions &&
											!selectedEventPermissions.cancelEvent)
											? "You do not have permission to cancel this event"
											: undefined
									}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</DialogTitle>
					</DialogHeader>
					{selectedEvent && (
						<div className="space-y-4">
							<div>
								<h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
								<Badge
									className={cn(
										"mt-2",
										getEventTypeConfig(selectedEvent.type).color,
									)}
								>
									{selectedEvent.type}
								</Badge>
								{selectedEvent.sensitivityLevel && (
									<Badge variant="outline" className="ml-2">
										{SENSITIVITY_LABELS[selectedEvent.sensitivityLevel]}
									</Badge>
								)}
								{selectedEvent.approvalStatus &&
									selectedEvent.approvalStatus !== "not_required" && (
										<Badge
											variant={
												selectedEvent.approvalStatus === "approved"
													? "secondary"
													: "outline"
											}
											className="ml-2 uppercase"
										>
											{selectedEvent.approvalStatus.replace("_", " ")}
										</Badge>
									)}
								{selectedEvent.approvalStatus === "pending" && (
									<p className="mt-2 text-xs text-amber-600">
										Awaiting approval; editing is limited until a decision is
										made.
									</p>
								)}
							</div>

							{/* Enhanced Reviewer Notes Section */}
							{(selectedEvent.approvalStatus === "changes_requested" ||
								selectedEvent.approvalStatus === "rejected") && (
								<div className="mt-4">
									{loadingApprovalRequest ? (
										<div className="rounded-lg p-4 border bg-slate-50 border-slate-200">
											<div className="flex items-center gap-2">
												<Loader2 className="w-4 h-4 animate-spin text-slate-500" />
												<span className="text-sm text-slate-600">
													Loading reviewer feedback...
												</span>
											</div>
										</div>
									) : eventApprovalRequest?.reviewerNotes ? (
										<div
											className={cn(
												"rounded-lg p-4 border shadow-sm",
												selectedEvent.approvalStatus === "changes_requested"
													? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300"
													: "bg-gradient-to-br from-red-50 to-pink-50 border-red-300",
											)}
										>
											<div className="flex items-start gap-3 mb-3">
												<div
													className={cn(
														"flex items-center justify-center w-10 h-10 rounded-lg",
														selectedEvent.approvalStatus === "changes_requested"
															? "bg-amber-100"
															: "bg-red-100",
													)}
												>
													{selectedEvent.approvalStatus ===
													"changes_requested" ? (
														<MessageSquare className="w-5 h-5 text-amber-700" />
													) : (
														<AlertCircle className="w-5 h-5 text-red-700" />
													)}
												</div>
												<div className="flex-1">
													<h4
														className={cn(
															"text-sm font-semibold mb-1",
															selectedEvent.approvalStatus ===
																"changes_requested"
																? "text-amber-900"
																: "text-red-900",
														)}
													>
														{selectedEvent.approvalStatus ===
														"changes_requested"
															? "Reviewer Feedback - Changes Requested"
															: "Reviewer Feedback - Request Denied"}
													</h4>
													{eventApprovalRequest.decidedAt && (
														<p
															className={cn(
																"text-xs",
																selectedEvent.approvalStatus ===
																	"changes_requested"
																	? "text-amber-600"
																	: "text-red-600",
															)}
														>
															Reviewed on{" "}
															{formatInTimezone(
																new Date(eventApprovalRequest.decidedAt),
																"MMM d, yyyy h:mm a",
																timeZone,
															)}
														</p>
													)}
												</div>
											</div>
											<div
												className={cn(
													"rounded-md p-3 bg-white border",
													selectedEvent.approvalStatus === "changes_requested"
														? "border-amber-200"
														: "border-red-200",
												)}
											>
												<p
													className={cn(
														"text-sm whitespace-pre-wrap leading-relaxed",
														selectedEvent.approvalStatus === "changes_requested"
															? "text-amber-900"
															: "text-red-900",
													)}
												>
													{eventApprovalRequest.reviewerNotes}
												</p>
											</div>
											{selectedEvent.approvalStatus === "changes_requested" && (
												<div className="mt-3 pt-3 border-t border-amber-200">
													<p className="text-xs text-amber-700">
														<strong>Next steps:</strong> Please review the
														feedback above and make the requested changes. Once
														updated, your event will be resubmitted for
														approval.
													</p>
												</div>
											)}
										</div>
									) : (
										<div className="rounded-lg p-4 border bg-slate-50 border-slate-200">
											<p className="text-sm text-slate-600">
												{selectedEvent.approvalStatus === "changes_requested"
													? "No specific feedback provided. Please review your event details and resubmit."
													: "No denial reason provided."}
											</p>
										</div>
									)}
								</div>
							)}

							{selectedEvent.date && (
								<div className="flex items-center space-x-2 text-sm text-slate-600">
									<CalendarIcon className="h-4 w-4" />
									<span>
										{format(new Date(selectedEvent.date), "EEEE, MMMM d, yyyy")}
									</span>
								</div>
							)}

							{selectedEvent.startTime && selectedEvent.endTime && (
								<div className="flex items-center space-x-2 text-sm text-slate-600">
									<Clock className="h-4 w-4" />
									<span>
										{selectedEvent.startTime} - {selectedEvent.endTime}
									</span>
								</div>
							)}

							{selectedEvent.description && (
								<div>
									<h4 className="font-medium text-sm text-slate-700 mb-1">
										Description
									</h4>
									<p className="text-sm text-slate-600">
										{selectedEvent.description}
									</p>
								</div>
							)}

							{selectedEvent.contractName && (
								<div>
									<h4 className="font-medium text-sm text-slate-700 mb-1">
										Contract
									</h4>
									<p className="text-sm text-slate-600">
										{selectedEvent.contractName}
									</p>
								</div>
							)}

							{selectedEvent.amount && (
								<div>
									<h4 className="font-medium text-sm text-slate-700 mb-1">
										Amount
									</h4>
									<p className="text-sm text-slate-600">
										{selectedEvent.amount}
									</p>
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>

			{/* Share Dialog */}
			<Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Share Event</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label className="block text-sm font-medium text-slate-700 mb-1">
								Share with users
							</Label>
							<div className="flex space-x-2">
								<Input
									placeholder="Search users..."
									className="flex-1 bg-white/30 backdrop-blur border border-white/40 shadow-md"
								/>
								<Button
									size="sm"
									className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
								>
									<UserPlus className="h-4 w-4" />
								</Button>
							</div>
						</div>

						<div>
							<Label className="block text-sm font-medium text-slate-700 mb-1">
								Permissions
							</Label>
							<Select
								value={shareSettings.permissions}
								onValueChange={(value: "view" | "edit") =>
									setShareSettings({ ...shareSettings, permissions: value })
								}
							>
								<SelectTrigger className="bg-white/30 backdrop-blur border border-white/40 shadow-md">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="view">
										<div className="flex items-center space-x-2">
											<Eye className="h-4 w-4" />
											<span>View only</span>
										</div>
									</SelectItem>
									<SelectItem value="edit">
										<div className="flex items-center space-x-2">
											<Edit className="h-4 w-4" />
											<span>Can edit</span>
										</div>
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								onClick={handleShare}
								className="flex-1 bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
							>
								<Link className="h-4 w-4" />
								Generate Link
							</Button>
						</div>

						<div className="flex justify-end space-x-2">
							<Button
								onClick={handleShare}
								className="bg-white/30 backdrop-blur border border-white/40 shadow-md text-slate-700 hover:bg-white/40"
							>
								Share
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ExpandedCalendarView;
