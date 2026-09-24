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
import {
	listConstituentIdsForSegment,
	listSegmentsForOrg,
} from "@/lib/fundraising/segments-repository";

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
		const segment = params.get("segment")?.trim() || undefined;
		let segmentIds: string[] | undefined;
		if (segment) {
			segmentIds = await listConstituentIdsForSegment(ctx.orgId, segment);
			if (segmentIds.length === 0) {
				return NextResponse.json({
					items: [],
					total: 0,
					page,
					pageSize,
				});
			}
		}

		const result = await listConstituents({
			orgId: ctx.orgId,
			search: params.get("search") || undefined,
			type: parseTypeParam(params.get("type")),
			city: params.get("city")?.trim() || undefined,
			doNotContact: parseDoNotContactParam(params.get("doNotContact")),
			limit: segment ? 500 : pageSize,
			offset: segment ? 0 : (page - 1) * pageSize,
		});

		let items = result.items;
		if (segmentIds) {
			const allowed = new Set(segmentIds);
			items = items.filter((row) => allowed.has(row.$id));
			const start = (page - 1) * pageSize;
			items = items.slice(start, start + pageSize);
		}

		const segments = await listSegmentsForOrg(ctx.orgId);
		const segmentByConstituent = new Map(
			segments.map((row) => [row.constituentId, row.segment]),
		);
		const enriched = items.map((row) => ({
			...row,
			lifecycleSegment: segmentByConstituent.get(row.$id) ?? null,
		}));

		return NextResponse.json({
			items: enriched,
			total: segmentIds ? segmentIds.length : result.total,
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
