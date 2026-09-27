import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { getConstituentById } from "@/lib/constituents/repository";
import { listWealthScreensForConstituent } from "@/lib/fundraising/wealth-repository";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	const items = await listWealthScreensForConstituent(ctx.orgId, id);
	return NextResponse.json({ items });
}
