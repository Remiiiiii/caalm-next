import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createPreferenceToken,
	preferenceCenterUrl,
} from "@/lib/constituents/preference-token";
import {
	getConstituentById,
	requireConstituentOrgContext,
} from "@/lib/constituents/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	const token = createPreferenceToken(ctx.orgId, id);
	const origin = request.nextUrl.origin;
	return NextResponse.json({
		token,
		url: preferenceCenterUrl(token, origin),
	});
}
