import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteRelationship,
	getConstituentById,
	getRelationshipById,
	logConstituentAudit,
	requireConstituentOrgContext,
} from "@/lib/constituents";

type RouteContext = {
	params: Promise<{ id: string; relationshipId: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id, relationshipId } = await context.params;
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== ctx.orgId) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	const relationship = await getRelationshipById(relationshipId);
	if (
		!relationship ||
		relationship.orgId !== ctx.orgId ||
		(relationship.fromId !== id && relationship.toId !== id)
	) {
		return NextResponse.json(
			{ error: "Relationship not found" },
			{ status: 404 },
		);
	}

	try {
		await deleteRelationship(relationshipId);
		await logConstituentAudit({
			action: "delete",
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.fullName || ctx.user.email || "",
				userEmail: ctx.user.email || "",
			},
			orgId: ctx.orgId,
			targetId: id,
			targetLabel: `${existing.firstName} ${existing.lastName}`.trim(),
			summary: `Removed ${relationship.type} relationship ${relationshipId}`,
			metadata: {
				relationshipId,
				fromId: relationship.fromId,
				toId: relationship.toId,
				type: relationship.type,
			},
		});
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[SERVER] constituent relationship DELETE:", error);
		return NextResponse.json(
			{ error: "Failed to delete relationship" },
			{ status: 500 },
		);
	}
}
