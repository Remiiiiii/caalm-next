import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";

export async function GET() {
	try {
		const user = await getCurrentUser();

		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		return NextResponse.json(user);
	} catch (error) {
		console.error("Error fetching current user:", error);
		return NextResponse.json(
			{ error: "Failed to fetch current user" },
			{ status: 500 },
		);
	}
}
