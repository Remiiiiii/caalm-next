import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	constituentActorFromUser,
	deleteConstituent,
	getConstituentById,
	isConstituentType,
	logConstituentPiiView,
	requireConstituentOrgContext,
	updateConstituent,
} from "@/lib/constituents/server";
import {
	consentAuditChanges,
	logConstituentConsentChange,
} from "@/lib/constituents/consent-audit";
import {
	isLawfulBasis,
	readChannelConsent,
} from "@/lib/constituents/consent-fields";

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
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}
	if (existing.mergedIntoId) {
		return NextResponse.json(
			{
				error: "Constituent merged",
				mergedIntoId: existing.mergedIntoId,
			},
			{
				status: 410,
				headers: { Location: `/constituents/${existing.mergedIntoId}` },
			},
		);
	}

	await logConstituentPiiView({
		actor: constituentActorFromUser(ctx.user),
		orgId: ctx.orgId,
		constituentId: id,
	});
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
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const patch: Record<string, unknown> = {};
		if (body.firstName != null) patch.firstName = String(body.firstName);
		if (body.lastName != null) patch.lastName = String(body.lastName);
		if (body.email != null) patch.email = String(body.email);
		if (body.phone != null) patch.phone = String(body.phone);
		if (body.addressLine1 != null)
			patch.addressLine1 = String(body.addressLine1);
		if (body.city != null) patch.city = String(body.city);
		if (body.region != null) patch.region = String(body.region);
		if (body.postalCode != null) patch.postalCode = String(body.postalCode);
		if (body.country != null) patch.country = String(body.country);
		if (body.doNotContact != null)
			patch.doNotContact = Boolean(body.doNotContact);
		if (body.consentEmail != null)
			patch.consentEmail = Boolean(body.consentEmail);
		if (body.consentSms != null) patch.consentSms = Boolean(body.consentSms);
		if (body.consentMail != null) patch.consentMail = Boolean(body.consentMail);
		if (body.consentPhone != null)
			patch.consentPhone = Boolean(body.consentPhone);
		if (body.lawfulBasis !== undefined) {
			const lb = body.lawfulBasis;
			patch.lawfulBasis =
				typeof lb === "string" && isLawfulBasis(lb) ? lb : undefined;
		}
		if (isConstituentType(body.type)) patch.type = body.type;

		const before = readChannelConsent(existing);
		const constituent = await updateConstituent(id, patch);
		const after = readChannelConsent(constituent);
		const consentChanges = consentAuditChanges(before, after);
		if (consentChanges) {
			await logConstituentConsentChange({
				actor: constituentActorFromUser(ctx.user),
				orgId: ctx.orgId,
				constituentId: id,
				changes: consentChanges,
			});
		}

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
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
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
