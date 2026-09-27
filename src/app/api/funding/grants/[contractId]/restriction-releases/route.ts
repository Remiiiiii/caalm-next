import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import {
	computeRemainingRestrictedBalance,
	createRestrictionRelease,
	listRestrictionReleases,
	RestrictionReleaseError,
} from "@/lib/funding/restriction-release.repository";
import { requireFundingOrgContext } from "@/lib/funding/request-context";
import { logAuditEvent } from "@/lib/services/audit-logger";

type RouteContext = { params: Promise<{ contractId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.VIEW,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;
	try {
		await loadContractForOrg(contractId, ctx.orgId);
		const [items, remainingRestrictedBalance] = await Promise.all([
			listRestrictionReleases(ctx.orgId, contractId),
			computeRemainingRestrictedBalance({
				orgId: ctx.orgId,
				contractId,
			}),
		]);
		return NextResponse.json({ items, remainingRestrictedBalance });
	} catch (error) {
		console.error("[restriction-releases GET]", error);
		return NextResponse.json(
			{ error: "Failed to load restriction releases" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	const { contractId } = await context.params;

	let body: { amount?: number; note?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	try {
		const contract = await loadContractForOrg(contractId, ctx.orgId);
		const amount = Number(body.amount);
		const release = await createRestrictionRelease({
			orgId: ctx.orgId,
			contractId,
			amount,
			createdByUserId: ctx.user.$id,
			createdByName:
				("fullName" in ctx.user && ctx.user.fullName) || ctx.user.name,
			note: body.note,
		});

		const grantLabel =
			String(contract.contractName || contract.name || "").trim() ||
			contractId;

		await logAuditEvent({
			event_id: `restriction_release_${release.$id}`,
			event_title: `Restriction release on grant ${grantLabel}`,
			action: "create",
			source: "caalm",
			user_id: ctx.user.$id,
			user_name:
				("fullName" in ctx.user && ctx.user.fullName) ||
				ctx.user.name ||
				"User",
			user_email: ctx.user.email || "",
			orgId: ctx.orgId,
			status: "success",
			module: "regulatory",
			target_type: "grant",
			target_id: contractId,
			target_label: grantLabel,
			summary: `${("fullName" in ctx.user && ctx.user.fullName) || ctx.user.name || "User"} released $${amount.toFixed(2)} from restricted fund for grant ${grantLabel}`,
			metadata: {
				amount,
				fundFrom: release.fundFrom,
				fundTo: release.fundTo,
				releaseId: release.$id,
			},
		});

		return NextResponse.json(release, { status: 201 });
	} catch (error) {
		if (error instanceof RestrictionReleaseError) {
			return NextResponse.json({ error: error.message }, { status: error.status });
		}
		console.error("[restriction-releases POST]", error);
		return NextResponse.json(
			{ error: "Failed to record restriction release" },
			{ status: 500 },
		);
	}
}
