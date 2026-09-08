import type { NextRequest } from "next/server";
import { findInvitee } from "./access.logic";
import type { NegotiationAccess, NegotiationInvitee } from "./access.service";
import {
	decodeNegotiateSession,
	NEGOTIATE_SESSION_COOKIE,
	type NegotiateSessionPayload,
} from "./session.logic";

export type ResolvedNegotiateSession = {
	session: NegotiateSessionPayload;
	invitee: NegotiationInvitee;
};

/**
 * Read the httpOnly negotiate cookie and confirm the email is still
 * on this access row's invitee allowlist.
 */
export function resolveNegotiateSession(
	request: NextRequest,
	access: NegotiationAccess,
): ResolvedNegotiateSession | null {
	const raw = request.cookies.get(NEGOTIATE_SESSION_COOKIE)?.value;
	const session = decodeNegotiateSession(raw);
	if (!session) return null;
	if (session.accessId !== access.$id) return null;
	const invitee = findInvitee(access.invitees, session.email);
	if (!invitee) return null;
	return { session, invitee };
}
