import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	createAccess,
	listAccess,
} from "@/lib/contracts/negotiation/access.service";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ error: "Organization is required" },
			{ status: 400 },
		);
	}
	const { id } = await context.params;
	try {
		await loadContractForOrg(id, orgId);
		const invites = await listAccess(id);
		return NextResponse.json({
			invites: invites.map((row) => ({
				...row,
				tokenHash: undefined,
			})),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to list invites";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	const orgId = getOrgIdFromRequest(request);
	if (!user || !orgId) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	try {
		await loadContractForOrg(id, orgId);
		const invitees = Array.isArray(body.invitees)
			? (body.invitees as Array<{ email?: string; name?: string }>).map(
					(row) => ({
						email: String(row.email || ""),
						name: String(row.name || ""),
					}),
				)
			: [];
		const primary = invitees[0];
		const created = await createAccess({
			contractId: id,
			orgId,
			invitees: invitees.length > 0 ? invitees : undefined,
			counterpartyEmail: String(body.counterpartyEmail || primary?.email || ""),
			counterpartyName: String(body.counterpartyName || primary?.name || ""),
			createdBy: user.$id,
			expiresInDays: Number(body.expiresInDays || 14),
		});
		return NextResponse.json({
			invite: { ...created.access, tokenHash: undefined },
			token: created.token,
			urlPath: created.urlPath,
		});
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: typeof error === "string"
					? error
					: "Failed to create invite";
		console.error("[negotiation/access POST]", error);
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
