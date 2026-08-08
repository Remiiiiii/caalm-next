import { type NextRequest, NextResponse } from "next/server";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import {
	type PushSubscriptionJSON,
	savePushSubscription,
} from "@/lib/push/notifications-server";
import { notificationService } from "@/lib/services/notificationService";

async function resolveSessionUserId(): Promise<string | null> {
	let user = await getCurrentUser();
	if (!user) {
		user = await getCurrentUserFrom2FA();
	}
	if (!user) return null;
	// Prefer Auth account id (matches notification userId / settings user_id)
	const accountId =
		(user as { accountId?: string }).accountId || user.$id || null;
	return accountId;
}

export async function POST(request: NextRequest) {
	try {
		const userId = await resolveSessionUserId();
		if (!userId) {
			return NextResponse.json({ error: "Authentication required" }, { status: 401 });
		}

		const body = await request.json();
		const subscription = body?.subscription as PushSubscriptionJSON | undefined;
		if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
			return NextResponse.json(
				{ error: "Valid PushSubscription JSON is required" },
				{ status: 400 },
			);
		}

		await savePushSubscription(userId, subscription);
		await notificationService.upsertNotificationSettings({
			userId,
			desktopAlertsEnabled: true,
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[desktop-push] subscribe failed:", error);
		return NextResponse.json(
			{ error: "Failed to subscribe to desktop alerts" },
			{ status: 500 },
		);
	}
}
