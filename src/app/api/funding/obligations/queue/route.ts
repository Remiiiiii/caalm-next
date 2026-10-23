import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { buildObligationQueue } from "@/lib/funding";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

function parsePositiveInt(value: string | null, fallback: number): number {
	if (!value) return fallback;
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.FUNDING.VIEW,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const params = request.nextUrl.searchParams;
	const overdueRaw = params.get("overdueOnly");
	const dueRaw = params.get("dueWithinDays");
	const dueParsed = dueRaw != null ? Number(dueRaw) : undefined;

	try {
		const result = await buildObligationQueue({
			orgId: org.orgId,
			ownerName: params.get("owner") || undefined,
			overdueOnly: overdueRaw === "1" || overdueRaw === "true",
			dueWithinDays:
				dueParsed != null && Number.isFinite(dueParsed) && dueParsed > 0
					? dueParsed
					: undefined,
			search: params.get("search") || undefined,
			page: parsePositiveInt(params.get("page"), 1),
			pageSize: parsePositiveInt(params.get("pageSize"), 20),
		});
		return NextResponse.json(result);
	} catch (error) {
		console.error("[funding/obligations/queue GET]", error);
		return NextResponse.json(
			{ error: "Failed to load obligation queue" },
			{ status: 500 },
		);
	}
}
