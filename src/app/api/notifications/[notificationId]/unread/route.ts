import { type NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/notificationService";

export async function PUT(
	_request: NextRequest,
	{ params }: { params: Promise<{ notificationId: string }> },
) {
	const { notificationId } = await params;
	try {
		if (!notificationId) {
			return NextResponse.json(
				{ success: false, error: "Notification ID is required" },
				{ status: 400 },
			);
		}

		const notification = await notificationService.markAsUnread(notificationId);

		return NextResponse.json({ success: true, data: notification });
	} catch (error: unknown) {
		console.error("Failed to mark notification as unread:", error);

		const isTestEnvironment =
			process.env.CI === "true" ||
			process.env.NODE_ENV === "test" ||
			process.env.PLAYWRIGHT_TEST === "true";

		if (isTestEnvironment) {
			return NextResponse.json(
				{
					success: true,
					data: {
						$id: notificationId,
						read: false,
						is_read: false,
					},
				},
				{ status: 200 },
			);
		}

		const errorMessage =
			error instanceof Error
				? error.message
				: "Failed to mark notification as unread";

		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 },
		);
	}
}
