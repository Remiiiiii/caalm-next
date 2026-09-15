/** Default waiting period after an admin requests tenant deletion. */
export const TENANT_DELETION_GRACE_DAYS = 14;

export type TenantDeletionSettings = {
	deletionRequestedAt?: string;
	deletionScheduledAt?: string;
	deletionRequestedByUserId?: string;
	deletionRequestedByEmail?: string;
	deletionCancelledAt?: string;
};

export function parseOrgSettings(raw: unknown): Record<string, unknown> {
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	if (raw && typeof raw === "object") {
		return raw as Record<string, unknown>;
	}
	return {};
}

export function readTenantDeletionSettings(
	settings: Record<string, unknown>,
): TenantDeletionSettings {
	return {
		deletionRequestedAt:
			typeof settings.deletionRequestedAt === "string"
				? settings.deletionRequestedAt
				: undefined,
		deletionScheduledAt:
			typeof settings.deletionScheduledAt === "string"
				? settings.deletionScheduledAt
				: undefined,
		deletionRequestedByUserId:
			typeof settings.deletionRequestedByUserId === "string"
				? settings.deletionRequestedByUserId
				: undefined,
		deletionRequestedByEmail:
			typeof settings.deletionRequestedByEmail === "string"
				? settings.deletionRequestedByEmail
				: undefined,
		deletionCancelledAt:
			typeof settings.deletionCancelledAt === "string"
				? settings.deletionCancelledAt
				: undefined,
	};
}

export function computeDeletionScheduledAt(
	requestedAt: Date,
	graceDays = TENANT_DELETION_GRACE_DAYS,
): Date {
	const scheduled = new Date(requestedAt.getTime());
	scheduled.setUTCDate(scheduled.getUTCDate() + graceDays);
	return scheduled;
}

export function isDeletionGraceElapsed(
	scheduledAt: string | undefined,
	now = new Date(),
): boolean {
	if (!scheduledAt) return false;
	const due = Date.parse(scheduledAt);
	return Number.isFinite(due) && due <= now.getTime();
}

export function buildDeletionRequestSettings(input: {
	existingSettings: Record<string, unknown>;
	requestedAt: Date;
	userId: string;
	userEmail: string;
	graceDays?: number;
}): Record<string, unknown> {
	const scheduledAt = computeDeletionScheduledAt(
		input.requestedAt,
		input.graceDays,
	);
	return {
		...input.existingSettings,
		deletionRequestedAt: input.requestedAt.toISOString(),
		deletionScheduledAt: scheduledAt.toISOString(),
		deletionRequestedByUserId: input.userId,
		deletionRequestedByEmail: input.userEmail,
		deletionCancelledAt: "",
	};
}

export function buildDeletionCancelSettings(
	existingSettings: Record<string, unknown>,
	cancelledAt = new Date(),
): Record<string, unknown> {
	const next = { ...existingSettings };
	delete next.deletionRequestedAt;
	delete next.deletionScheduledAt;
	delete next.deletionRequestedByUserId;
	delete next.deletionRequestedByEmail;
	next.deletionCancelledAt = cancelledAt.toISOString();
	return next;
}
