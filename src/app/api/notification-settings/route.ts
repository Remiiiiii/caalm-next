import { type NextRequest, NextResponse } from "next/server";
import { addUserSmsTarget } from "@/lib/actions/user.actions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";
import { notificationService } from "@/lib/services/notificationService";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");
		if (!userId) {
			return NextResponse.json(
				{ error: "User ID is required" },
				{ status: 400 },
			);
		}

		// Cache key for notification settings
		const cacheKey = CACHE_KEYS.notifications.settings(userId);

		// Fetch notification settings with caching (10 minutes TTL)
		const settings = await CacheManager.withCache(
			"notifications/settings",
			cacheKey,
			async () => await notificationService.getNotificationSettings(userId),
		);

		return NextResponse.json({ data: settings });
	} catch (error) {
		console.error("Failed to get notification settings:", error);
		return NextResponse.json(
			{ error: "Failed to get notification settings" },
			{ status: 500 },
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		if (!body?.userId) {
			return NextResponse.json(
				{ error: "userId is required" },
				{ status: 400 },
			);
		}

		const updated = await notificationService.upsertNotificationSettings({
			userId: body.userId,
			emailEnabled: body.emailEnabled,
			pushEnabled: body.pushEnabled,
			desktopAlertsEnabled: body.desktopAlertsEnabled,
			phoneNumber: body.phoneNumber,
			notificationTypes: body.notificationTypes,
			frequency: body.frequency,
		});

		// Invalidate notification settings cache for this user
		const cacheKey = CACHE_KEYS.notifications.settings(body.userId);
		await CacheManager.invalidate(cacheKey);

		// If a phoneNumber was provided and appears valid E.164, add/update Auth SMS target
		if (
			typeof body.phoneNumber === "string" &&
			/^\+\d{10,15}$/.test(body.phoneNumber)
		) {
			try {
				await addUserSmsTarget({
					userId: body.userId,
					e164Phone: body.phoneNumber,
				});
			} catch (e) {
				console.warn("Failed to create SMS target:", e);
				// Do not fail the request if SMS target creation fails; settings upsert succeeded
			}
		}

		return NextResponse.json({ data: updated });
	} catch (error) {
		console.error("Failed to update notification settings:", error);
		return NextResponse.json(
			{ error: "Failed to update notification settings" },
			{ status: 500 },
		);
	}
}
