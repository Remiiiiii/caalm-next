"use client";

import {
	addDays,
	eachDayOfInterval,
	endOfWeek,
	format,
	isSameDay,
	isSameMonth,
	isToday,
	startOfMonth,
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
	Users,
} from "lucide-react";
import type React from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import ExpandedCalendarView, {
	type CalendarDisplayEvent,
} from "@/components/ExpandedCalendarView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
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
import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { hasMicrosoftCalendarIntegration } from "@/lib/actions/calendar.actions";
import { createCalendarEvent } from "@/lib/actions/calendar.client";
import { getTimezoneAbbreviation } from "@/lib/calendar/eventDisplayFormat";
import { useOrgTimezone } from "@/hooks/useOrgTimezone";
import { formatInTimezone } from "@/lib/timezone";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

/** Toolbar title above the calendar card */
const CALENDAR_TOOLBAR_TITLE_CLASS =
	"text-lg font-bold sidebar-gradient-text";

/** In-card month label beside chevrons */
const CALENDAR_CARD_MONTH_TITLE_CLASS =
	"text-base font-medium text-slate-700";

const CALENDAR_TAB_BASE =
	"flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-xs font-semibold transition-colors duration-200 sm:text-[12.5px]";

const CALENDAR_TAB_INACTIVE =
	"border-slate-200 bg-white text-slate-600 hover:bg-slate-50";

const CALENDAR_TAB_ACTIVE =
	"border-blue/30 bg-blue/10 text-[#0f5384]";

const CALENDAR_TODAY_BADGE =
	"bg-blue-100 font-semibold text-[#2563eb]";

const CALENDAR_CARD_SHADOW =
	"shadow-[0_1px_2px_rgba(15,83,132,0.04),0_16px_40px_-20px_rgba(15,83,132,0.16)]";

// Local event interface for component use (shared with expanded calendar)
type LocalCalendarEvent = CalendarDisplayEvent;

const CREATE_EVENT_TYPES = [
	"meeting",
	"contract",
	"deadline",
	"review",
	"audit",
] as const;

type CreateEventType = (typeof CREATE_EVENT_TYPES)[number];

function isCreateEventType(value: string): value is CreateEventType {
	return CREATE_EVENT_TYPES.includes(value as CreateEventType);
}

// Internal state interface for new event form
interface NewEventForm {
	title: string;
	date: Date | undefined;
	type: CreateEventType;
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

function parseCalendarDate(
	raw: string | Date | undefined | null,
): Date | undefined {
	if (!raw) return undefined;
	if (raw instanceof Date) {
		return Number.isNaN(raw.getTime()) ? undefined : raw;
	}
	const dateStr = raw.split("T")[0];
	const [year, month, day] = dateStr.split("-").map(Number);
	if (!year || !month || !day) return undefined;
	return new Date(year, month - 1, day);
}

function contractExpiryToCalendarEvent(
	contract: Record<string, unknown>,
): LocalCalendarEvent | null {
	const date = parseCalendarDate(
		contract.contractExpiryDate as string | undefined,
	);
	if (!date) return null;

	const name = String(
		contract.contractName ?? contract.name ?? "Contract",
	);

	return {
		id: `contract-expiry-${String(contract.$id ?? "")}`,
		title: `${name} expires`,
		date,
		type: "deadline",
		contractName: name,
	};
}

function contractStartToCalendarEvent(
	contract: Record<string, unknown>,
): LocalCalendarEvent | null {
	const date = parseCalendarDate(contract.startDate as string | undefined);
	if (!date) return null;

	const name = String(
		contract.contractName ?? contract.name ?? "Contract",
	);

	return {
		id: `contract-start-${String(contract.$id ?? "")}`,
		title: name,
		date,
		type: "contract",
		contractName: name,
	};
}

function licenseExpiryToCalendarEvent(
	license: Record<string, unknown>,
): LocalCalendarEvent | null {
	const date = parseCalendarDate(
		(license.licenseExpiryDate ?? license.expirationDate) as
			| string
			| undefined,
	);
	if (!date) return null;

	const name = String(license.licenseName ?? license.name ?? "License");

	return {
		id: `license-expiry-${String(license.$id ?? "")}`,
		title: `${name} expires`,
		date,
		type: "license",
		description:
			typeof license.licenseType === "string" ? license.licenseType : undefined,
	};
}

function licenseIssueToCalendarEvent(
	license: Record<string, unknown>,
): LocalCalendarEvent | null {
	const date = parseCalendarDate(license.issueDate as string | undefined);
	if (!date) return null;

	const name = String(license.licenseName ?? license.name ?? "License");

	return {
		id: `license-issue-${String(license.$id ?? "")}`,
		title: `${name} issued`,
		date,
		type: "license",
		description:
			typeof license.licenseType === "string" ? license.licenseType : undefined,
	};
}

function getDayEventDots(day: Date, events: LocalCalendarEvent[]) {
	const dayEvents = events.filter((event) => {
		const eventDate = event.date ? parseCalendarDate(event.date) : undefined;
		return eventDate ? isSameDay(eventDate, day) : false;
	});

	return {
		hasContract: dayEvents.some((event) => event.type === "contract"),
		hasDeadline: dayEvents.some((event) => event.type === "deadline"),
		hasLicense: dayEvents.some((event) => event.type === "license"),
		hasAudit: dayEvents.some((event) => event.type === "audit"),
	};
}

function CalendarLiveClock() {
	const timeZone = useOrgTimezone();
	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	const tz = getTimezoneAbbreviation(now, timeZone);

	return (
		<span
			className="shrink-0 font-poppins text-[11px] font-medium tabular-nums text-slate-600"
			aria-live="polite"
			aria-atomic="true"
		>
			{formatInTimezone(now, "HH:mm", timeZone)}
			{tz ? ` ${tz}` : ""}
		</span>
	);
}

function CalendarCalHead({
	currentMonth,
	onPrevMonth,
	onNextMonth,
	onToday,
}: {
	currentMonth: Date;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	onToday: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-[18px] pt-4 pb-3">
			<div className="flex items-center gap-2.5">
				<span className={CALENDAR_CARD_MONTH_TITLE_CLASS}>
					{format(currentMonth, "MMMM yyyy")}
				</span>
				<div className="flex gap-0.5">
					<button
						type="button"
						onClick={onPrevMonth}
						aria-label="Previous month"
						className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue/30 hover:bg-blue/10 hover:text-[#0f5384]"
					>
						<ChevronLeft className="h-3 w-3" />
					</button>
					<button
						type="button"
						onClick={onNextMonth}
						aria-label="Next month"
						className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:border-blue/30 hover:bg-blue/10 hover:text-[#0f5384]"
					>
						<ChevronRight className="h-3 w-3" />
					</button>
				</div>
			</div>
			<button
				type="button"
				onClick={onToday}
				className="rounded-md text-[10px] font-medium uppercase tracking-wide text-[#0f5384] bg-blue/10 border border-blue/20 px-2.5 py-1 transition-colors hover:bg-blue/15"
			>
				Today
			</button>
		</div>
	);
}

function CalendarLegend() {
	return (
		<div className="flex flex-wrap gap-x-4 gap-y-2 px-[18px] pb-3.5">
			<div className="flex items-center gap-1.5 text-[10.5px] text-slate-600">
				<span
					className="h-1.5 w-1.5 rounded-full bg-[#0f5384]"
					aria-hidden
				/>
				Contract event
			</div>
			<div className="flex items-center gap-1.5 text-[10.5px] text-slate-600">
				<span
					className="h-1.5 w-1.5 rounded-full bg-[#03afbf]"
					aria-hidden
				/>
				License event
			</div>
			<div className="flex items-center gap-1.5 text-[10.5px] text-slate-600">
				<span
					className="h-1.5 w-1.5 rounded-full bg-[#a06ce2]"
					aria-hidden
				/>
				Audit event
			</div>
			<div className="flex items-center gap-1.5 text-[10.5px] text-slate-600">
				<span className="h-1.5 w-1.5 rounded-full bg-orange" aria-hidden />
				Deadline
			</div>
		</div>
	);
}

function DashboardMonthMatrix({
	currentMonth,
	selectedDate,
	events,
	onSelectDate,
}: {
	currentMonth: Date;
	selectedDate?: Date;
	events: LocalCalendarEvent[];
	onSelectDate: (date: Date) => void;
}) {
	const monthStart = startOfWeek(startOfMonth(currentMonth));
	const days = Array.from({ length: 42 }, (_, index) =>
		addDays(monthStart, index),
	);
	const weeks = Array.from({ length: 6 }, (_, index) =>
		days.slice(index * 7, index * 7 + 7),
	);

	return (
		<div className="px-3.5 pb-4 sm:px-[14px]">
			<div className="mb-1.5 grid grid-cols-7">
				{WEEKDAY_LABELS.map((label) => (
					<div
						key={label}
						className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600"
					>
						{label}
					</div>
				))}
			</div>
			{weeks.map((week) => (
				<div key={week[0].toISOString()} className="grid grid-cols-7">
					{week.map((day) => {
						const inMonth = isSameMonth(day, currentMonth);
						const selected = Boolean(
							selectedDate && isSameDay(day, selectedDate),
						);
						const today = isToday(day) && inMonth;
						const { hasContract, hasDeadline, hasLicense, hasAudit } =
							getDayEventDots(day, events);

						return (
							<button
								key={day.toISOString()}
								type="button"
								onClick={() => onSelectDate(day)}
								className={cn( "group relative flex h-11 flex-col items-center justify-center text-[13px] transition-colors", !inMonth && "text-slate-300", inMonth && !today && "text-slate-700", )}
							>
								<span
									className={cn( "flex h-[26px] w-[26px] items-center justify-center rounded-full transition-colors", today && CALENDAR_TODAY_BADGE, selected && !today && "bg-blue/10 font-semibold text-[#0f5384] ring-2 ring-[#0f5384]/30", !today && !selected && "group-hover:bg-slate-100", )}
								>
									{format(day, "d")}
								</span>
								{(hasContract ||
									hasDeadline ||
									hasLicense ||
									hasAudit) && (
									<div className="mt-0.5 flex h-1 gap-0.5">
										{hasContract && (
											<span
												className="h-1 w-1 rounded-full bg-[#0f5384]"
												aria-hidden
											/>
										)}
										{hasLicense && (
											<span
												className="h-1 w-1 rounded-full bg-[#03afbf]"
												aria-hidden
											/>
										)}
										{hasAudit && (
											<span
												className="h-1 w-1 rounded-full bg-[#a06ce2]"
												aria-hidden
											/>
										)}
										{hasDeadline && (
											<span
												className="h-1 w-1 rounded-full bg-orange"
												aria-hidden
											/>
										)}
									</div>
								)}
							</button>
						);
					})}
				</div>
			))}
		</div>
	);
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
	const [weekSnapDay, setWeekSnapDay] = useState<string | null>(null);
	const [isAddEventOpen, setIsAddEventOpen] = useState(false);
	const [creatingEvent, setCreatingEvent] = useState(false);
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

	// Use unified dashboard data for contracts; month-scoped events from calendar API
	const { orgId } = useOrganization();
	const { contracts, dashboardLicenses: licenses, isLoading: dashboardLoading, refresh } =
		useUnifiedDashboardData(orgId || "default_organization");
	const {
		events: monthCalendarEvents,
		isLoading: calendarLoading,
		refresh: refreshCalendar,
	} = useCalendarEvents({ month: currentMonth });

	const isLoading = dashboardLoading || calendarLoading;

	const allEvents = useMemo(() => {
		const fromCalendar: LocalCalendarEvent[] = monthCalendarEvents
			.filter((event) => event.startDate)
			.map((event) => ({
				id: event.id,
				title: event.title,
				date: event.startDate,
				type: event.type,
				description: event.description,
				participants: event.participants,
				contractName: event.contractName,
				amount: event.amount,
				startTime: event.startTime,
				endTime: event.endTime,
			}));

		const fromContracts = (contracts as Record<string, unknown>[]).flatMap(
			(contract) => {
				const expiry = contractExpiryToCalendarEvent(contract);
				const start = contractStartToCalendarEvent(contract);
				return [expiry, start].filter(
					(event): event is LocalCalendarEvent => event !== null,
				);
			},
		);

		const fromLicenses = licenses.flatMap((license) => {
			const record = license as unknown as Record<string, unknown>;
			const expiry = licenseExpiryToCalendarEvent(record);
			const issue = licenseIssueToCalendarEvent(record);
			return [expiry, issue].filter(
				(event): event is LocalCalendarEvent => event !== null,
			);
		});

		const merged = new Map<string, LocalCalendarEvent>();
		for (const event of [
			...fromCalendar,
			...fromContracts,
			...fromLicenses,
			...events,
		]) {
			const key = `${event.type}-${event.id}-${event.date?.toISOString() ?? ""}`;
			merged.set(key, event);
		}

		return Array.from(merged.values());
	}, [monthCalendarEvents, contracts, licenses, events]);

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

	const weekDayKey = (day: Date) => format(day, "yyyy-MM-dd");

	const handleWeekDayChipClick = (day: Date) => {
		handleDateSelect(day);
		setWeekSnapDay(weekDayKey(day));
	};

	useLayoutEffect(() => {
		if (!weekSnapDay || viewMode !== "week") return;
		const el = document.querySelector<HTMLElement>(
			`[data-week-day="${weekSnapDay}"]`,
		);
		const scroller = el?.closest<HTMLElement>("[data-week-list]");
		if (!el || !scroller) return;
		scroller.scrollTop = el.offsetTop;
	}, [weekSnapDay, viewMode]);

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
			license: {
				label: "License",
				color: "bg-[#03afbf]",
				borderColor: "#03afbf",
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
				refreshCalendar();
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
							<button
								type="button"
								aria-label={`Show events for ${format(day, "EEEE, MMMM d, yyyy")}`}
								className={cn( "mx-auto flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40", isToday(day) ? CALENDAR_TODAY_BADGE : selectedDate && isSameDay(day, selectedDate) ? "bg-blue/10 text-[#0f5384] ring-2 ring-[#0f5384]/30" : "text-slate-700 hover:bg-slate-100", )}
								onClick={() => handleWeekDayChipClick(day)}
							>
								{format(day, "d")}
							</button>
						</div>
					))}
				</div>

				{/* Week events list - scrollable container */}
				<div
					data-week-list
					className="relative h-[280px] overflow-y-auto border rounded-lg w-full pb-[280px]"
				>
					<div className="space-y-0">
						{weekDays.map((day) => {
							const dayEvents = allEvents.filter(
								(event) => event.date && isSameDay(event.date, day),
							);
							const isSelected = selectedDate && isSameDay(day, selectedDate);

							return (
								<div
									key={day.toISOString()}
									data-week-day={weekDayKey(day)}
									className={cn( "border-b border-slate-200 last:border-b-0 transition-colors", isSelected ? "bg-blue-50" : "hover:bg-slate-50", )}
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
															className={cn( "w-1 h-full rounded-full flex-shrink-0", config.color, )}
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

	const goToPrevMonth = () => {
		const prevMonth = new Date(currentMonth);
		prevMonth.setMonth(prevMonth.getMonth() - 1);
		handleMonthChange(prevMonth);
	};

	const goToNextMonth = () => {
		const nextMonth = new Date(currentMonth);
		nextMonth.setMonth(nextMonth.getMonth() + 1);
		handleMonthChange(nextMonth);
	};

	return (
		<div className="flex h-full w-full min-w-0 flex-col gap-3.5">
			<div className="flex items-baseline justify-between px-0.5">
				<h2 className={cn("text-left", CALENDAR_TOOLBAR_TITLE_CLASS)}>
					{format(currentMonth, "MMMM yyyy")}
				</h2>
				<CalendarLiveClock />
			</div>

			<div className="flex gap-1.5">
				<button
					type="button"
					onClick={goToToday}
					className={cn( CALENDAR_TAB_BASE, CALENDAR_TAB_INACTIVE, "shrink-0 px-3.5 sm:px-3.5", )}
				>
					Today
				</button>
				<button
					type="button"
					onClick={() => setViewMode("month")}
					aria-pressed={viewMode === "month"}
					className={cn( CALENDAR_TAB_BASE, "flex-1", viewMode === "month" ? CALENDAR_TAB_ACTIVE : CALENDAR_TAB_INACTIVE, )}
				>
					<Grid3X3 className="h-3.5 w-3.5" />
					Month
				</button>
				<button
					type="button"
					onClick={() => setViewMode("week")}
					aria-pressed={viewMode === "week"}
					className={cn( CALENDAR_TAB_BASE, "flex-1", viewMode === "week" ? CALENDAR_TAB_ACTIVE : CALENDAR_TAB_INACTIVE, )}
				>
					<CalendarDays className="h-3.5 w-3.5" />
					Week
				</button>
				<ExpandedCalendarView
					events={allEvents}
					onEventClick={onEventClick}
					onDateSelect={onDateSelect}
					onEventCreate={onEventCreate}
					user={user}
					showExpandLabel={false}
					triggerClassName="rounded-lg"
				/>
				{outlookConnected && (
					<div className="hidden shrink-0 items-center gap-1 self-center rounded-md bg-green/10 px-2 py-1 text-xs text-green sm:flex">
						<CheckCircle className="h-3 w-3" />
						<span>Outlook</span>
					</div>
				)}
			</div>

			<div
				className={cn( "w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white", CALENDAR_CARD_SHADOW, )}
			>
				{isLoading && (
					<div className="flex items-center justify-center py-4">
						<div className="h-5 w-5 animate-spin rounded-full border-b-2 border-[#0f5384]" />
					</div>
				)}

				<CalendarCalHead
					currentMonth={currentMonth}
					onPrevMonth={goToPrevMonth}
					onNextMonth={goToNextMonth}
					onToday={goToToday}
				/>

				{viewMode === "month" ? (
					<DashboardMonthMatrix
						currentMonth={currentMonth}
						selectedDate={selectedDate}
						events={allEvents}
						onSelectDate={(date) => handleDateSelect(date)}
					/>
				) : (
					<div className="px-3.5 pb-4 sm:px-[14px]">
						{WeekView()}
					</div>
				)}

				{viewMode === "month" && <CalendarLegend />}

				<div className="border-t border-slate-200 p-3.5">
					<Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
						<DialogTrigger asChild>
							<Button
								type="button"
								className="primary-btn h-11 w-full gap-2 rounded-lg sm:!w-full"
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
												onValueChange={(value) => {
													if (!isCreateEventType(value)) return;
													setNewEvent({ ...newEvent, type: value });
												}}
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
											className="flex min-h-[80px] w-full rounded-md border-[0.25px] border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#03afbf] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
	);
};

export default CalendarView;
