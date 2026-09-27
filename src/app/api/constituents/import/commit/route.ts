import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireConstituentOrgContext } from "@/lib/constituents";
import { commitImportBatch } from "@/lib/constituents/import/commit.service";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function POST(request: NextRequest) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.CONSTITUENTS.MANAGE,
	);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as { batchId?: string };
		if (!body.batchId?.trim()) {
			return NextResponse.json({ error: "batchId is required" }, { status: 400 });
		}

		const result = await commitImportBatch({
			orgId: ctx.orgId,
			batchId: body.batchId.trim(),
		});
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}

		if (!result.alreadyCommitted) {
			await logAuditEvent({
				event_id: `constituent_import_commit_${body.batchId.trim()}`,
				event_title: "Constituent import committed",
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
				module: "governance",
				target_type: "constituent_import_batch",
				target_id: body.batchId.trim(),
				target_label: "Constituent CSV import",
				summary: `${("fullName" in ctx.user && ctx.user.fullName) || ctx.user.name || "User"} committed constituent import batch ${body.batchId.trim()}`,
				metadata: {
					batchId: body.batchId.trim(),
					counts: result.counts,
				},
			});
		}

		return NextResponse.json(result);
	} catch (error) {
		console.error("[constituents/import/commit POST]", error);
		return NextResponse.json({ error: "Import commit failed" }, { status: 500 });
	}
}
