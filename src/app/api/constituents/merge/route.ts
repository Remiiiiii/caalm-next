import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	commitConstituentMerge,
	requireConstituentOrgContext,
} from "@/lib/constituents";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const winnerId = String(body.winnerId || "").trim();
		const loserId = String(body.loserId || "").trim();
		if (!winnerId || !loserId) {
			return NextResponse.json(
				{ error: "winnerId and loserId are required" },
				{ status: 400 },
			);
		}

		const result = await commitConstituentMerge({
			winnerId,
			loserId,
			orgId: ctx.orgId,
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.fullName || ctx.user.email || "",
				userEmail: ctx.user.email || "",
			},
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}
		return NextResponse.json({
			winnerId: result.winnerId,
			loserId: result.loserId,
		});
	} catch (error) {
		console.error("[SERVER] constituent merge:", error);
		return NextResponse.json(
			{ error: "Failed to merge constituents" },
			{ status: 500 },
		);
	}
}
