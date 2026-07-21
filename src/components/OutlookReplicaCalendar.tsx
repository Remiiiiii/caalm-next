"use client";

import {
	addMonths,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
	startOfWeek,
	subMonths,
} from "date-fns";
import {
	AlertCircle,
	Ban,
	Bell,
	CalendarIcon,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Eye,
	FileText,
	Filter,
	Loader2,
	Plus,
	Printer,
	Search,
	Settings,
	Share2,
	User,
	Users,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

interface OutlookReplicaCalendarProps {
	user?: any;
}

interface LocalCalendarEvent {
	id: string;
	title: string;
	date?: Date;
	type: "contract" | "deadline" | "meeting" | "review" | "audit";
	description?: string;
	participants?: string[];
	contractName?: string;
	amount?: string;
	startTime?: string;
	endTime?: string;
	outlook_id?: string;
}

const OutlookReplicaCalendar: React.FC<OutlookReplicaCalendarProps> = ({
	user,
}) => {
	const { toast } = useToast();
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		new Date(),
	);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [viewMode, setViewMode] = useState<
		"day" | "workweek" | "week" | "month"
	>("month");
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const [_isEditEventOpen, setIsEditEventOpen] = useState(false);
	const [_selectedEvent, setSelectedEvent] =
		useState<LocalCalendarEvent | null>(null);
	const [creatingEvent, setCreatingEvent] = useState(false);
	const [_outlookConnected, _setOutlookConnected] = useState(false);
	const [_syncing, _setSyncing] = useState(false);
	const [_showSettings, setShowSettings] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const [newEvent, setNewEvent] = useState({
		title: "",
		date: new Date(),
		type: "meeting" as const,
		description: "",
		startTime: "",
		endTime: "",
		amount: "",
		contractName: "",
		participants: "",
	});

	// Use proper data fetching hook
	const { events: calendarEvents, refresh } = useCalendarEvents();

	// Combine local events with calendar events
	const allEvents = [...(calendarEvents || [])];

	// Filter events based on search query
	const filteredEvents = allEvents.filter(
		(event) =>
			event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			event.description?.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleDateSelect = (date: Date) => {
		setSelectedDate(date);
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

		setCreatingEvent(true);
		try {
			// Create date string in YYYY-MM-DD format to avoid timezone issues
			const year = newEvent.date.getFullYear();
			const month = String(newEvent.date.getMonth() + 1).padStart(2, "0");
			const day = String(newEvent.date.getDate()).padStart(2, "0");
			const dateString = `${year}-${month}-${day}`;

			const eventData = {
				title: newEvent.title,
				startDate: dateString,
				type: newEvent.type,
				description: newEvent.description,
				startTime: newEvent.startTime,
				endTime: newEvent.endTime,
				amount: newEvent.amount,
				contractName: newEvent.contractName,
				participants: newEvent.participants,
				createdBy: user?.$id || "user",
			};

			const response = await fetch("/api/calendar/events", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(eventData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || "Failed to create event");
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
				type: "meeting",
				description: "",
				startTime: "",
				endTime: "",
				amount: "",
				contractName: "",
				participants: "",
			});

			await refresh();
		} catch (error) {
			console.error("Error creating event:", error);
			toast({
				title: "Error",
				description: `Failed to create event: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				variant: "destructive",
			});
		} finally {
			setCreatingEvent(false);
		}
	};

	const getEventTypeConfig = (type: string) => {
		const configs = {
			contract: {
				color: "bg-blue-100 text-blue-800 border-blue-200",
				icon: FileText,
			},
			deadline: {
				color: "bg-red-100 text-red-800 border-red-200",
				icon: AlertCircle,
			},
			meeting: {
				color: "bg-green-100 text-green-800 border-green-200",
				icon: Users,
			},
			review: {
				color: "bg-yellow-100 text-yellow-800 border-yellow-200",
				icon: Eye,
			},
			audit: {
				color: "bg-purple-100 text-purple-800 border-purple-200",
				icon: CheckCircle,
			},
		};
		return configs[type as keyof typeof configs] || configs.meeting;
	};

	const renderMonthView = () => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(currentMonth);
		const startDate = startOfWeek(monthStart);
		const endDate = endOfWeek(monthEnd);
		const days = eachDayOfInterval({ start: startDate, end: endDate });

		return (
			<div className="grid grid-cols-7 gap-px bg-gray-200">
				{/* Header */}
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
					<div
						key={day}
						className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700"
					>
						{day}
					</div>
				))}

				{/* Days */}
				{days.map((day) => {
					const dayEvents = filteredEvents.filter((event) => {
						if (!event.startDate) return false;
						const eventDate = new Date(event.startDate);
						return isSameDay(eventDate, day);
					});

					const isCurrentDay = isToday(day);
					const isSelected = selectedDate && isSameDay(day, selectedDate);
					const isCurrentMonth = isSameMonth(day, currentMonth);

					return (
						<div
							key={day.toISOString()}
							className={cn(
								"min-h-[120px] bg-white p-1 border border-gray-200 cursor-pointer transition-colors",
								isSelected && "bg-blue-50 border-blue-300",
								isCurrentDay && "bg-blue-100",
								!isCurrentMonth && "bg-gray-50 text-gray-400",
							)}
							onClick={() => handleDateSelect(day)}
						>
							<div className="flex items-center justify-between mb-1">
								<span
									className={cn(
										"text-sm font-medium",
										isCurrentDay && "text-blue-600 font-bold",
										isSelected && "text-blue-700",
									)}
								>
									{format(day, "d")}
								</span>
								{isCurrentDay && (
									<div className="w-2 h-2 bg-blue-600 rounded-full"></div>
								)}
							</div>

							<div className="space-y-1">
								{dayEvents.slice(0, 3).map((event, index) => {
									const config = getEventTypeConfig(event.type);
									const IconComponent = config.icon;
									return (
										<div
											key={event.id || `event-${index}-${event.title}`}
											className={cn(
												"text-xs p-1 rounded cursor-pointer flex items-center gap-1",
												config.color,
											)}
											onClick={(e) => {
												e.stopPropagation();
												setSelectedEvent(event);
												setIsEditEventOpen(true);
											}}
										>
											<IconComponent className="h-3 w-3 flex-shrink-0" />
											<span className="truncate">{event.title}</span>
											{event.outlook_id && (
												<CheckCircle className="h-3 w-3 text-blue-600 flex-shrink-0 ml-auto" />
											)}
										</div>
									);
								})}
								{dayEvents.length > 3 && (
									<div className="text-xs text-gray-500 text-center">
										+{dayEvents.length - 3} more
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div className="h-screen flex flex-col bg-white">
			{/* Top Header - Outlook Style */}
			<div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<CalendarIcon className="h-6 w-6" />
						<span className="text-lg font-semibold">Outlook</span>
					</div>
					<div className="flex-1 max-w-md">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="pl-10 bg-white text-gray-900 border-0 rounded-md"
							/>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						className="text-white hover:bg-blue-700"
					>
						<Bell className="h-4 w-4" />
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="text-white hover:bg-blue-700"
					>
						<Settings className="h-4 w-4" />
					</Button>
					<div className="flex items-center gap-2 ml-4">
						<div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
							<User className="h-4 w-4" />
						</div>
						<span className="text-sm">{user?.fullName || "User"}</span>
					</div>
				</div>
			</div>

			{/* Ribbon/Toolbar */}
			<div className="bg-white border-b border-gray-200 px-4 py-2">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<Button
							onClick={() => setIsAddEventOpen(true)}
							className="bg-blue-600 hover:bg-blue-700 text-white"
						>
							<Plus className="h-4 w-4" />
							New Event
						</Button>
					</div>

					<div className="flex items-center gap-1 border border-gray-300 rounded-md">
						<Button
							variant={viewMode === "day" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("day")}
						>
							Day
						</Button>
						<Button
							variant={viewMode === "workweek" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("workweek")}
						>
							Work Week
						</Button>
						<Button
							variant={viewMode === "week" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("week")}
						>
							Week
						</Button>
						<Button
							variant={viewMode === "month" ? "default" : "ghost"}
							size="sm"
							onClick={() => setViewMode("month")}
						>
							Month
						</Button>
					</div>

					<div className="flex items-center gap-2">
						<Button variant="ghost" size="sm">
							<Filter className="h-4 w-4" />
							Filter
						</Button>
						<Button variant="ghost" size="sm">
							<Share2 className="h-4 w-4" />
							Share
						</Button>
						<Button variant="ghost" size="sm">
							<Printer className="h-4 w-4" />
							Print
						</Button>
					</div>
				</div>
			</div>

			{/* Main Content */}
			<div className="flex-1 flex">
				{/* Left Sidebar */}
				<div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
					<div className="space-y-4">
						<div className="text-sm font-medium text-gray-700">
							My Calendars
						</div>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 bg-blue-500 rounded-full"></div>
								<span className="text-sm">Calendar</span>
							</div>
						</div>

						<div className="text-sm font-medium text-gray-700">
							October 2025
						</div>
						<div className="text-xs text-gray-500">
							Mini calendar would go here
						</div>
					</div>
				</div>

				{/* Calendar View */}
				<div className="flex-1 p-4">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
							>
								<ChevronLeft className="h-4 w-4" />
							</Button>
							<h2 className="text-xl font-semibold">
								{format(currentMonth, "MMMM yyyy")}
							</h2>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
							>
								<ChevronRight className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setCurrentMonth(new Date())}
							>
								Today
							</Button>
						</div>

						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowSettings(true)}
							>
								<Settings className="h-4 w-4" />
								Settings
							</Button>
						</div>
					</div>

					{/* Calendar Grid */}
					<div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
						{renderMonthView()}
					</div>
				</div>
			</div>

			{/* Event Creation Dialog */}
			<Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create New Event</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div>
							<Label htmlFor="title">Title</Label>
							<Input
								id="title"
								value={newEvent.title}
								onChange={(e) =>
									setNewEvent({ ...newEvent, title: e.target.value })
								}
								placeholder="Event title"
							/>
						</div>
						<div>
							<Label htmlFor="date">Date</Label>
							<Input
								id="date"
								type="date"
								value={format(newEvent.date, "yyyy-MM-dd")}
								onChange={(e) =>
									setNewEvent({ ...newEvent, date: new Date(e.target.value) })
								}
							/>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<div>
								<Label htmlFor="startTime">Start Time</Label>
								<Input
									id="startTime"
									type="time"
									value={newEvent.startTime}
									onChange={(e) =>
										setNewEvent({ ...newEvent, startTime: e.target.value })
									}
								/>
							</div>
							<div>
								<Label htmlFor="endTime">End Time</Label>
								<Input
									id="endTime"
									type="time"
									value={newEvent.endTime}
									onChange={(e) =>
										setNewEvent({ ...newEvent, endTime: e.target.value })
									}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={newEvent.description}
								onChange={(e) =>
									setNewEvent({ ...newEvent, description: e.target.value })
								}
								placeholder="Event description"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setIsAddEventOpen(false)}
								className="primary-btn px-3 sm:px-4"
							>
								<Ban className="w-4 h-4" />
								Cancel
							</Button>
							<Button onClick={handleCreateEvent} disabled={creatingEvent}>
								{creatingEvent ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Create"
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default OutlookReplicaCalendar;
