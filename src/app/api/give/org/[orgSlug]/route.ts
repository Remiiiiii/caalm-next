import { type NextRequest, NextResponse } from "next/server";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";

type RouteContext = { params: Promise<{ orgSlug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
	const { orgSlug } = await context.params;
	const org = await resolveOrganizationByGiveSlug(orgSlug);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}
	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
	});
}
