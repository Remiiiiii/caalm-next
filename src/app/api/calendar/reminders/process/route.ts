import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getCalendarEventById } from "@/lib/actions/calendar.actions";
import { getUserByAccountId } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { sendReminderNotification } from "@/lib/services/calendar-notifications.service";
import { zonedWallTimeToUtc } from "@/lib/timezone";
import { getOrganizationTimezone } from "@/lib/timezone/org";

/**
 * POST /api/calendar/reminders/process
 * Process pending reminders that are due to be sent
 * This endpoint should be called by a cron job or scheduler
 */
export async function POST(request: NextRequest) {
	try {
		// Optional: Add authentication for scheduler
		const authHeader = request.headers.get("authorization");
		const schedulerSecret = process.env.SCHEDULER_SECRET;

		if (schedulerSecret && authHeader !== `Bearer ${schedulerSecret}`) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { tablesDB } = await createAdminClient();
		const remindersCollectionId =
			process.env.NEXT_PUBLIC_APPWRITE_CALENDAR_REMINDERS_COLLECTION ||
			"calendar_reminders";

		const now = new Date();
		const _nowISO = now.toISOString();

		// Get all unsent reminders
		const remindersResponse = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: remindersCollectionId,
			queries: [Query.equal("isSent", false), Query.orderAsc("createdAt")],
		});

		const reminders = remindersResponse.rows;
		const processedReminders: string[] = [];
		const failedReminders: string[] = [];

		for (const reminder of reminders) {
			try {
				// Get event details
				const event = await getCalendarEventById(reminder.eventId);
				if (!event) {
					console.warn(
						`[SERVER] processReminders] Event not found: ${reminder.eventId}`,
					);
					continue;
				}

				const timeZone = await getOrganizationTimezone(
					typeof (event as { orgId?: string }).orgId === "string"
						? (event as { orgId?: string }).orgId
						: null,
				);
				const dateKey = String(event.startDate).split("T")[0];
				const [year, month, day] = dateKey.split("-").map(Number);
				const [hours, minutes] = (event.startTime || "00:00")
					.split(":")
					.map(Number);
				const eventStart =
					year && month && day
						? zonedWallTimeToUtc(
								{
									year,
									month,
									day,
									hour: hours || 0,
									minute: minutes || 0,
								},
								timeZone,
							)
						: new Date(event.startDate);

				const reminderTime = new Date(eventStart);
				reminderTime.setMinutes(
					reminderTime.getMinutes() - reminder.reminderMinutes,
				);

				// Check if reminder should be sent now (within 1 minute window)
				const timeDiff = now.getTime() - reminderTime.getTime();
				if (timeDiff < 0 || timeDiff > 60000) {
					// Not yet time or more than 1 minute past
					continue;
				}

				// Get user details
				const user = await getUserByAccountId(reminder.userId);
				const userEmail = user?.email;
				const userPhone = user?.phone;

				// Send reminder
				await sendReminderNotification(
					reminder as unknown as {
						$id: string;
						eventId: string;
						userId: string;
						reminderType: "before_start" | "before_end" | "custom";
						reminderMinutes: number;
						channels: Array<"in_app" | "email" | "sms" | "push">;
						isSent: boolean;
						sentAt?: string;
						createdAt: string;
					},
					event.title,
					event.startDate,
					event.startTime || "00:00",
					userEmail,
					userPhone,
				);

				processedReminders.push(reminder.$id);
			} catch (error) {
				console.error(
					`[SERVER] processReminders] Error processing reminder ${reminder.$id}:`,
					error,
				);
				failedReminders.push(reminder.$id);
			}
		}

		return NextResponse.json({
			success: true,
			processed: processedReminders.length,
			failed: failedReminders.length,
			processedReminders,
			failedReminders,
		});
	} catch (error) {
		console.error(
			"[SERVER] POST /api/calendar/reminders/process] Error:",
			error,
		);
		return NextResponse.json(
			{
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Failed to process reminders",
			},
			{ status: 500 },
		);
	}
}
