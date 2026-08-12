import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getRecentActivities } from "@/lib/actions/recentActivity.actions";
import { listAllUsers } from "@/lib/actions/user.actions";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		// Fetch users
		const users = await listAllUsers();
		const totalUsers = users?.length || 0;
		const activeUsers = users?.filter((u) => u.status === "active").length || 0;
		const pendingUsers =
			users?.filter((u) => u.status === "pending").length || 0;

		// Fetch recent activities
		const activities = await getRecentActivities(100); // Get more activities for admin view
		const totalActivities = activities?.length || 0;
		const recentActivities =
			activities?.filter((a) => {
				const activityDate = new Date(a.timestamp);
				const oneDayAgo = new Date();
				oneDayAgo.setDate(oneDayAgo.getDate() - 1);
				return activityDate > oneDayAgo;
			}).length || 0;

		// Determine system health based on various metrics
		let systemHealth: "good" | "warning" | "critical" = "good";
		if (pendingUsers > totalUsers * 0.1) {
			systemHealth = "warning";
		}
		if (pendingUsers > totalUsers * 0.2 || totalUsers === 0) {
			systemHealth = "critical";
		}

		const stats = {
			totalUsers,
			activeUsers,
			pendingUsers,
			totalActivities,
			recentActivities,
			systemHealth,
		};

		return NextResponse.json(stats);
	} catch (error) {
		console.error("Error fetching admin stats:", error);
		return NextResponse.json(
			{ error: "Failed to fetch admin statistics" },
			{ status: 500 },
		);
	}
}
