import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	constituentActorFromUser,
	logConstituentAudit,
	requireConstituentOrgContext,
} from "@/lib/constituents";
import { getConstituentById } from "@/lib/constituents/repository";
import { recomputeOrgSegments } from "@/lib/fundraising/segments-repository";
import { upsertWealthScreen } from "@/lib/fundraising/wealth-repository";

type ImportRow = {
	constituentId: string;
	capacityBand?: number;
	externalScore?: string;
	screenDate?: string;
	source?: string;
};

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;

	let body: { rows?: ImportRow[] };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const rows = Array.isArray(body.rows) ? body.rows : [];
	if (rows.length === 0) {
		return NextResponse.json(
			{ error: "At least one row is required" },
			{ status: 400 },
		);
	}
	if (rows.length > 200) {
		return NextResponse.json(
			{ error: "Import limited to 200 rows per request" },
			{ status: 400 },
		);
	}

	const actor = constituentActorFromUser(ctx.user);
	const importedAt = new Date().toISOString();
	let imported = 0;
	const rejected: Array<{ constituentId: string; reason: string }> = [];

	for (const row of rows) {
		const constituentId = row.constituentId?.trim();
		if (!constituentId) {
			rejected.push({ constituentId: "", reason: "Missing constituent id" });
			continue;
		}
		const constituent = await getConstituentById(constituentId);
		if (!constituent || constituent.orgId !== ctx.orgId) {
			rejected.push({
				constituentId,
				reason: "Constituent not found in this organization",
			});
			continue;
		}
		await upsertWealthScreen({
			orgId: ctx.orgId,
			constituentId,
			capacityBand:
				row.capacityBand != null ? Number(row.capacityBand) : undefined,
			externalScore: row.externalScore?.trim(),
			screenDate: row.screenDate?.trim(),
			source: row.source?.trim(),
			importedByUserId: ctx.user.$id,
			importedAt,
		});
		imported += 1;
	}

	await logConstituentAudit({
		action: "create",
		actor,
		orgId: ctx.orgId,
		targetId: ctx.orgId,
		targetLabel: "Wealth screen import",
		summary: `Imported ${imported} wealth-screen row(s)`,
		metadata: {
			imported,
			rejected: rejected.length,
			source: "wealth-import",
		},
	});

	if (imported > 0) {
		await recomputeOrgSegments(ctx.orgId);
	}

	return NextResponse.json({
		imported,
		rejected,
	});
}
