export type EventTicketType = {
	$id: string;
	orgId: string;
	eventId: string;
	name: string;
	capacity: number;
	amountCents: number;
	$createdAt: string;
	$updatedAt: string;
};

export type EventRegistrationStatus =
	| "draft"
	| "posted"
	| "confirmed"
	| "checked_in";

export type EventRegistration = {
	$id: string;
	orgId: string;
	eventId: string;
	ticketTypeId: string;
	status: EventRegistrationStatus;
	constituentId?: string;
	guestEmail?: string;
	guestFirstName?: string;
	guestLastName?: string;
	amountCents: number;
	checkedInAt?: string;
	tokenUsedAt?: string;
	$createdAt: string;
	$updatedAt: string;
};

export const EVENT_REGISTRATION_CAPACITY_STATUSES: EventRegistrationStatus[] = [
	"posted",
	"confirmed",
];

export function registrationStatusConsumesCapacity(
	status: EventRegistrationStatus,
): boolean {
	return EVENT_REGISTRATION_CAPACITY_STATUSES.includes(status);
}
