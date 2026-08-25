import type { CalendarSource } from "@/components/calendar/eventChipStyles";
import type {
	CalendarApprovalStatus,
	CalendarSensitivity,
	PermissionOverrideRecord,
} from "@/constants/rbac";

/** Event attachments are stored as file IDs (references to files collection). */
export interface EventAttachment {
	$id: string;
	name?: string;
	url?: string;
	type?: string;
	extension?: string;
	size?: number;
	bucketFileId?: string;
}

export type CalendarViewMode = "day" | "week" | "month" | "agenda";

export type LocalCalendarEventType =
	| "contract review"
	| "deadline discussion"
	| "meeting"
	| "internal review"
	| "audit";

export interface LocalCalendarEvent {
	$id?: string;
	id?: string;
	title: string;
	startDate: string | Date;
	endDate?: string | Date;
	type: LocalCalendarEventType;
	description?: string;
	startTime?: string;
	endTime?: string;
	contractName?: string;
	participants?: string;
	location?: string;
	resourceId?: string;
	createdBy?: string;
	createdByAccountId?: string;
	createdByUserId?: string;
	outlook_id?: string;
	attachments?: Array<EventAttachment | string>;
	sensitivityLevel?: CalendarSensitivity;
	approvalStatus?: CalendarApprovalStatus;
	requiresApproval?: boolean;
	pendingApprovalId?: string | null;
	overrides?: PermissionOverrideRecord[];
	source?: CalendarSource;
}

export interface EventReminderConfigData {
	type: "before_start" | "before_end" | "custom";
	minutes: number;
	channels: Array<"in_app" | "email" | "sms" | "push">;
}

export interface NewEventForm {
	title: string;
	date: Date;
	endDate: Date;
	type: LocalCalendarEventType;
	description: string;
	startTime: string;
	endTime: string;
	contractName: string;
	participants: string;
	location: string;
	attachments?: EventAttachment[];
	sensitivityLevel: CalendarSensitivity;
	reminders?: EventReminderConfigData[];
}

export interface ParticipantOption {
	$id: string;
	fullName?: string;
	name?: string;
	email: string;
}

export interface CalendarUser {
	$id: string;
	fullName?: string;
	role?: string;
	department?: string;
	accountId?: string;
	email?: string;
}

export interface OutlookStyleCalendarProps {
	events?: LocalCalendarEvent[];
	onDateSelect?: (date: Date) => void;
	user?: CalendarUser | null;
}
