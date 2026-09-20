import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	deleteConstituent,
	getConstituentById,
	isConstituentType,
	markPiiAccessed,
	requireConstituentOrgContext,
	updateConstituent,
} from "@/lib/constituents";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedConstituent(id: string, orgId: string) {
	const existing = await getConstituentById(id);
	if (!existing || existing.orgId !== orgId) return null;
	return existing;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwnedConstituent(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	await markPiiAccessed(id);
	return NextResponse.json({ constituent: existing });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwnedConstituent(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const patch: Record<string, unknown> = {};
		if (body.firstName != null) patch.firstName = String(body.firstName);
		if (body.lastName != null) patch.lastName = String(body.lastName);
		if (body.email != null) patch.email = String(body.email);
		if (body.phone != null) patch.phone = String(body.phone);
		if (body.addressLine1 != null) patch.addressLine1 = String(body.addressLine1);
		if (body.city != null) patch.city = String(body.city);
		if (body.region != null) patch.region = String(body.region);
		if (body.postalCode != null) patch.postalCode = String(body.postalCode);
		if (body.country != null) patch.country = String(body.country);
		if (body.doNotContact != null) patch.doNotContact = Boolean(body.doNotContact);
		if (isConstituentType(body.type)) patch.type = body.type;

		const constituent = await updateConstituent(id, patch);
		return NextResponse.json({ constituent });
	} catch (error) {
		console.error("[SERVER] constituents PATCH:", error);
		return NextResponse.json(
			{ error: "Failed to update constituent" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	const { id } = await context.params;
	const existing = await loadOwnedConstituent(id, ctx.orgId);
	if (!existing) {
		return NextResponse.json({ error: "Constituent not found" }, { status: 404 });
	}

	try {
		await deleteConstituent(id);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[SERVER] constituents DELETE:", error);
		return NextResponse.json(
			{ error: "Failed to delete constituent" },
			{ status: 500 },
		);
	}
}
