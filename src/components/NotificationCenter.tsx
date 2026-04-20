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
import React, { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

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
	"task-completed": {
		label: "Task Completed",
		icon: <CheckCircle className="w-4 h-4" />,
		color: "bg-teal-100 text-teal-800",
		bgColor: "bg-teal-50/30 border-teal-400",
		priority: "low" as const,
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
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [perPage, setPerPage] = useState(10);
	const [selected, setSelected] = useState<string[]>([]);
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [priorityFilter, setPriorityFilter] = useState<string>("all");
	const [sortBy, setSortBy] = useState<string>("date");
	const [showSettings, setShowSettings] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();

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

	// Set error state from SWR error
	React.useEffect(() => {
		if (swrError) {
			setError(swrError.message || "Failed to load notifications");
		} else {
			setError(null);
		}
	}, [swrError]);

	// Filter and sort notifications
	const filtered = notifications.filter((notification: Notification) => {
		const matchesSearch =
			notification.title.toLowerCase().includes(search.toLowerCase()) ||
			notification.message.toLowerCase().includes(search.toLowerCase());
		const matchesType =
			typeFilter === "all" || notification.type === typeFilter;
		const matchesStatus =
			statusFilter === "all" ||
			(statusFilter === "read" && notification.read) ||
			(statusFilter === "unread" && !notification.read);
		const matchesPriority =
			priorityFilter === "all" || notification.priority === priorityFilter;

		return matchesSearch && matchesType && matchesStatus && matchesPriority;
	});

	// Sort notifications
	const sorted = [...filtered].sort((a, b) => {
		switch (sortBy) {
			case "date":
				return (
					new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
				);
			case "priority": {
				const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
				const aPriority =
					priorityOrder[(a.priority || "low") as keyof typeof priorityOrder] ||
					1;
				const bPriority =
					priorityOrder[(b.priority || "low") as keyof typeof priorityOrder] ||
					1;
				return bPriority - aPriority;
			}
			case "type":
				return a.type.localeCompare(b.type);
			default:
				return 0;
		}
	});

	// Pagination
	const paginated = sorted.slice((page - 1) * perPage, page * perPage);

	const handleSelect = (id: string) => {
		setSelected((prev) =>
			prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
		);
	};

	const handleMarkAsRead = async (ids: string[]) => {
		try {
			await Promise.all(ids.map((id) => markAsRead(id)));
			setSelected([]);
			toast({
				title: "Success",
				description: `Marked ${ids.length} notification${
					ids.length > 1 ? "s" : ""
				} as read`,
			});
			onRefresh?.();
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
			await Promise.all(ids.map((id) => markAsUnread(id)));
			setSelected([]);
			toast({
				title: "Success",
				description: `Marked ${ids.length} notification${
					ids.length > 1 ? "s" : ""
				} as unread`,
			});
			onRefresh?.();
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

	const formatNotificationTime = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		if (diffInMinutes < 1) return "Just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		if (diffInHours < 24) return `${diffInHours}h ago`;
		if (diffInDays < 7) return `${diffInDays}d ago`;
		return date.toLocaleDateString();
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
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (active.id !== over?.id) {
			// Update the notifications order optimistically
			// Note: We can't do optimistic updates with the bound mutate function
			// from useNotifications, so we'll just revalidate
			mutate();

			toast({
				title: "Reordered",
				description: "Notification order updated",
			});
		}
	};

	const unreadCount = notifications.filter((n: Notification) => !n.read).length;

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogContent
				className="max-w-[800px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl"
				data-testid="notification-center"
			>
				{/* Professional Cap */}
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

				{/* Header with gradient background */}
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center justify-between px-6">
						<div className="flex items-center gap-3">
							<Bell className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Notifications
							</DialogTitle>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={handleMarkAllAsRead}
								disabled={!notifications.some((n: Notification) => !n.read)}
								className="text-sm"
							>
								<Check className="w-4 h-4 mr-1" />
								Mark all read
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowSettings(true)}
								className="text-sm"
							>
								<Settings className="w-4 h-4" />
							</Button>
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
						{/* Enhanced Search and Filter Bar */}
						<div className="flex gap-2" data-testid="notification-filters">
							<div className="relative flex-1">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
								<Input
									placeholder="Search notifications..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-10 bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400"
								/>
							</div>
							<Select value={typeFilter} onValueChange={setTypeFilter}>
								<SelectTrigger
									className="sort-select"
									data-testid="type-filter"
								>
									<SelectValue placeholder="All Types" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem className="shad-select-item" value="all">
										All Types
									</SelectItem>
									{Object.entries(NOTIFICATION_TYPES).map(([key, value]) => (
										<SelectItem
											key={key}
											className="shad-select-item"
											value={key}
										>
											<div className="flex items-center gap-2">
												{value.icon}
												{value.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={statusFilter} onValueChange={setStatusFilter}>
								<SelectTrigger className="sort-select">
									<SelectValue placeholder="All Status" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem className="shad-select-item" value="all">
										All Status
									</SelectItem>
									<SelectItem className="shad-select-item" value="unread">
										Unread
									</SelectItem>
									<SelectItem className="shad-select-item" value="read">
										Read
									</SelectItem>
								</SelectContent>
							</Select>
							<Select value={priorityFilter} onValueChange={setPriorityFilter}>
								<SelectTrigger
									className="sort-select"
									data-testid="priority-filter"
								>
									<SelectValue placeholder="All Priorities" />
								</SelectTrigger>
								<SelectContent className="sort-select-content">
									<SelectItem className="shad-select-item" value="all">
										All Priorities
									</SelectItem>
									<SelectItem className="shad-select-item" value="urgent">
										Urgent
									</SelectItem>
									<SelectItem className="shad-select-item" value="high">
										High
									</SelectItem>
									<SelectItem className="shad-select-item" value="medium">
										Medium
									</SelectItem>
									<SelectItem className="shad-select-item" value="low">
										Low
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Sort Options */}
						<div
							className="flex items-center gap-2"
							data-testid="sort-controls"
						>
							<span className="text-sm text-gray-600">Sort by:</span>
							<Select value={sortBy} onValueChange={setSortBy}>
								<SelectTrigger className="w-32 h-8 text-xs">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="date">Date</SelectItem>
									<SelectItem value="priority">Priority</SelectItem>
									<SelectItem value="type">Type</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Bulk Actions */}
						{selected.length > 0 && (
							<div className="flex gap-2 p-3 rounded-lg border-2 border-blue-300 bg-white">
								<Button
									size="sm"
									onClick={() => handleMarkAsRead(selected)}
									disabled={loading}
									className="primary-btn px-3 sm:px-4 flex items-center gap-2"
								>
									<Check className="w-4 h-4" />
									Mark as Read ({selected.length})
								</Button>
								<Button
									size="sm"
									onClick={() => handleMarkAsUnread(selected)}
									disabled={loading}
									variant="outline"
									className="primary-btn px-3 sm:px-4 flex items-center gap-2"
								>
									<Check className="w-4 h-4" />
									Mark as Unread ({selected.length})
								</Button>
								<Button
									onClick={() => handleDeleteNotifications(selected)}
									disabled={loading}
									variant="destructive"
									className="primary-btn px-3 sm:px-4"
								>
									<Trash2 className="w-4 h-4" />
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
											<p className="text-lg font-semibold text-slate-900 mb-1">
												No notifications found
											</p>
											<p className="text-sm text-slate-600">
												You&apos;re all caught up!
											</p>
										</div>
									) : (
										paginated.map((notification) => {
											const typeConfig =
												NOTIFICATION_TYPES[
													notification.type as NotificationType
												];
											return (
												<SortableNotificationItem
													key={notification.$id}
													notification={notification}
													isSelected={selected.includes(notification.$id)}
													onSelect={handleSelect}
													onMarkAsRead={(id) => handleMarkAsRead([id])}
													onMarkAsUnread={(id) => handleMarkAsUnread([id])}
													typeConfig={typeConfig}
													getPriorityColor={getPriorityColor}
													formatNotificationTime={formatNotificationTime}
												/>
											);
										})
									)}
								</div>
							</SortableContext>
						</DndContext>

						{/* Enhanced Pagination */}
						<div
							className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200"
							data-testid="pagination"
						>
							<div className="flex items-center gap-4">
								<label className="text-xs text-slate-700">
									Items per page:
									<select
										className="ml-2 border rounded px-2 py-1"
										value={perPage}
										onChange={(e) => setPerPage(Number(e.target.value))}
									>
										{[5, 10, 20, 50].map((n) => (
											<option key={n} value={n}>
												{n}
											</option>
										))}
									</select>
								</label>
								<span className="text-sm text-gray-500">
									{`${(page - 1) * perPage + 1}-${Math.min(
										page * perPage,
										filtered.length,
									)} of ${filtered.length} items`}
								</span>
							</div>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page === 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									Previous
								</Button>
								<span className="flex items-center px-3 text-sm">
									Page {page} of {Math.ceil(filtered.length / perPage)}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page * perPage >= filtered.length}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Professional Footer */}
				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
					<div className="text-xs text-slate-500">
						Showing {paginated.length} of {filtered.length} notification
						{filtered.length !== 1 ? "s" : ""}
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							size="sm"
							onClick={onClose}
							className="primary-btn px-3 sm:px-4"
						>
							Close
						</Button>
					</div>
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
	typeConfig: (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];
	getPriorityColor: (priority?: string) => string;
	formatNotificationTime: (dateString: string) => string;
}

const SortableNotificationItem: React.FC<SortableNotificationItemProps> = ({
	notification,
	isSelected,
	onSelect,
	onMarkAsRead,
	onMarkAsUnread,
	typeConfig,
	getPriorityColor,
	formatNotificationTime,
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

	return (
		<div
			ref={setNodeRef}
			style={style}
			data-testid="notification-item"
			data-read={notification.read.toString()}
			data-priority={notification.priority || "low"}
			data-date={notification.$createdAt}
			className={`p-4 rounded-lg border-2 bg-white transition-all duration-200 group ${
				notification.read
					? "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
					: "border-blue-200 hover:border-blue-300 hover:bg-blue-50"
			} ${isDragging ? "opacity-50 shadow-lg" : "shadow-sm hover:shadow-md"}`}
		>
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0 mt-1">
					<Checkbox
						checked={isSelected}
						onCheckedChange={() => onSelect(notification.$id)}
					/>
				</div>

				{/* Icon with gradient background */}
				<div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
					{typeConfig?.icon ? (
						<div className="h-5 w-5 text-blue-600 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:text-blue-600">
							{typeConfig.icon}
						</div>
					) : (
						<Bell className="h-5 w-5 text-blue-600" />
					)}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2">
						<div className="flex-1">
							<div className="flex items-center gap-2 mb-1">
								<span className="text-sm font-semibold text-slate-900">
									{notification.title}
								</span>
								{notification.priority && (
									<span
										className={`px-2 py-0.5 text-xs rounded-full border ${getPriorityColor(
											notification.priority,
										)}`}
									>
										{notification.priority}
									</span>
								)}
								{!notification.read && (
									<span className="w-2 h-2 bg-blue-500 rounded-full"></span>
								)}
							</div>
							<p className="text-sm text-slate-600 mb-2 line-clamp-2">
								{notification.message}
							</p>
							<div className="flex items-center gap-4 text-xs text-slate-500">
								<div className="flex items-center gap-1">
									<Clock className="h-3 w-3" />
									<span>{formatNotificationTime(notification.$createdAt)}</span>
								</div>
								{typeConfig && (
									<span
										className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}
									>
										{typeConfig.label}
									</span>
								)}
							</div>
						</div>

						<div className="flex items-center gap-2">
							{!notification.read && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onMarkAsRead(notification.$id)}
									className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
								>
									Mark read
								</Button>
							)}
							{notification.read && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => onMarkAsUnread(notification.$id)}
									className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
								>
									Mark unread
								</Button>
							)}
							{/* Drag Handle */}
							<div
								{...attributes}
								{...listeners}
								className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 rounded transition-colors"
								title="Drag to reorder"
							>
								<GripVertical className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
							</div>
							{/* <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(notification.$id)}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                <Trash className="w-3 h-3" />
              </Button> */}
						</div>
					</div>

					{notification.actionUrl && notification.actionText && (
						<div className="mt-3 pt-3 border-t border-slate-200">
							<Button
								variant="outline"
								size="sm"
								onClick={() => window.open(notification.actionUrl, "_blank")}
								className="primary-btn px-3 sm:px-4 text-xs"
							>
								{notification.actionText}
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default NotificationCenter;
