import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import type { GiftImportFieldKey } from "@/lib/gifts/import/fields";
import { applyGiftColumnMapping } from "@/lib/gifts/import/parse";
import {
	commitGiftImport,
	dryRunGiftImport,
} from "@/lib/gifts/import/run-import";
import { requireGiftOrgContext } from "@/lib/gifts/request-context";
import { readImportPayload } from "@/lib/import/http";

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;

	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const body = await request.json();
		const parsed = readImportPayload<GiftImportFieldKey>(body);
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyGiftColumnMapping(parsed.rows, parsed.mapping);
		if (valid.length === 0) {
			return NextResponse.json(
				{ error: "No valid rows after mapping", rowErrors: errors },
				{ status: 400 },
			);
		}
		if (dryRun) {
			const result = await dryRunGiftImport(ctx.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitGiftImport(ctx.orgId, valid);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] gifts/import POST:", error);
		return NextResponse.json({ error: "Gift import failed" }, { status: 500 });
	}
}
