import { type NextRequest, NextResponse } from "next/server";
import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import { listTemplates } from "@/lib/templates/contract-template.service";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import { isEmptyWizardDraftSummary } from "@/lib/templates/wizard-draft-meta";
import {
	countWizardSessions,
	createWizardSession,
	deleteEmptyWizardSessions,
	deleteWizardSessions,
	isStartPath,
	listWizardSessionSummaries,
	listWizardSessions,
} from "@/lib/templates/wizard.service";

export async function GET(request: NextRequest) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;

	const params = request.nextUrl.searchParams;

	const published = params.get("publishedTemplates");
	if (published === "1") {
		const items = await listTemplates({
			orgId: auth.orgId,
			status: "published",
		});
		return NextResponse.json({ items });
	}

	const publishedClauses = params.get("publishedClauses");
	if (publishedClauses === "1") {
		const { listClauses } = await import(
			"@/lib/clauses/clause-library.service"
		);
		const items = await listClauses({
			orgId: auth.orgId,
			status: "active",
			currentOnly: true,
		});
		return NextResponse.json({ items });
	}

	if (params.get("countOnly") === "1") {
		const count = await countWizardSessions({
			orgId: auth.orgId,
			userId: auth.user.$id,
		});
		return NextResponse.json({ count });
	}

	if (params.get("summary") === "1") {
		const summaries = await listWizardSessionSummaries({
			orgId: auth.orgId,
			userId: auth.user.$id,
		});
		return NextResponse.json(
			{ summaries },
			{ headers: { "Cache-Control": "no-store" } },
		);
	}

	const sessions = await listWizardSessions({
		orgId: auth.orgId,
		userId: auth.user.$id,
	});
	return NextResponse.json({ sessions });
}

export async function POST(request: NextRequest) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;

	try {
		const body = await request.json().catch(() => ({}));
		const session = await createWizardSession({
			orgId: auth.orgId,
			userId: auth.user.$id,
			startPath: isStartPath(body.startPath) ? body.startPath : "scratch",
			templateId: body.templateId ? String(body.templateId) : null,
			blueprintId: body.blueprintId ? String(body.blueprintId) : null,
		});
		return NextResponse.json({ session }, { status: 201 });
	} catch (error) {
		console.error("[contracts/wizard POST]", error);
		const message =
			error instanceof Error ? error.message : "Failed to start wizard";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;

	try {
		const body = await request.json().catch(() => ({}));
		if (body.emptyOnly === true) {
			const result = await deleteEmptyWizardSessions({
				orgId: auth.orgId,
				userId: auth.user.$id,
			});
			if (result.deleted.length === 0) {
				return NextResponse.json(
					{ error: "No empty drafts to delete" },
					{ status: 400 },
				);
			}
			const summaries = await listWizardSessionSummaries({
				orgId: auth.orgId,
				userId: auth.user.$id,
			});
			// #region agent log
			void appendFile(
				join(process.cwd(), "debug-cb2714.log"),
				`${JSON.stringify({
					sessionId: "cb2714",
					hypothesisId: "H1-fix",
					location: "wizard/route.ts:DELETE-emptyOnly",
					message: "delete all empty completed",
					data: {
						deletedCount: result.deleted.length,
						failedCount: result.failed.length,
						summaryCount: summaries.length,
						remainingEmpty: summaries.filter(isEmptyWizardDraftSummary).length,
					},
					timestamp: Date.now(),
					runId: "post-fix-2",
				})}\n`,
			).catch(() => {});
			// #endregion
			return NextResponse.json({ ...result, summaries });
		}

		const ids = Array.isArray(body.ids)
			? body.ids.map((id: unknown) => String(id)).filter(Boolean)
			: [];
		if (ids.length === 0) {
			return NextResponse.json(
				{ error: "At least one draft id is required" },
				{ status: 400 },
			);
		}

		const result = await deleteWizardSessions({
			sessionIds: ids,
			orgId: auth.orgId,
			userId: auth.user.$id,
		});
		if (result.deleted.length === 0) {
			return NextResponse.json(
				{ error: "Could not delete the selected drafts" },
				{ status: 400 },
			);
		}
		const summaries = await listWizardSessionSummaries({
			orgId: auth.orgId,
			userId: auth.user.$id,
		});
		// #region agent log
		void appendFile(
			join(process.cwd(), "debug-cb2714.log"),
			`${JSON.stringify({
				sessionId: "cb2714",
				hypothesisId: "H1",
				location: "wizard/route.ts:DELETE",
				message: "delete completed server-side",
				data: {
					requestIds: ids,
					deleted: result.deleted,
					failed: result.failed,
					summaryCount: summaries.length,
					summaryIds: summaries.map((s) => s.$id),
					stillPresent: summaries.filter((s) => ids.includes(s.$id)).map((s) => s.$id),
				},
				timestamp: Date.now(),
			})}\n`,
		).catch(() => {});
		// #endregion
		return NextResponse.json({ ...result, summaries });
	} catch (error) {
		console.error("[contracts/wizard DELETE]", error);
		const message =
			error instanceof Error ? error.message : "Failed to delete drafts";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
