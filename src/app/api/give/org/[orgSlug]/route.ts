import { type NextRequest, NextResponse } from "next/server";
import { listDesignationsForOrg } from "@/lib/designations/repository";
import { resolveOrganizationByGiveSlug } from "@/lib/give/org";
import { getOrgLogoUrlFromSettings } from "@/lib/organizations/org-logo";

type RouteContext = { params: Promise<{ orgSlug: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
	const { orgSlug } = await context.params;
	const org = await resolveOrganizationByGiveSlug(orgSlug);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}
	const designations = await listDesignationsForOrg(org.$id);
	return NextResponse.json({
		orgId: org.$id,
		name: org.name,
		logoUrl: getOrgLogoUrlFromSettings(org.settings),
		designations: designations.map((d) => ({
			id: d.$id,
			label: d.label,
		})),
	});
}
