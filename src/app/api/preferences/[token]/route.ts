import { type NextRequest, NextResponse } from "next/server";
import {
	consentAuditChanges,
	logConstituentConsentChange,
} from "@/lib/constituents/consent-audit";
import {
	isLawfulBasis,
	readChannelConsent,
} from "@/lib/constituents/consent-fields";
import { verifyPreferenceToken } from "@/lib/constituents/preference-token";
import {
	getConstituentById,
	updateConstituent,
} from "@/lib/constituents/repository";

type RouteContext = { params: Promise<{ token: string }> };

async function loadConstituentForToken(token: string) {
	const verified = verifyPreferenceToken(token);
	if (!verified.ok) {
		const status = verified.reason === "expired" ? 404 : 404;
		return {
			ok: false as const,
			response: NextResponse.json({ error: "Not found" }, { status }),
		};
	}
	const constituent = await getConstituentById(verified.parsed.constituentId);
	if (
		!constituent ||
		constituent.orgId !== verified.parsed.orgId ||
		constituent.mergedIntoId
	) {
		return {
			ok: false as const,
			response: NextResponse.json({ error: "Not found" }, { status: 404 }),
		};
	}
	return { ok: true as const, constituent, parsed: verified.parsed };
}

export async function GET(_request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const loaded = await loadConstituentForToken(token);
	if (!loaded.ok) return loaded.response;

	const consent = readChannelConsent(loaded.constituent);
	return NextResponse.json({
		displayName: `${loaded.constituent.firstName} ${loaded.constituent.lastName}`.trim(),
		doNotContact: loaded.constituent.doNotContact,
		...consent,
	});
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const loaded = await loadConstituentForToken(token);
	if (!loaded.ok) return loaded.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const before = readChannelConsent(loaded.constituent);
		const patch: Record<string, unknown> = {};
		if (body.consentEmail != null) patch.consentEmail = Boolean(body.consentEmail);
		if (body.consentSms != null) patch.consentSms = Boolean(body.consentSms);
		if (body.consentMail != null) patch.consentMail = Boolean(body.consentMail);
		if (body.consentPhone != null) patch.consentPhone = Boolean(body.consentPhone);
		if (body.doNotContact != null) patch.doNotContact = Boolean(body.doNotContact);
		if (body.lawfulBasis !== undefined) {
			const value = body.lawfulBasis;
			patch.lawfulBasis =
				typeof value === "string" && isLawfulBasis(value) ? value : null;
		}

		const updated = await updateConstituent(loaded.constituent.$id, patch);
		const after = readChannelConsent(updated);
		const changes = consentAuditChanges(before, after);
		if (changes) {
			await logConstituentConsentChange({
				actor: {
					userId: "preference_center",
					userName: "Constituent (preference center)",
					userEmail: "",
				},
				orgId: loaded.constituent.orgId,
				constituentId: loaded.constituent.$id,
				changes,
			});
		}

		return NextResponse.json({
			displayName: `${updated.firstName} ${updated.lastName}`.trim(),
			doNotContact: updated.doNotContact,
			...after,
		});
	} catch (error) {
		console.error("[preferences PATCH]", error);
		return NextResponse.json({ error: "Update failed" }, { status: 500 });
	}
}
