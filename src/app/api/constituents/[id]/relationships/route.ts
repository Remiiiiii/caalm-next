import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createRelationship,
	getConstituentById,
	isRelationshipType,
	listRelationshipsForConstituent,
	requireConstituentOrgContext,
} from "@/lib/constituents";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwned(id: string, orgId: string) {
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== orgId || existing.mergedIntoId) {
		return null;
	}
	return existing;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwned(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		const relationships = await listRelationshipsForConstituent(id, ctx.orgId);
		return NextResponse.json({ relationships });
	} catch (error) {
		console.error("[SERVER] constituent relationships GET:", error);
		return NextResponse.json(
			{ error: "Failed to list relationships" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwned(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const toId = String(body.toId || "").trim();
		if (!toId) {
			return NextResponse.json({ error: "toId is required" }, { status: 400 });
		}
		if (!isRelationshipType(body.type)) {
			return NextResponse.json(
				{ error: "type must be household, spouse, employer, or solicitor" },
				{ status: 400 },
			);
		}

		const result = await createRelationship({
			orgId: ctx.orgId,
			fromId: id,
			toId,
			type: body.type,
			softCredit: Boolean(body.softCredit),
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}
		return NextResponse.json(
			{ relationship: result.relationship },
			{ status: 201 },
		);
	} catch (error) {
		console.error("[SERVER] constituent relationships POST:", error);
		return NextResponse.json(
			{ error: "Failed to create relationship" },
			{ status: 500 },
		);
	}
}
