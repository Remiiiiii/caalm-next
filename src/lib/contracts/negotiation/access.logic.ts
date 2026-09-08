import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type NegotiationInvitee = {
	email: string;
	name: string;
};

export function generateNegotiationToken(): string {
	return randomBytes(32).toString("base64url");
}

export function hashNegotiationToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(rawToken: string, storedHash: string): boolean {
	const computed = hashNegotiationToken(rawToken);
	if (computed.length !== storedHash.length) return false;
	return timingSafeEqual(Buffer.from(computed), Buffer.from(storedHash));
}

export function isAccessValid(input: {
	expiresAt?: string | null;
	revokedAt?: string | null;
	now?: Date;
}): boolean {
	if (input.revokedAt) return false;
	if (!input.expiresAt) return false;
	const expires = new Date(input.expiresAt);
	if (Number.isNaN(expires.getTime())) return false;
	return expires.getTime() > (input.now || new Date()).getTime();
}

export function canCounterpartyComment(valid: boolean): boolean {
	return valid;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Normalize invitee rows from the invite dialog or stored JSON. */
export function normalizeInvitees(
	raw: Array<{ email?: string; name?: string } | string>,
): NegotiationInvitee[] {
	const byEmail = new Map<string, NegotiationInvitee>();
	for (const item of raw) {
		if (typeof item === "string") {
			const email = item.trim().toLowerCase();
			if (!EMAIL_RE.test(email)) continue;
			if (!byEmail.has(email)) {
				byEmail.set(email, { email, name: "" });
			}
			continue;
		}
		const email = String(item.email || "")
			.trim()
			.toLowerCase();
		const name = String(item.name || "").trim();
		if (!EMAIL_RE.test(email) || !name) continue;
		byEmail.set(email, { email, name });
	}
	return [...byEmail.values()];
}

export function parseInviteesJson(
	raw: unknown,
	fallbackEmail = "",
	fallbackName = "",
): NegotiationInvitee[] {
	if (typeof raw === "string" && raw.trim()) {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (Array.isArray(parsed)) {
				const invitees = normalizeInvitees(
					parsed as Array<{ email?: string; name?: string }>,
				);
				if (invitees.length > 0) return invitees;
			}
		} catch {
			/* fall through to single-invitee fallback */
		}
	}
	const email = fallbackEmail.trim().toLowerCase();
	const name = fallbackName.trim();
	if (EMAIL_RE.test(email) && name) return [{ email, name }];
	if (EMAIL_RE.test(email)) return [{ email, name: name || email }];
	return [];
}

export function serializeInvitees(invitees: NegotiationInvitee[]): string {
	return JSON.stringify(invitees);
}

export function findInvitee(
	invitees: NegotiationInvitee[],
	email: string,
): NegotiationInvitee | null {
	const key = email.trim().toLowerCase();
	return invitees.find((row) => row.email === key) || null;
}

/** Active invitees across non-revoked links (safe for client + server). */
export function flattenActiveInvitees(
	accessRows: Array<{
		expiresAt?: string;
		revokedAt?: string;
		invitees?: NegotiationInvitee[];
	}>,
	now = new Date(),
): NegotiationInvitee[] {
	const byEmail = new Map<string, NegotiationInvitee>();
	for (const row of accessRows) {
		if (
			!isAccessValid({
				expiresAt: row.expiresAt,
				revokedAt: row.revokedAt,
				now,
			})
		) {
			continue;
		}
		for (const invitee of row.invitees || []) {
			if (!byEmail.has(invitee.email)) {
				byEmail.set(invitee.email, invitee);
			}
		}
	}
	return [...byEmail.values()];
}
