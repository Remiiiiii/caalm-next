import { NextResponse } from "next/server";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import { removePushSubscription } from "@/lib/push/notifications-server";
import { notificationService } from "@/lib/services/notificationService";

async function resolveSessionUserId(): Promise<string | null> {
	let user = await getCurrentUser();
	if (!user) {
		user = await getCurrentUserFrom2FA();
	}
	if (!user) return null;
	const accountId =
		(user as { accountId?: string }).accountId || user.$id || null;
	return accountId;
}

export async function POST() {
	try {
		const userId = await resolveSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		await removePushSubscription(userId);
		await notificationService.upsertNotificationSettings({
			userId,
			desktopAlertsEnabled: false,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[desktop-push] unsubscribe failed:", error);
		return NextResponse.json(
			{ error: "Failed to unsubscribe from desktop alerts" },
			{ status: 500 },
		);
	}
}
