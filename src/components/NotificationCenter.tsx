import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	AlertTriangle,
	Bell,
	Calendar,
	Check,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	GripVertical,
	Info,
	Search,
	Settings,
	Share2,
	Shield,
	Trash2,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { Fragment, useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { isFileShareNotification } from "@/lib/files/fileShareNotification";
import { formatInTimezone } from "@/lib/timezone";
import { GmailActionTooltip } from "@/components/gmail/GmailActionTooltip";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import NotificationSettings from "./NotificationSettings";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { pageCountFromItems, showingRangeText } from "./ui/page-index";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Separator } from "./ui/separator";

interface Notification {
	$id: string;
	userId: string;
	title: string;
	message: string;
	type: string;
	read: boolean;
	priority?: "low" | "medium" | "high" | "urgent";
	actionUrl?: string;
	actionText?: string;
	metadata?: string | Record<string, unknown> | null;
	$createdAt: string;
	$updatedAt: string;
}

// Enhanced notification type constants
const NOTIFICATION_TYPES = {
	"contract-expiry": {
		label: "Contract Expiry",
		icon: <Calendar className="w-4 h-4" />,
		color: "bg-red-100 text-red-800",
		bgColor: "bg-destructive/10 border-destructive/30",
		priority: "high" as const,
	},
	"contract-renewal": {
		label: "Contract Renewal",
		icon: <Clock className="w-4 h-4" />,
		color: "bg-orange-100 text-orange-800",
		bgColor: "bg-orange-50/30 border-orange-400",
		priority: "medium" as const,
	},
	"audit-due": {
		label: "Audit Due",
		icon: <Shield className="w-4 h-4" />,
		color: "bg-purple-100 text-purple-800",
		bgColor: "bg-purple-50/30 border-purple-400",
		priority: "high" as const,
	},
	"compliance-alert": {
		label: "Compliance Alert",
		icon: <AlertTriangle className="w-4 h-4" />,
		color: "bg-yellow-100 text-yellow-800",
		bgColor: "bg-yellow-50/30 border-yellow-400",
		priority: "urgent" as const,
	},
	"file-uploaded": {
		label: "File Uploaded",
		icon: <FileText className="w-4 h-4" />,
		color: "bg-blue-100 text-blue-800",
		bgColor: "bg-blue-50/30 border-blue-400",
		priority: "low" as const,
	},
	"user-invited": {
		label: "User Invited",
		icon: <Users className="w-4 h-4" />,
		color: "bg-green-100 text-green-800",
		bgColor: "bg-green-50/30 border-green-400",
		priority: "medium" as const,
	},
	"system-update": {
		label: "System Update",
		icon: <Zap className="w-4 h-4" />,
		color: "bg-indigo-100 text-indigo-800",
		bgColor: "bg-indigo-50/30 border-indigo-400",
		priority: "low" as const,
	},
	"performance-metric": {
		label: "Performance Metric",
		icon: <TrendingUp className="w-4 h-4" />,
		color: "bg-emerald-100 text-emerald-800",
		bgColor: "bg-emerald-50/30 border-emerald-400",
		priority: "medium" as const,
	},
	"deadline-approaching": {
		label: "Deadline Approaching",
		icon: <Clock className="w-4 h-4" />,
		color: "bg-pink-100 text-pink-800",
		bgColor: "bg-pink-50/30 border-pink-400",
		priority: "high" as const,
	},
	"obligation-reminder": {
		label: "Obligation reminder",
		icon: <Clock className="w-4 h-4" />,
		color: "bg-blue-100 text-blue-800",
		bgColor: "bg-blue-50/30 border-blue-400",
		priority: "high" as const,
	},
	"task-completed": {
		label: "Task Completed",
		icon: <CheckCircle className="w-4 h-4" />,
		color: "bg-teal-100 text-teal-800",
		bgColor: "bg-teal-50/30 border-teal-400",
		priority: "low" as const,
	},
	"task-assigned": {
		label: "Task Assigned",
		icon: <CheckCircle className="w-4 h-4" />,
		color: "bg-indigo-100 text-indigo-800",
		bgColor: "bg-indigo-50/30 border-indigo-400",
		priority: "high" as const,
	},
	"contract-deleted": {
		label: "Contract Deleted",
		icon: <Trash2 className="w-4 h-4" />,
		color: "bg-red-100 text-red-800",
		bgColor: "bg-destructive/10 border-destructive/30",
		priority: "high" as const,
	},
	"license-deleted": {
		label: "License Deleted",
		icon: <Trash2 className="w-4 h-4" />,
		color: "bg-red-100 text-red-800",
		bgColor: "bg-destructive/10 border-destructive/30",
		priority: "high" as const,
	},
	info: {
		label: "Information",
		icon: <Info className="w-4 h-4" />,
		color: "bg-gray-100 text-gray-800",
		bgColor: "bg-gray-50/30 border-gray-400",
		priority: "low" as const,
	},
	calendar_shared: {
		label: "Calendar Shared",
		icon: <Share2 className="w-4 h-4" />,
		color: "bg-blue-100 text-blue-800",
		bgColor: "bg-blue-50/30 border-blue-400",
		priority: "medium" as const,
	},
} as const;

type NotificationType = keyof typeof NOTIFICATION_TYPES;

type NotificationTypeConfig = {
	label: string;
	icon: React.ReactNode;
	color: string;
	bgColor: string;
	priority: "low" | "medium" | "high" | "urgent";
};

function humanizeNotificationType(type: string): string {
	return type
		.split(/[-_]/g)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function getNotificationTypeConfig(type: string): NotificationTypeConfig {
	if (type in NOTIFICATION_TYPES) {
		const known = NOTIFICATION_TYPES[type as NotificationType];
		return {
			label: known.label,
			icon: known.icon,
			color: known.color,
			bgColor: known.bgColor,
			priority: known.priority,
		};
	}
	return {
		label: humanizeNotificationType(type),
		icon: <Info className="w-4 h-4" />,
		color: "bg-slate-100 text-slate-700 border-slate-200",
		bgColor: "bg-slate-50/30 border-slate-300",
		priority: "low",
	};
}

function getTypeIconShell(type: string): string {
	switch (type) {
		case "compliance-alert":
		case "contract-deleted":
		case "license-deleted":
		case "contract-expiry":
			return "bg-red/10 text-red";
		case "contract-renewal":
		case "deadline-approaching":
		case "obligation-reminder":
			return "bg-orange/10 text-orange";
		case "task-completed":
			return "bg-orange/10 text-orange";
		case "audit-due":
			return "bg-purple/10 text-purple-600";
		case "user-invited":
		case "performance-metric":
			return "bg-green/10 text-green";
		default:
			return "bg-blue/10 text-[#0f5384]";
	}
}

function resolveNotificationLink(
	notification: Notification,
): { url: string; text: string } | null {
	if (notification.actionUrl?.trim()) {
		return {
			url: notification.actionUrl.trim(),
			text: notification.actionText?.trim() || "View details",
		};
	}
	if (isFileShareNotification(notification)) {
		try {
			const meta =
				typeof notification.metadata === "string"
					? JSON.parse(notification.metadata)
					: notification.metadata;
			const fileId =
				meta && typeof meta === "object" && "fileId" in meta
					? String((meta as { fileId?: string }).fileId || "")
					: "";
			if (fileId) {
				return { url: `/shared/files/${fileId}`, text: "View Document" };
			}
		} catch {
			/* ignore */
		}
	}
	try {
		const meta =
			typeof notification.metadata === "string"
				? JSON.parse(notification.metadata)
				: notification.metadata;
		if (meta && typeof meta === "object" && "actionUrl" in meta) {
			const url = String(
				(meta as { actionUrl?: string }).actionUrl || "",
			).trim();
			if (url) {
				return {
					url,
					text:
						String((meta as { actionText?: string }).actionText || "").trim() ||
						"View details",
				};
			}
		}
	} catch {
		/* ignore */
	}
	return null;
}

function getPriorityCapClass(priority?: string): string {
	switch (priority) {
		case "urgent":
			return "border-l-red-500";
		case "high":
			return "border-l-orange-500";
		case "medium":
			return "border-l-amber-400";
		case "low":
			return "border-l-blue-400";
		default:
			return "border-l-slate-300";
	}
}

interface NotificationCenterProps {
	open: boolean;
	onClose: () => void;
	onRefresh?: () => void;
	userId?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
	open,
	onClose,
	onRefresh,
	userId,
}) => {
	const timeZone = useOrgTimezone();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(10);
	const [selected, setSelected] = useState<string[]>([]);
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("date");
	const [manualOrderIds, setManualOrderIds] = useState<string[] | null>(null);
	const [showSettings, setShowSettings] = useState(false);
	const [bulkMarkAction, setBulkMarkAction] = useState<"read" | "unread">(
		"read",
	);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();
	const router = useRouter();

	// Use SWR hook for notifications
	const {
		notifications,
		isLoading: loading,
		error: swrError,
		markAsRead,
		markAsUnread,
		markAllAsRead,
		deleteNotification,
		mutate,
	} = useNotifications(userId);

	// Refresh once when the dialog opens (not on every re-render while open)
	const prevOpenRef = React.useRef(false);
	React.useEffect(() => {
		if (open && !prevOpenRef.current) {
			void mutate();
			onRefresh?.();
		}
		prevOpenRef.current = open;
	}, [open, mutate, onRefresh]);

	// Set error state from SWR error
	React.useEffect(() => {
		if (swrError) {
			setError(swrError.message || "Failed to load notifications");
		} else {
			setError(null);
		}
	}, [swrError]);

	// Filter and sort notifications
	const filtered = useMemo(
		() =>
			notifications.filter((notification: Notification) => {
				const matchesSearch =
					notification.title.toLowerCase().includes(search.toLowerCase()) ||
					notification.message.toLowerCase().includes(search.toLowerCase());
				const matchesType =
					typeFilter === "all" || notification.type === typeFilter;
				const matchesStatus =
					statusFilter === "all" ||
					(statusFilter === "read" && notification.read === true) ||
					(statusFilter === "unread" && notification.read !== true);
				const matchesPriority =
					priorityFilter === "all" || notification.priority === priorityFilter;

				return matchesSearch && matchesType && matchesStatus && matchesPriority;
			}),
		[notifications, search, typeFilter, statusFilter, priorityFilter],
	);

	// Sort notifications
	const sorted = useMemo(() => {
		const next = [...filtered].sort((a, b) => {
			switch (sortBy) {
				case "date":
					return (
						new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
					);
				case "priority": {
					const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
					const aPriority =
						priorityOrder[
							(a.priority || "low") as keyof typeof priorityOrder
						] || 1;
					const bPriority =
						priorityOrder[
							(b.priority || "low") as keyof typeof priorityOrder
						] || 1;
					return bPriority - aPriority;
				}
				case "type":
					return a.type.localeCompare(b.type);
				default:
					return 0;
			}
		});
		return next;
	}, [filtered, sortBy]);

	const displayList = useMemo(() => {
		if (!manualOrderIds?.length) return sorted;
		const byId = new Map(sorted.map((n) => [n.$id, n]));
		const ordered = manualOrderIds
			.map((id) => byId.get(id))
			.flatMap((n) => (n ? [n] : []));
		const remaining = sorted.filter((n) => !manualOrderIds.includes(n.$id));
		return [...ordered, ...remaining];
	}, [sorted, manualOrderIds]);

	// Clear manual order when filters/sort change so Sort by works again
	useEffect(() => {
		setManualOrderIds(null);
	}, [sortBy, search, typeFilter, statusFilter, priorityFilter]);

	useEffect(() => {
		setPage(1);
	}, [search, typeFilter, statusFilter, priorityFilter, sortBy, perPage]);

	// Pagination
	const paginated = displayList.slice((page - 1) * perPage, page * perPage);

	const handleSelect = (id: string) => {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	};

	const handleMarkAsRead = async (ids: string[]) => {
		try {
			const unreadIds = ids.filter(
				(id) => notifications.find((n) => n.$id === id)?.read !== true,
			);
			await Promise.all(unreadIds.map((id) => markAsRead(id)));
			setSelected([]);
			toast({
				title: "Success",
				description: `Marked ${unreadIds.length || ids.length} notification${
					(unreadIds.length || ids.length) > 1 ? "s" : ""
				} as read`,
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to mark notifications as read",
				variant: "destructive",
			});
		}
	};

	const handleMarkAsUnread = async (ids: string[]) => {
		try {
			const readIds = ids.filter(
				(id) => notifications.find((n) => n.$id === id)?.read === true,
			);
			await Promise.all(readIds.map((id) => markAsUnread(id)));
			setSelected([]);
			toast({
				title: "Success",
				description: `Marked ${readIds.length || ids.length} notification${
					(readIds.length || ids.length) > 1 ? "s" : ""
				} as unread`,
			});
		} catch {
			toast({
				title: "Error",
				description: "Failed to mark notifications as unread",
				variant: "destructive",
			});
		}
	};

	const handleDeleteNotifications = async (ids: string[]) => {
		try {
			// Delete all notifications in parallel
			await Promise.all(ids.map((id) => deleteNotification(id)));
			setSelected([]);
			toast({
				title: "Success",
				description: `Deleted ${ids.length} notification${
					ids.length > 1 ? "s" : ""
				}`,
			});
			// Force immediate refresh - the deleteNotification function already handles revalidation
			// But also manually trigger mutate to ensure UI updates immediately
			mutate();
			onRefresh?.();
		} catch {
			toast({
				title: "Error",
				description: "Failed to delete notifications",
				variant: "destructive",
			});
			// Force revalidation on error to ensure UI is in sync
			mutate();
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await markAllAsRead();
			toast({
				title: "Success",
				description: "Marked all notifications as read",
			});
			onRefresh?.();
		} catch {
			toast({
				title: "Error",
				description: "Failed to mark all notifications as read",
				variant: "destructive",
			});
		}
	};

	const _handleMarkAllAsUnread = async () => {
		const readIds = notifications
			.filter((n: Notification) => n.read)
			.map((n: Notification) => n.$id);
		if (readIds.length > 0) {
			await handleMarkAsUnread(readIds);
		}
	};

	const getPriorityColor = (priority?: string) => {
		switch (priority) {
			case "urgent":
				return "text-red-600 bg-red-50 border-red-200";
			case "high":
				return "text-orange-600 bg-orange-50 border-orange-200";
			case "medium":
				return "text-yellow-600 bg-yellow-50 border-yellow-200";
			case "low":
				return "text-green-600 bg-green-50 border-green-200";
			default:
				return "text-gray-600 bg-gray-50 border-gray-200";
		}
	};

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = displayList.findIndex((n) => n.$id === active.id);
		const newIndex = displayList.findIndex((n) => n.$id === over.id);
		if (oldIndex < 0 || newIndex < 0) return;

		const reordered = arrayMove(displayList, oldIndex, newIndex);
		setManualOrderIds(reordered.map((n) => n.$id));

		toast({
			title: "Reordered",
			description: "Notification order updated",
		});
	};

	const handleActionNavigate = (url: string) => {
		onClose();
		router.push(url);
	};

	const unreadCount = notifications.filter(
		(n: Notification) => n.read !== true,
	).length;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent
				className="flex max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full max-w-[800px] flex-col overflow-hidden p-0 shadow-xl"
				data-testid="notification-center"
			>
				{/* Professional Cap */}
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{/* Header with gradient background */}
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center justify-between gap-3 px-6 pr-12">
						<div className="flex items-center gap-3">
							<Bell className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Notifications
							</DialogTitle>
						</div>
						<div className="flex items-center gap-2">
							{/* Button forces [&_svg]:size-4 — override so the gear bump is visible */}
							<button
								type="button"
								onClick={() => setShowSettings(true)}
								aria-label="Notification settings"
								className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-slate-700 transition-colors duration-200 hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								<Settings className="h-6 w-6 shrink-0" aria-hidden />
							</button>
						</div>
					</div>
					<p
						className="text-sm text-slate-600 mt-1 ml-14"
						data-testid="unread-count"
					>
						{unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
					</p>
					<DialogDescription className="sr-only">
						View and manage your notifications
					</DialogDescription>
				</div>

				{/* Scrollable Content */}
				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
					<div className="space-y-4">
						<div
							aria-hidden
							className="border-t border-slate-200"
							role="separator"
						/>

						{/* Search + Sort */}
						<div
							className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
							data-testid="notification-search-sort"
						>
							<div className="relative min-w-0 flex-1">
								<Search
									className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400"
									aria-hidden
								/>
								<Input
									placeholder="Search notifications..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									data-with-leading-icon="true"
									className="border-[0.25px] border-slate-200 bg-white text-slate-700 placeholder:text-slate-400"
								/>
							</div>
							<div
								className="flex shrink-0 items-center gap-2 md:justify-end"
								data-testid="sort-controls"
							>
								<span className="text-sm text-slate-600 whitespace-nowrap">
									Sort by:
								</span>
								<Select value={sortBy} onValueChange={setSortBy}>
									<SelectTrigger className="sort-select h-10 w-full min-w-[8rem] md:w-[210px] text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent className="sort-select-content">
										<SelectItem
											className="shad-select-item text-slate-700"
											value="date"
										>
											Date
										</SelectItem>
										<SelectItem
											className="shad-select-item text-slate-700"
											value="priority"
										>
											Priority
										</SelectItem>
										<SelectItem
											className="shad-select-item text-slate-700"
											value="type"
										>
											Type
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Type / status / priority filters */}
						<div
							className="grid grid-cols-1 gap-3 sm:grid-cols-3"
							data-testid="notification-filters"
						>
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger
									className="sort-select h-10 w-full sm:w-full"
									data-testid="type-filter"
								>
									<SelectValue placeholder="All Types" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem
										className="shad-select-item text-slate-700"
										value="all"
									>
										All Types
									</SelectItem>
									{Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
										<SelectItem
											key={key}
											className="shad-select-item text-slate-700"
											value={key}
										>
											<div className="flex items-center gap-2">
												{value.icon}
												<span className="text-slate-700">{value.label}</span>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="sort-select h-10 w-full sm:w-full">
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem
										className="shad-select-item text-slate-700"
										value="all"
									>
										All Status
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="unread"
									>
										Unread
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="read"
									>
										Read
									</SelectItem>
								</SelectContent>
							</Select>
							<Select value={priorityFilter} onValueChange={setPriorityFilter}>
								<SelectTrigger
									className="sort-select h-10 w-full sm:w-full"
									data-testid="priority-filter"
								>
									<SelectValue placeholder="All Priorities" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem
										className="shad-select-item text-slate-700"
										value="all"
									>
										All Priorities
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="urgent"
									>
										Urgent
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="high"
									>
										High
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="medium"
									>
										Medium
									</SelectItem>
									<SelectItem
										className="shad-select-item text-slate-700"
										value="low"
									>
										Low
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div
							aria-hidden
							className="border-b border-slate-200 pb-1"
							role="separator"
						/>

						{/* Bulk Actions */}
						{selected.length > 0 && (
							<div className="flex flex-wrap items-center justify-end gap-3">
								<SegmentedToggle
									value={bulkMarkAction}
									onChange={(value) => {
										setBulkMarkAction(value);
										if (value === "read") {
											handleMarkAsRead(selected);
										} else {
											handleMarkAsUnread(selected);
										}
									}}
									ariaLabel="Mark selected notifications"
									className="rounded-xl border-0 bg-slate-100 p-1"
									tabs={[
										{
											value: "read",
											label: "Mark as read",
											icon: Check,
											count: selected.length,
										},
										{
											value: "unread",
											label: "Mark as unread",
											icon: Check,
											count: selected.length,
										},
									]}
								/>
								<Button
									onClick={() => handleDeleteNotifications(selected)}
									disabled={loading}
									variant="outline"
									className="delete-btn px-3 sm:px-4"
								>
									<Trash2 className="h-4 w-4" />
									Delete ({selected.length})
								</Button>
							</div>
						)}

						{/* Enhanced Notifications List */}
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={paginated.map((n) => n.$id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2" data-testid="notification-list">
									{loading ? (
										<div className="text-center py-12 text-slate-500">
											<div className="w-8 h-8 mx-auto mb-3 animate-spin border-2 border-slate-300 border-t-[#0f5384] rounded-full"></div>
											<p className="text-sm font-medium">
												Loading notifications...
											</p>
										</div>
									) : error ? (
										<div
											className="text-center py-12"
											data-testid="error-message"
										>
											<div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
												<AlertTriangle className="w-6 h-6 text-red-600" />
											</div>
											<p className="text-lg font-semibold text-red-600 mb-1">
												Error loading notifications
											</p>
											<p className="text-sm text-red">{error}</p>
										</div>
									) : paginated.length === 0 ? (
										<div
											className="text-center py-12"
											data-testid="empty-state"
										>
											<div className="w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full flex items-center justify-center">
												<Bell className="w-6 h-6 text-blue-600" />
											</div>
											<p className="text-lg font-semibold text-slate-700 mb-1">
												No notifications found
											</p>
											<p className="text-sm text-slate-600">
												You&apos;re all caught up!
											</p>
										</div>
									) : (
										paginated.map((notification, index) => {
											const prevType =
												index > 0 ? paginated[index - 1]?.type : null;
											const showGroupHeader = notification.type !== prevType;
											const typeConfig = getNotificationTypeConfig(
												notification.type,
											);
											return (
												<Fragment key={notification.$id}>
													{showGroupHeader ? (
														<div
															className="flex items-center justify-between gap-3 pt-1 pb-0.5"
															data-testid="notification-type-group"
														>
															<div className="flex min-w-0 items-center gap-2">
																<div
																	className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getTypeIconShell(notification.type)}`}
																>
																	<span className="[&>svg]:h-4 [&>svg]:w-4">
																		{typeConfig.icon}
																	</span>
																</div>
																<span className="text-sm font-semibold text-slate-700">
																	{typeConfig.label}
																</span>
															</div>
															{/* Mark all only on the first type group; hide during bulk select */}
															{index === 0 && selected.length === 0 ? (
																<Button
																	size="sm"
																	onClick={handleMarkAllAsRead}
																	disabled={
																		!notifications.some(
																			(n: Notification) => !n.read,
																		)
																	}
																	className="btn-primary shrink-0 px-3 sm:px-4 text-sm"
																>
																	<Check className="w-4 h-4" />
																	Mark all read
																</Button>
															) : null}
														</div>
													) : null}
													<SortableNotificationItem
														notification={notification}
														isSelected={selected.includes(notification.$id)}
														onSelect={handleSelect}
														onMarkAsRead={(id) => handleMarkAsRead([id])}
														onMarkAsUnread={(id) => handleMarkAsUnread([id])}
														onActionNavigate={handleActionNavigate}
														typeConfig={typeConfig}
														getPriorityColor={getPriorityColor}
														timeZone={timeZone}
														iconShellClass={getTypeIconShell(notification.type)}
													/>
												</Fragment>
											);
										})
									)}
								</div>
							</SortableContext>
						</DndContext>
					</div>
				</div>

				{/* Footer pagination */}
				<div
					className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"
					data-testid="pagination"
				>
					<div className="flex items-center gap-2 text-xs text-slate-700">
						<span>Items per page:</span>
						<Select
							value={String(perPage)}
							onValueChange={(value) => setPerPage(Number(value))}
						>
							<SelectTrigger className="h-9 w-[4.5rem] border-[0.25px] border-slate-300 bg-white text-xs">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{[5, 10, 20, 50].map((n) => (
									<SelectItem key={n} value={String(n)} className="text-xs">
										{n}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<nav
						aria-label="Notifications pagination"
						className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-600"
					>
						<span>
							{showingRangeText(page, perPage, filtered.length, "items")}
						</span>
						<button
							type="button"
							className="inline-flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-[#0f5384] disabled:cursor-not-allowed disabled:text-slate-400"
							disabled={page <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							<ChevronLeft className="h-4 w-4" />
							Previous
						</button>
						<span className="text-slate-700">
							Page {page} of {pageCountFromItems(filtered.length, perPage)}
						</span>
						<button
							type="button"
							className="inline-flex items-center gap-1 bg-transparent p-0 text-xs font-medium text-slate-700 transition-colors duration-200 hover:text-[#0f5384] disabled:cursor-not-allowed disabled:text-slate-400"
							disabled={page >= pageCountFromItems(filtered.length, perPage)}
							onClick={() =>
								setPage((p) =>
									Math.min(pageCountFromItems(filtered.length, perPage), p + 1),
								)
							}
						>
							Next
							<ChevronRight className="h-4 w-4" />
						</button>
					</nav>
				</div>
			</DialogContent>

			<NotificationSettings
				open={showSettings}
				onClose={() => setShowSettings(false)}
				userId={userId}
			/>
		</Dialog>
	);
};

interface SortableNotificationItemProps {
	notification: Notification;
	isSelected: boolean;
	onSelect: (id: string) => void;
	onMarkAsRead: (id: string) => void;
	onMarkAsUnread: (id: string) => void;
	onActionNavigate: (url: string) => void;
	typeConfig: NotificationTypeConfig;
	getPriorityColor: (priority?: string) => string;
	timeZone: string;
	iconShellClass: string;
}

const SortableNotificationItem: React.FC<SortableNotificationItemProps> = ({
	notification,
	isSelected,
	onSelect,
	onMarkAsRead,
	onMarkAsUnread,
	onActionNavigate,
	typeConfig,
	getPriorityColor,
	timeZone,
	iconShellClass,
}) => {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: notification.$id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const pageLink = resolveNotificationLink(notification);
	const displayDate = formatInTimezone(
		new Date(notification.$createdAt),
		"MMM d, yyyy",
		timeZone,
	);
	const needsAction =
		Boolean(pageLink) ||
		/approval|action required|pending|overdue/i.test(notification.title);

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-testid="notification-item"
			data-read={notification.read.toString()}
			data-priority={notification.priority || "low"}
			data-date={notification.$createdAt}
			className={`rounded-lg border border-slate-200 bg-white pl-0 transition-all duration-200 group overflow-hidden ${
				notification.read
					? "hover:border-slate-300 hover:bg-slate-50/80"
					: "bg-blue-50/40 hover:border-blue-300 hover:bg-blue-50/70"
			} ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm hover:shadow-md"}`}
		>
			<div
				className={`flex border-l-4 ${getPriorityCapClass(notification.priority)}`}
			>
				<div className="flex flex-1 items-start gap-3 p-4 min-w-0">
					<div className="shrink-0 pt-0.5">
						<Checkbox
							checked={isSelected}
							onCheckedChange={() => onSelect(notification.$id)}
						/>
					</div>

					<div
						className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconShellClass}`}
					>
						{typeConfig?.icon ? (
							<span className="[&>svg]:h-5 [&>svg]:w-5">{typeConfig.icon}</span>
						) : (
							<Bell className="h-5 w-5" />
						)}
					</div>

					<div className="min-w-0 flex-1">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0 flex-1">
								{pageLink ? (
									<>
										<button
											type="button"
											onClick={() => onActionNavigate(pageLink.url)}
											className="text-left text-sm font-semibold text-[#12477d] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 rounded-sm"
										>
											{notification.title}
										</button>
										{!notification.read ? (
											<span className="inline-block mx-2 h-2 w-2 rounded-full bg-blue-500" />
										) : null}
									</>
								) : (
									<div className="flex items-center gap-2">
										<p className="text-sm font-semibold text-slate-800">
											{notification.title}
										</p>
										{!notification.read ? (
											<span className="inline-block mx-2 h-2 w-2 rounded-full bg-blue-500" />
										) : null}
									</div>
								)}
								<p className="mt-1 text-sm text-slate-600 line-clamp-2">
									{notification.message}
								</p>
							</div>

							<div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch min-h-[4.5rem]">
								{notification.priority ? (
									<span
										className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border capitalize ${getPriorityColor(
											notification.priority,
										)}`}
									>
										{notification.priority}
									</span>
								) : (
									<span aria-hidden className="h-5" />
								)}
							</div>
						</div>

						<div className="mt-2 flex flex-wrap justify-between items-center gap-2 text-xs text-slate-500">
							<div className="flex items-center gap-1">
								<Clock className="h-3 w-3" />
								<span>{displayDate}</span>
							</div>
							{needsAction ? (
								<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-orange/10 text-orange border-orange/20">
									Action needed
								</span>
							) : (
								<span
									className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${typeConfig.color}`}
								>
									{typeConfig.label}
								</span>
							)}
							<div className="flex items-center gap-1">
								{notification.read !== true ? (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onMarkAsRead(notification.$id)}
										className="h-7 px-2 text-xs font-medium text-[#0f5384] hover:text-[#12477d]"
									>
										Mark read
									</Button>
								) : (
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onMarkAsUnread(notification.$id)}
										className="h-7 px-2 text-xs font-medium text-[#0f5384] hover:text-[#12477d]"
									>
										Mark unread
									</Button>
								)}
							</div>
						</div>
						<Separator className="my-2" />
						{pageLink ? (
							<div className="mt-3 flex justify-between">
								<GmailActionTooltip label="Drag to reorder" side="top">
									<div
										{...attributes}
										{...listeners}
										className="cursor-grab active:cursor-grabbing rounded-md p-1 transition-colors hover:bg-slate-100"
									>
										<GripVertical className="h-6 w-6 text-slate-400 transition-colors group-hover:text-[#0f5384]" />
									</div>
								</GmailActionTooltip>
								<Button
									size="sm"
									onClick={() => onActionNavigate(pageLink.url)}
									className="primary-btn px-3 text-xs sm:px-4"
								>
									{pageLink.text}
								</Button>
							</div>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};

export default NotificationCenter;
