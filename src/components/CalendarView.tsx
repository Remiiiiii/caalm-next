"use client";

import {
	eachDayOfInterval,
	endOfWeek,
	format,
	isSameDay,
	startOfWeek,
} from "date-fns";
import {
	Ban,
	CalendarDays,
	CalendarIcon,
	CheckCircle,
	ChevronDownIcon,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileText,
	Grid3X3,
	Plus,
	Settings,
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import CalendarSettings from "@/components/CalendarSettings";
import ExpandedCalendarView from "@/components/ExpandedCalendarView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { CalendarEventSkeleton } from "@/components/ui/skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { hasMicrosoftCalendarIntegration } from "@/lib/actions/calendar.actions";
import { createCalendarEvent } from "@/lib/actions/calendar.client";
import { cn } from "@/lib/utils";

// Local event interface for component use
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
}

// Internal state interface for new event form
interface NewEventForm {
	title: string;
	date: Date | undefined;
	type: "contract" | "deadline" | "meeting" | "review" | "audit";
	description: string;
	startTime: string;
	endTime: string;
	amount: string;
	contractName: string;
}

interface CalendarViewProps {
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
}

const CalendarView: React.FC<CalendarViewProps> = ({
	events = [],
	onEventClick,
	onDateSelect,
	onEventCreate,
	user,
}) => {
	const { toast } = useToast();
	const [selectedDate, setSelectedDate] = useState<Date | undefined>(
		new Date(),
	);
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const [viewMode, setViewMode] = useState<"month" | "week">("month");
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const [creatingEvent, setCreatingEvent] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [outlookConnected, setOutlookConnected] = useState(false);
	const [newEvent, setNewEvent] = useState<NewEventForm>({
		title: "",
		date: new Date(),
		type: "meeting",
		description: "",
		startTime: "",
		endTime: "",
		amount: "",
		contractName: "",
	});

	// Use unified dashboard data for calendar events
	const { orgId } = useOrganization();
	const { calendarEvents, isLoading, refresh } = useUnifiedDashboardData(
		orgId || "default_organization",
	);

	// Combine database events with prop events
	const allEvents: LocalCalendarEvent[] = [
		...calendarEvents,
		...events,
	] as LocalCalendarEvent[];

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

	const handleDateSelect = (date: Date | undefined) => {
		// Don't allow selecting past dates
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

		// Pre-fill the date in the new event form if modal is open
		if (date && isAddEventOpen) {
			setNewEvent((prev) => ({
				...prev,
				date: date,
			}));
		}
	};

	const handleMonthChange = (month: Date) => {
		setCurrentMonth(month);
	};

	const getEventTypeConfig = (type: LocalCalendarEvent["type"]) => {
		const configs = {
			contract: {
				label: "Contract",
				color: "bg-blue-500",
				borderColor: "#737373",
				icon: FileText,
			},
			deadline: {
				label: "Deadline",
				color: "bg-red-500",
				borderColor: "#FF7474",
				icon: Clock,
			},
			meeting: {
				label: "Meeting",
				color: "bg-green-500",
				borderColor: "#DB83ED",
				icon: Users,
			},
			review: {
				label: "Review",
				color: "bg-yellow-500",
				borderColor: "#5558F9",
				icon: FileText,
			},
			audit: {
				label: "Audit",
				color: "bg-purple-500",
				borderColor: "#F9AB72",
				icon: FileText,
			},
		};
		return configs[type];
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

		if (!newEvent.date) {
			toast({
				title: "Error",
				description: "Please select a date for the event",
				variant: "destructive",
			});
			return;
		}

		// Validate that the selected date is not in the past
		const selectedDate = new Date(newEvent.date);
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (selectedDate < today) {
			toast({
				title: "Error",
				description: "Cannot create events for dates in the past",
				variant: "destructive",
			});
			return;
		}

		if (!user) {
			toast({
				title: "Error",
				description: "User information not available. Please refresh the page.",
				variant: "destructive",
			});
			return;
		}

		setCreatingEvent(true);
		try {
			// Create event in database
			// Create date string in YYYY-MM-DD format to avoid timezone issues
			const eventDate = newEvent.date || new Date();
			const year = eventDate.getFullYear();
			const month = String(eventDate.getMonth() + 1).padStart(2, "0");
			const day = String(eventDate.getDate()).padStart(2, "0");
			const dateString = `${year}-${month}-${day}`;

			const eventData = {
				title: newEvent.title.trim(),
				startDate: dateString,
				type: newEvent.type,
				description: newEvent.description?.trim() || "",
				contractName: newEvent.contractName?.trim() || "",
				amount: newEvent.amount?.trim() || "",
				startTime: newEvent.startTime || "",
				endTime: newEvent.endTime || "",
				participants: "",
				createdBy: user.fullName || user.$id,
			};

			const createdEvent = await createCalendarEvent(eventData);

			if (createdEvent) {
				// Call the callback with the correct format
				const eventForCallback: Omit<LocalCalendarEvent, "id"> = {
					title: newEvent.title,
					date: newEvent.date || new Date(),
					type: newEvent.type,
					description: newEvent.description,
					startTime: newEvent.startTime,
					endTime: newEvent.endTime,
					amount: newEvent.amount,
					contractName: newEvent.contractName,
				};
				onEventCreate?.(eventForCallback);

				// Show success toast
				toast({
					title: "Success",
					description: `Event "${newEvent.title}" created successfully!`,
				});

				// Reset form
				setNewEvent({
					title: "",
					date: new Date(),
					type: "meeting",
					description: "",
					startTime: "",
					endTime: "",
					amount: "",
					contractName: "",
				});
				setIsAddEventOpen(false);

				// Refresh events
				refresh();
			} else {
				toast({
					title: "Error",
					description: "Failed to create event. Please try again.",
					variant: "destructive",
				});
			}
		} catch (error) {
			console.error("Error creating calendar event:", error);

			// Show more detailed error message
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error occurred";
			toast({
				title: "Error",
				description: `Failed to create event: ${errorMessage}`,
				variant: "destructive",
			});
		} finally {
			setCreatingEvent(false);
		}
	};

	const WeekView = () => {
		const weekDays = eachDayOfInterval({
			start: startOfWeek(currentMonth),
			end: endOfWeek(currentMonth),
		});

		return (
			<div className="space-y-6 w-full">
				{/* Week header */}
				<div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-slate-600">
					{weekDays.map((day) => (
						<div key={day.toISOString()} className="p-2">
							<div className="text-xs text-slate-500">{format(day, "EEE")}</div>
							<div
								className={cn(
									"text-lg font-semibold rounded-full w-8 h-8 flex items-center justify-center mx-auto cursor-pointer transition-colors",
									selectedDate && isSameDay(day, selectedDate)
										? "bg-blue-500 text-white"
										: "text-slate-700 hover:bg-slate-100",
								)}
								onClick={() => handleDateSelect(day)}
							>
								{format(day, "d")}
							</div>
						</div>
					))}
				</div>

				{/* Week events list - scrollable container */}
				<div className="h-[280px] overflow-y-auto border rounded-lg w-full">
					<div className="space-y-0">
						{weekDays.map((day) => {
							const dayEvents = allEvents.filter(
								(event) => event.date && isSameDay(event.date, day),
							);
							const isSelected = selectedDate && isSameDay(day, selectedDate);

							return (
								<div
									key={day.toISOString()}
									className={cn(
										"border-b border-slate-200 last:border-b-0 transition-colors",
										isSelected ? "bg-blue-50" : "hover:bg-slate-50",
									)}
								>
									<div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-200">
										<h3 className="font-semibold text-slate-800 text-sm">
											{format(day, "EEEE, MMMM d, yyyy")}
										</h3>
										{dayEvents.length > 0 && (
											<Badge variant="secondary" className="text-xs">
												{dayEvents.length} event
												{dayEvents.length !== 1 ? "s" : ""}
											</Badge>
										)}
									</div>

									{dayEvents.length > 0 ? (
										<div className="p-3 space-y-2">
											{dayEvents.map((event) => {
												const config = getEventTypeConfig(event.type);
												return (
													<div
														key={event.id}
														className="flex items-start gap-3 p-3 bg-white border-l-4 rounded-lg border border-slate-200 transition-colors cursor-pointer"
														style={{ borderLeftColor: config.borderColor }}
														onClick={() => onEventClick?.(event)}
													>
														<div
															className={cn(
																"w-1 h-full rounded-full flex-shrink-0",
																config.color,
															)}
														/>
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<div className="text-xs text-slate-500">
																	{config.label}
																</div>
																{isOutlookEvent(event) && (
																	<div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
																		<CheckCircle className="h-3 w-3" />
																		<span>Outlook</span>
																	</div>
																)}
															</div>
															<div className="font-semibold text-slate-800 text-sm mb-1">
																{event.title}
															</div>
															{event.contractName && (
																<div className="text-sm text-slate-600 mb-1">
																	{event.contractName}
																</div>
															)}
															{event.description && (
																<div className="text-xs text-slate-500 line-clamp-2">
																	{event.description}
																</div>
															)}
															{event.startTime && event.endTime && (
																<div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
																	<Clock className="h-3 w-3" />
																	{event.startTime} - {event.endTime}
																</div>
															)}
														</div>
													</div>
												);
											})}
										</div>
									) : isLoading ? (
										<div className="p-3 space-y-2">
											{[1, 2].map((i) => (
												<CalendarEventSkeleton key={i} />
											))}
										</div>
									) : (
										<div className="text-center py-6 text-slate-500">
											<CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
											<p className="text-xs">No events scheduled</p>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			</div>
		);
	};

	const goToToday = () => {
		const today = new Date();
		setSelectedDate(today);
		handleMonthChange(today);
		onDateSelect?.(today);
	};

	return (
		<div className="flex w-full min-w-0 flex-col gap-3">
			{/* Enterprise toolbar: title + nav | view + actions (Zoho / Sprout pattern) */}
			<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex min-w-0 flex-wrap items-center gap-1.5">
					<h3 className="truncate text-base font-semibold sidebar-gradient-text sm:text-lg">
						{format(currentMonth, "MMMM yyyy")}
					</h3>
					<div className="flex items-center gap-0.5">
						<Button
							type="button"
							size="sm"
							variant="ghost"
							aria-label="Previous month"
							onClick={() => {
								const prevMonth = new Date(currentMonth);
								prevMonth.setMonth(prevMonth.getMonth() - 1);
								handleMonthChange(prevMonth);
							}}
							className="h-8 w-8 shrink-0 p-0 hover:bg-slate-100"
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							aria-label="Next month"
							onClick={() => {
								const nextMonth = new Date(currentMonth);
								nextMonth.setMonth(nextMonth.getMonth() + 1);
								handleMonthChange(nextMonth);
							}}
							className="h-8 w-8 shrink-0 p-0 hover:bg-slate-100"
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={goToToday}
							className="h-8 shrink-0 border-slate-200 px-2 text-xs text-slate-700 hover:bg-slate-50"
						>
							Today
						</Button>
					</div>
				</div>

				<div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:justify-end">
					<Tabs
						value={viewMode}
						onValueChange={(value) => setViewMode(value as "month" | "week")}
						className="w-auto shrink-0"
					>
						<TabsList className="inline-flex h-8 w-auto gap-0.5 bg-slate-100/80 p-0.5">
							<TabsTrigger
								value="month"
								className="h-7 gap-1 px-2 text-xs data-[state=active]:bg-white sm:px-2.5"
							>
								<Grid3X3 className="h-3.5 w-3.5" />
								<span>Month</span>
							</TabsTrigger>
							<TabsTrigger
								value="week"
								className="h-7 gap-1 px-2 text-xs data-[state=active]:bg-white sm:px-2.5"
							>
								<CalendarDays className="h-3.5 w-3.5" />
								<span>Week</span>
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{outlookConnected && (
						<div className="hidden items-center gap-1 rounded-md bg-green/10 px-2 py-1 text-xs text-green sm:flex">
							<CheckCircle className="h-3 w-3" />
							<span>Outlook</span>
						</div>
					)}

					<Dialog open={showSettings} onOpenChange={setShowSettings}>
						<DialogTrigger asChild>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="h-8 w-8 shrink-0 p-0 hover:bg-slate-100"
								title="Calendar Settings"
							>
								<Settings className="h-4 w-4" />
							</Button>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[500px] shadow-xl">
							<DialogHeader>
								<DialogTitle className="sidebar-gradient-text">
									Calendar Settings
								</DialogTitle>
							</DialogHeader>
							<CalendarSettings
								userId={user?.$id || ""}
								onClose={() => setShowSettings(false)}
							/>
						</DialogContent>
					</Dialog>

					<ExpandedCalendarView
						events={events}
						onEventClick={onEventClick}
						onDateSelect={onDateSelect}
						onEventCreate={onEventCreate}
						user={user}
					/>
				</div>
			</div>

			{/* Single calendar surface (parent dashboard already provides glass-card) */}
			<div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white/80">
				<div className="w-full px-2 py-2 sm:px-3 sm:py-3">
					{isLoading && (
						<div className="flex items-center justify-center py-4">
							<div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[#0f5384]" />
						</div>
					)}
					{viewMode === "month" ? (
						<div className="w-full min-w-0 [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-caption]:!hidden [&_.rdp-nav]:!hidden [&_button[name=previous-month]]:!hidden [&_button[name=next-month]]:!hidden">
							<Calendar
								mode="single"
								selected={selectedDate}
								onSelect={handleDateSelect}
								month={currentMonth}
								onMonthChange={handleMonthChange}
								hideNavigation
								disabled={(date) => {
									const today = new Date();
									today.setHours(0, 0, 0, 0);
									return date < today;
								}}
								className="w-full p-0 sm:p-1"
								classNames={{
									months: "flex w-full flex-col space-y-1",
									month: "w-full space-y-1",
									caption: "hidden",
									caption_label: "hidden",
									nav: "hidden",
									nav_button: "hidden",
									nav_button_previous: "hidden",
									nav_button_next: "hidden",
									table: "w-full border-collapse space-y-0",
									head_row: "flex w-full",
									head_cell:
										"text-slate-500 flex-1 text-center font-medium text-[10px] uppercase tracking-wide py-1.5 px-0 sm:text-xs",
									row: "flex w-full mt-0",
									cell: "h-8 sm:h-9 flex-1 text-center text-xs px-0 py-0 relative focus-within:relative focus-within:z-20",
									day: cn(
										"h-8 sm:h-9 w-full px-0 py-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors duration-200 relative text-xs",
									),
									day_range_end: "day-range-end",
									day_selected:
										"bg-[#0f5384] text-white hover:bg-[#0f5384]/90 focus:bg-[#0f5384]",
									day_today:
										"bg-slate-100 text-slate-900 font-semibold ring-1 ring-[#0f5384]/40",
									day_outside:
										"day-outside text-slate-400 opacity-50 aria-selected:bg-accent/50 aria-selected:text-slate-500 aria-selected:opacity-30",
									day_disabled: "text-slate-400 opacity-50",
									day_range_middle:
										"aria-selected:bg-accent aria-selected:text-accent-foreground",
									day_hidden: "invisible",
								}}
							/>
						</div>
					) : (
						<WeekView />
					)}
					<div className="mt-3 flex justify-center border-t border-slate-200/60 pt-3">
						<Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
							<DialogTrigger asChild>
								<Button
									size="sm"
									className="primary-btn px-4 sm:px-6"
								>
									<Plus className="h-4 w-4" />
									Add Event
								</Button>
							</DialogTrigger>
								<DialogContent className="flex max-h-[90vh] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
									<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
									<div className="glass-dialog-wizard-header mt-4">
										<div className="flex items-center gap-3 px-6">
											<div className="flex items-center gap-3">
												<CalendarDays className="h-5 w-5 text-[#0f5384]" />
												<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
													Add New Event
												</DialogTitle>
											</div>
										</div>
										<p className="ml-14 mt-1 text-sm text-slate-600">
											Schedule a meeting, deadline, or review
										</p>
									</div>
									<div className="glass-dialog-body-padded flex-1 space-y-4 overflow-y-auto">
										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div>
												<Label
													htmlFor="title"
													className="mb-1 block text-sm font-medium text-slate-700"
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
													className="bg-white"
												/>
											</div>
											<div>
												<Label
													htmlFor="type"
													className="mb-1 block text-sm font-medium text-slate-700"
												>
													Event Type
												</Label>
												<Select
													value={newEvent.type}
													onValueChange={(value) =>
														setNewEvent({
															...newEvent,
															type: value as LocalCalendarEvent["type"],
														})
													}
												>
													<SelectTrigger className="bg-white">
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
										</div>

										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div>
												<Label
													htmlFor="date"
													className="mb-1 block text-sm font-medium text-slate-700"
												>
													Date
												</Label>
												<Popover>
													<PopoverTrigger asChild>
														<Button
															variant="outline"
															id="date"
															className="w-full justify-between bg-white font-normal"
														>
															{newEvent.date
																? newEvent.date.toLocaleDateString()
																: "Select date"}
															<ChevronDownIcon className="h-4 w-4" />
														</Button>
													</PopoverTrigger>
													<PopoverContent
														className="w-auto overflow-hidden p-0"
														align="start"
													>
														<Calendar
															mode="single"
															selected={newEvent.date}
															captionLayout="dropdown"
															onSelect={(date) => {
																setNewEvent({ ...newEvent, date });
															}}
														/>
													</PopoverContent>
												</Popover>
											</div>
											<div>
												<Label
													htmlFor="amount"
													className="mb-1 block text-sm font-medium text-slate-700"
												>
													Amount (Optional)
												</Label>
												<Input
													id="amount"
													value={newEvent.amount || ""}
													onChange={(e) =>
														setNewEvent({
															...newEvent,
															amount: e.target.value,
														})
													}
													placeholder="Enter amount"
													className="bg-white"
												/>
											</div>
										</div>

										<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div>
												<Label
													htmlFor="startTime"
													className="mb-1 block text-sm font-medium text-slate-700"
												>
													Start Time
												</Label>
												<Input
													id="startTime"
													type="time"
													value={newEvent.startTime || ""}
													onChange={(e) =>
														setNewEvent({
															...newEvent,
															startTime: e.target.value,
														})
													}
													className="bg-white"
												/>
											</div>
											<div>
												<Label
													htmlFor="endTime"
													className="mb-1 block text-sm font-medium text-slate-700"
												>
													End Time
												</Label>
												<Input
													id="endTime"
													type="time"
													value={newEvent.endTime || ""}
													onChange={(e) =>
														setNewEvent({
															...newEvent,
															endTime: e.target.value,
														})
													}
													className="bg-white"
												/>
											</div>
										</div>

										<div>
											<Label
												htmlFor="contractName"
												className="mb-1 block text-sm font-medium text-slate-700"
											>
												Contract Name (Optional)
											</Label>
											<Input
												id="contractName"
												value={newEvent.contractName || ""}
												onChange={(e) =>
													setNewEvent({
														...newEvent,
														contractName: e.target.value,
													})
												}
												placeholder="Enter contract name"
												className="bg-white"
											/>
										</div>

										<div>
											<Label
												htmlFor="description"
												className="mb-1 block text-sm font-medium text-slate-700"
											>
												Description
											</Label>
											<textarea
												id="description"
												value={newEvent.description}
												onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
													setNewEvent({
														...newEvent,
														description: e.target.value,
													})
												}
												placeholder="Enter event description"
												rows={3}
												className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03afbf] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
											/>
										</div>
									</div>
									<div className="glass-dialog-footer-wrap">
										<div className="flex items-center justify-between">
											<div className="text-xs text-slate-500">
												{newEvent.title.trim()
													? "Ready to create"
													: "Enter a title to continue"}
											</div>
											<div className="flex items-center gap-3">
												<Button
													variant="outline"
													onClick={() => setIsAddEventOpen(false)}
													className="primary-btn px-3 sm:px-4"
												>
													<Ban className="h-4 w-4" />
													Cancel
												</Button>
												<Button
													onClick={handleAddEvent}
													disabled={!newEvent.title.trim() || creatingEvent}
													className="primary-btn px-3 sm:px-4"
												>
													{creatingEvent ? "Creating..." : "Create Event"}
												</Button>
											</div>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarView;
