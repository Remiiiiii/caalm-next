import { PERMISSIONS } from "@/constants/permissions";
import { getValidGmailAccessToken } from "@/lib/actions/gmail-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";
import type { NextRequest } from "next/server";

type GmailAccessDenied = { ok: false; response: Response };
type GmailAccessGranted = {
	ok: true;
	userId: string;
	accessToken: string;
	email: string;
};

export async function requireGmailAccess(
	request: NextRequest,
): Promise<GmailAccessDenied | GmailAccessGranted> {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.GMAIL_MANAGE,
	});
	if (denied) return { ok: false, response: denied };

	let userId: string;
	try {
		userId = await getCurrentUserId();
	} catch {
		return {
			ok: false,
			response: Response.json({ error: "Authentication required" }, {
				status: 401,
			}),
		};
	}

	const token = await getValidGmailAccessToken(userId);
	if (!token) {
		return {
			ok: false,
			response: Response.json(
				{
					error: "Gmail not connected",
					code: "gmail_not_connected",
				},
				{ status: 403 },
			),
		};
	}

	return {
		ok: true,
		userId,
		accessToken: token.accessToken,
		email: token.email,
	};
}
