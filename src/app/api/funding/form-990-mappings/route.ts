import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type {
	Form990MappingSourceType,
	Form990PartIxBucket,
} from "@/lib/funding/form-990/types";
import {
	FORM_990_MAPPING_SOURCE_TYPES,
	FORM_990_PART_IX_BUCKETS,
} from "@/lib/funding/form-990/types";

function isSourceType(value: unknown): value is Form990MappingSourceType {
	return (
		typeof value === "string" &&
		(FORM_990_MAPPING_SOURCE_TYPES as readonly string[]).includes(value)
	);
}

function isPartIxBucket(value: unknown): value is Form990PartIxBucket {
	return (
		typeof value === "string" &&
		(FORM_990_PART_IX_BUCKETS as readonly string[]).includes(value)
	);
}
import {
	listForm990Mappings,
	upsertForm990Mapping,
} from "@/lib/funding/form-990/mapping.repository";
import { requireFundingOrgContext } from "@/lib/funding/request-context";

export async function GET(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const items = await listForm990Mappings(ctx.orgId);
		return NextResponse.json({ items });
	} catch (error) {
		console.error("[form-990-mappings GET]", error);
		return NextResponse.json({ error: "Failed to load mappings" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	const ctx = await requireFundingOrgContext(
		request,
		PERMISSIONS.FUNDING.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	try {
		const body = await request.json();
		const sourceType = body.sourceType;
		const sourceKey = String(body.sourceKey || "").trim();
		const partIxBucket = body.partIxBucket;
		if (!isSourceType(sourceType) || !sourceKey || !isPartIxBucket(partIxBucket)) {
			return NextResponse.json(
				{ error: "sourceType, sourceKey, and partIxBucket are required" },
				{ status: 400 },
			);
		}
		const row = await upsertForm990Mapping({
			orgId: ctx.orgId,
			sourceType,
			sourceKey,
			partIxBucket,
		});
		return NextResponse.json(row, { status: 201 });
	} catch (error) {
		console.error("[form-990-mappings POST]", error);
		return NextResponse.json({ error: "Failed to save mapping" }, { status: 500 });
	}
}
