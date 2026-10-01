import { type NextRequest, NextResponse } from "next/server";
import {
	applyMessageAction,
	getMessage,
	type OutlookMailAction,
} from "@/lib/microsoft/mail-client";
import { requireOutlookMailAccess } from "@/lib/microsoft/require-mail-access";

const ALLOWED_ACTIONS = new Set<OutlookMailAction>([
	"archive",
	"unarchive",
	"trash",
	"untrash",
	"markRead",
	"markUnread",
]);

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const access = await requireOutlookMailAccess(request);
	if (!access.ok) return access.response;

	const { id } = await context.params;

	try {
		const message = await getMessage(access.accessToken, id);
		return NextResponse.json({ message });
	} catch (error) {
		console.error("[SERVER] Outlook mail get message:", error);
		return NextResponse.json(
			{
				error: "Failed to load message",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 502 },
		);
	}
}

export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const access = await requireOutlookMailAccess(request);
	if (!access.ok) return access.response;

	const { id } = await context.params;

	try {
		const body = await request.json();
		const action = String(body.action || "") as OutlookMailAction;
		if (!ALLOWED_ACTIONS.has(action)) {
			return NextResponse.json(
				{ error: "Invalid action", allowed: [...ALLOWED_ACTIONS] },
				{ status: 400 },
			);
		}

		await applyMessageAction(access.accessToken, id, action);
		return NextResponse.json({ success: true, action });
	} catch (error) {
		console.error("[SERVER] Outlook mail message action:", error);
		const details = error instanceof Error ? error.message : "Unknown error";
		const needsReconnect =
			/insufficient|AccessDenied|403|MailboxNotEnabledForRESTAPI/i.test(
				details,
			);
		return NextResponse.json(
			{
				error: needsReconnect
					? "Outlook Mail needs to be reconnected to allow archive and delete. Disconnect and connect again in Settings."
					: "Failed to update message",
				code: needsReconnect ? "outlook_mail_reconnect_required" : undefined,
				details,
			},
			{ status: needsReconnect ? 403 : 502 },
		);
	}
}
