import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	createConstituentWithDuplicateGate,
	isConstituentType,
	listConstituents,
	parseDoNotContactParam,
	parseTypeParam,
	requireConstituentOrgContext,
} from "@/lib/constituents";

export async function GET(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	if (!ctx.ok) return ctx.response;

	const params = request.nextUrl.searchParams;
	const page = Math.max(Number(params.get("page") || "1"), 1);
	const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "20"), 1), 100);

	try {
		const result = await listConstituents({
			orgId: ctx.orgId,
			search: params.get("search") || undefined,
			type: parseTypeParam(params.get("type")),
			city: params.get("city")?.trim() || undefined,
			doNotContact: parseDoNotContactParam(params.get("doNotContact")),
			limit: pageSize,
			offset: (page - 1) * pageSize,
		});
		return NextResponse.json({
			items: result.items,
			total: result.total,
			page,
			pageSize,
		});
	} catch (error) {
		console.error("[SERVER] constituents GET:", error);
		return NextResponse.json(
			{ error: "Failed to list constituents" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const firstName = String(body.firstName || "").trim();
		const lastName = String(body.lastName || "").trim();
		if (!firstName || !lastName) {
			return NextResponse.json(
				{ error: "firstName and lastName are required" },
				{ status: 400 },
			);
		}
		if (!isConstituentType(body.type)) {
			return NextResponse.json(
				{ error: "type must be donor, volunteer, member, or other" },
				{ status: 400 },
			);
		}

		const force = body.force === true;
		const result = await createConstituentWithDuplicateGate({
			payload: {
				orgId: ctx.orgId,
				type: body.type,
				firstName,
				lastName,
				email: body.email ? String(body.email) : undefined,
				phone: body.phone ? String(body.phone) : undefined,
				addressLine1: body.addressLine1
					? String(body.addressLine1)
					: undefined,
				city: body.city ? String(body.city) : undefined,
				region: body.region ? String(body.region) : undefined,
				postalCode: body.postalCode ? String(body.postalCode) : undefined,
				country: body.country ? String(body.country) : undefined,
				doNotContact: Boolean(body.doNotContact),
			},
			force,
			actor: {
				userId: ctx.user.$id,
				userName: ctx.user.fullName || ctx.user.email || "",
				userEmail: ctx.user.email || "",
			},
		});

		if (!result.ok) {
			return NextResponse.json(
				{
					error: "Likely duplicate constituent",
					candidates: result.candidates,
				},
				{ status: 409 },
			);
		}

		return NextResponse.json({ constituent: result.constituent }, { status: 201 });
	} catch (error) {
		console.error("[SERVER] constituents POST:", error);
		return NextResponse.json(
			{ error: "Failed to create constituent" },
			{ status: 500 },
		);
	}
}
