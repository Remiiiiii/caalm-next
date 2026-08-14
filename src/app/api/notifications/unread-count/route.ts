import { type NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/services/notificationService";

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId") || searchParams.get("user_id");

		if (!userId) {
			return NextResponse.json(
				{
					error: "Missing required parameter: user_id",
					message: "user_id is required for unread count endpoint",
				},
				{ status: 400 },
			);
		}

		const count = await notificationService.getUnreadCount(userId);

		return NextResponse.json({ success: true, data: { count }, count });
	} catch (error: unknown) {
		console.error("Failed to get unread count:", error);

		// Bell badge is best-effort; avoid 500s that spam the client console
		return NextResponse.json({ success: true, data: { count: 0 }, count: 0 });
	}
}
