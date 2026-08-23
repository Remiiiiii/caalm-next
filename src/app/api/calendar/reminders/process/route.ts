import { type NextRequest, NextResponse } from "next/server";
import { runCalendarNotificationCron } from "@/lib/services/calendar-notifications.service";

/**
 * POST /api/calendar/reminders/process
 * Manual scheduler trigger. Production cron uses GET /api/cron/calendar-reminders.
 */
export async function POST(request: NextRequest) {
	try {
		const authHeader = request.headers.get("authorization");
		const schedulerSecret = process.env.SCHEDULER_SECRET;

		if (schedulerSecret && authHeader !== `Bearer ${schedulerSecret}`) {
			return NextResponse.json(
				{ success: false, message: "Unauthorized" },
				{ status: 401 },
			);
		}

		const result = await runCalendarNotificationCron();
		return NextResponse.json({
			success: true,
			processed: result.remindersProcessed,
			failed: result.remindersFailed,
			...result,
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
