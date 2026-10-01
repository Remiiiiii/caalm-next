import type { NextRequest } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getValidOutlookMailAccessToken } from "@/lib/actions/outlook-mail-integration.actions";
import { getCurrentUserId } from "@/lib/microsoft/auth-utils";
import { requirePermission } from "@/lib/rbac/middleware";

type MailAccessDenied = { ok: false; response: Response };
type MailAccessGranted = {
	ok: true;
	userId: string;
	accessToken: string;
	email: string;
};

export async function requireOutlookMailAccess(
	request: NextRequest,
): Promise<MailAccessDenied | MailAccessGranted> {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT,
	});
	if (denied) return { ok: false, response: denied };

	let userId: string;
	try {
		userId = await getCurrentUserId();
	} catch {
		return {
			ok: false,
			response: Response.json(
				{ error: "Authentication required" },
				{ status: 401 },
			),
		};
	}

	const token = await getValidOutlookMailAccessToken(userId);
	if (!token) {
		return {
			ok: false,
			response: Response.json(
				{
					error: "Outlook mail not connected",
					code: "outlook_mail_not_connected",
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
