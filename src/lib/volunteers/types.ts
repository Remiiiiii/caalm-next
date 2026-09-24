export type VolunteerShiftTemplate = {
	$id: string;
	orgId: string;
	name: string;
	roleLabel: string;
	durationMinutes: number;
	skillsRequired: string[];
	defaultCapacity: number;
	$createdAt: string;
	$updatedAt: string;
};

export type CreateVolunteerShiftTemplateInput = {
	orgId: string;
	name: string;
	roleLabel: string;
	durationMinutes: number;
	skillsRequired?: string[];
	defaultCapacity: number;
};

export type UpdateVolunteerShiftTemplateInput = Partial<
	Omit<CreateVolunteerShiftTemplateInput, "orgId">
>;

export type VolunteerShiftBookingStatus = "confirmed" | "waitlist";

export type VolunteerShiftBooking = {
	$id: string;
	orgId: string;
	eventId: string;
	constituentId: string;
	status: VolunteerShiftBookingStatus;
	$createdAt: string;
	$updatedAt: string;
};

export type VolunteerProfileFields = {
	skills?: string;
	availability?: string;
	emergencyContact?: string;
	backgroundCheckDate?: string | null;
};

export type VolunteerProfilePublic = Omit<
	VolunteerProfileFields,
	"backgroundCheckDate"
>;
