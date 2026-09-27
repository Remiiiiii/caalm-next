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

export type VolunteerHourSource = "proxy" | "self";
export type VolunteerHourApprovalStatus = "pending" | "approved";

export type VolunteerHourLog = {
	$id: string;
	orgId: string;
	eventId: string;
	volunteerConstituentId: string;
	actorUserId: string;
	source: VolunteerHourSource;
	minutesWorked: number;
	approvalStatus: VolunteerHourApprovalStatus;
	approvedByUserId?: string;
	approvedAt?: string;
	grantContractId?: string;
	roleLabel?: string;
	workedAt: string;
	$createdAt: string;
	$updatedAt: string;
};

export type VolunteerWaiverRecord = {
	$id: string;
	orgId: string;
	constituentId: string;
	envelopeId?: string;
	documentFileId: string;
	status: "draft" | "sent" | "completed";
	createdBy: string;
	$createdAt: string;
	$updatedAt: string;
};
