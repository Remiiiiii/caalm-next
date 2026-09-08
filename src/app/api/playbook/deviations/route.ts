import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { parseExtractedClauses } from "@/lib/playbook/deviation-scoring";
import { scoreOrgContractDeviations } from "@/lib/playbook/score-org-contract";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.VIEW,
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

	try {
		const body = await request.json();
		const clauses = parseExtractedClauses(body?.clauses ?? []);
		const content =
			typeof body?.content === "string" ? body.content.trim() : "";

		if (!clauses.length && !content) {
			return NextResponse.json(
				{ error: "Provide clauses or contract content to score" },
				{ status: 400 },
			);
		}

		const report = await scoreOrgContractDeviations({
			orgId: org.orgId,
			clauses: clauses.length ? clauses : undefined,
			content: clauses.length ? undefined : content,
		});

		return NextResponse.json({ success: true, report });
	} catch (error) {
		console.error("[playbook deviations POST]", error);
		return NextResponse.json(
			{ success: false, error: "Failed to score playbook deviations" },
			{ status: 500 },
		);
	}
}
