import {
	createConstituentWithDuplicateGate,
	getConstituentById,
} from "@/lib/constituents";
import {
	getRegistrationById,
	markRegistrationCheckedIn,
} from "./event-registrations.repository";
import {
	type VerifyRegistrationTokenResult,
	verifyRegistrationToken,
} from "./registration-token";
import { getTicketTypeById } from "./ticket-types.repository";

export type CheckInRegistrationResult =
	| {
			ok: true;
			firstName: string;
			ticketTypeName: string;
	  }
	| {
			ok: false;
			status: 400 | 404 | 409;
			error: string;
			reason?: VerifyRegistrationTokenResult extends { ok: false }
				? VerifyRegistrationTokenResult["reason"]
				: never;
	  };

function guestDisplayName(reg: {
	guestFirstName?: string;
	guestLastName?: string;
	guestEmail?: string;
}): string {
	const name = `${reg.guestFirstName || ""} ${reg.guestLastName || ""}`.trim();
	if (name) return name;
	return reg.guestEmail || "Guest";
}

export async function checkInWithRegistrationToken(input: {
	token: string;
	actor: {
		userId: string;
		userName: string;
		userEmail: string;
	};
}): Promise<CheckInRegistrationResult> {
	const registrationIdGuess = input.token.split(".")[0];
	if (!registrationIdGuess) {
		return { ok: false, status: 400, error: "Invalid token", reason: "invalid" };
	}

	// Load registration first so we can pass tokenUsedAt into verify.
	const orgIdFromToken = input.token.split(".")[1];
	if (!orgIdFromToken) {
		return { ok: false, status: 400, error: "Invalid token", reason: "invalid" };
	}

	const registration = await getRegistrationById(
		orgIdFromToken,
		registrationIdGuess,
	);
	if (!registration) {
		return { ok: false, status: 404, error: "Registration not found" };
	}

	const verified = verifyRegistrationToken(input.token, {
		tokenUsedAt: registration.tokenUsedAt ?? registration.checkedInAt,
	});
	if (!verified.ok) {
		if (verified.reason === "already_used") {
			return {
				ok: false,
				status: 409,
				error: "Already checked in",
				reason: "already_used",
			};
		}
		return {
			ok: false,
			status: 400,
			error: "Invalid or expired token",
			reason: verified.reason,
		};
	}

	if (verified.parsed.orgId !== registration.orgId) {
		return { ok: false, status: 400, error: "Invalid token", reason: "invalid" };
	}

	if (registration.checkedInAt) {
		return {
			ok: false,
			status: 409,
			error: "Already checked in",
			reason: "already_used",
		};
	}

	const ticketType = await getTicketTypeById(
		registration.orgId,
		registration.ticketTypeId,
	);
	if (!ticketType) {
		return { ok: false, status: 404, error: "Ticket type not found" };
	}

	let constituentId = registration.constituentId;
	if (!constituentId) {
		const email = registration.guestEmail?.trim();
		if (!email) {
			return {
				ok: false,
				status: 400,
				error: "Registration has no guest email for constituent creation",
			};
		}
		const firstName = registration.guestFirstName?.trim() || "Event";
		const lastName = registration.guestLastName?.trim() || "Guest";
		const created = await createConstituentWithDuplicateGate({
			payload: {
				orgId: registration.orgId,
				type: "other",
				firstName,
				lastName,
				email,
				doNotContact: false,
			},
			force: false,
			actor: input.actor,
		});
		if (!created.ok) {
			if (created.status === 409 && created.candidates[0]) {
				constituentId = created.candidates[0].$id;
			} else {
				return {
					ok: false,
					status: 409,
					error: "Could not create or match constituent",
				};
			}
		} else {
			constituentId = created.constituent.$id;
		}
	}

	const checkedInAt = new Date().toISOString();
	const updated = await markRegistrationCheckedIn({
		orgId: registration.orgId,
		registrationId: registration.$id,
		constituentId,
		checkedInAt,
	});

	let firstName =
		registration.guestFirstName?.trim() ||
		guestDisplayName(registration).split(/\s+/)[0] ||
		"Guest";
	if (constituentId) {
		const constituent = await getConstituentById(constituentId);
		if (constituent?.firstName?.trim()) {
			firstName = constituent.firstName.trim();
		}
	}

	void updated;

	return {
		ok: true,
		firstName,
		ticketTypeName: ticketType.name,
	};
}
