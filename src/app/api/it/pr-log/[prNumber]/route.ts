import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getPrLogPullRequest, PrLogError } from "@/lib/it/pr-log/service";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ prNumber: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.IT.VIEW_ROADMAP,
	});
	if (denied) return denied;

	try {
		const { prNumber: raw } = await context.params;
		const prNumber = Number(raw);
		const pullRequest = await getPrLogPullRequest(prNumber);
		return NextResponse.json({ pullRequest });
	} catch (error) {
		if (error instanceof PrLogError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: error.status },
			);
		}
		console.error("[SERVER] it/pr-log/[prNumber]:", error);
		return NextResponse.json(
			{ error: "Failed to load pull request" },
			{ status: 500 },
		);
	}
}
