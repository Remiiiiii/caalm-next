import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { readImportPayload } from "@/lib/import/http";
import type { VolunteerShiftImportFieldKey } from "@/lib/volunteers/import/fields";
import { applyVolunteerShiftColumnMapping } from "@/lib/volunteers/import/parse";
import {
	commitVolunteerShiftImport,
	dryRunVolunteerShiftImport,
} from "@/lib/volunteers/import/run-import";
import { requireVolunteerOrgContext } from "@/lib/volunteers";

export async function POST(request: NextRequest) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;
	if (!ctx.user.accountId) {
		return NextResponse.json({ error: "User not found" }, { status: 404 });
	}
	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const parsed = readImportPayload<VolunteerShiftImportFieldKey>(
			await request.json(),
		);
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyVolunteerShiftColumnMapping(
			parsed.rows,
			parsed.mapping,
		);
		if (valid.length === 0) {
			return NextResponse.json(
				{ error: "No valid rows after mapping", rowErrors: errors },
				{ status: 400 },
			);
		}
		if (dryRun) {
			const result = dryRunVolunteerShiftImport(valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitVolunteerShiftImport(
			ctx.user.$id,
			ctx.user.accountId,
			valid,
		);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] volunteers/shifts/import POST:", error);
		return NextResponse.json(
			{ error: "Volunteer shift import failed" },
			{ status: 500 },
		);
	}
}
