import { NextResponse } from "next/server";
import { getAllAuthUsers } from "@/lib/actions/user.actions";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

export async function GET() {
	try {
		const authUsers = await CacheManager.withCache(
			"dashboard/auth-users",
			CACHE_KEYS.dashboardAuthUsers(),
			async () => getAllAuthUsers(),
		);

		return NextResponse.json({ data: authUsers });
	} catch (error) {
		console.error("Failed to fetch dashboard auth users:", error);
		return NextResponse.json(
			{ error: "Failed to fetch dashboard auth users" },
			{ status: 500 },
		);
	}
}
