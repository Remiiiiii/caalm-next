import { type NextRequest, NextResponse } from "next/server";
import type { ApprovalDecision } from "@/lib/approvals/contractApprovalWorkflow.types";
import {
	markApprovalActionTokenUsed,
	resolveApprovalActionToken,
} from "@/lib/approvals/approvalActionTokens";
import { decide } from "@/lib/approvals/ContractApprovalWorkflowService";
import { decideLicense } from "@/lib/approvals/LicenseApprovalWorkflowService";
import { createAdminClient } from "@/lib/appwrite";
import { flattenTableRow } from "@/lib/appwrite/flatten-row";
import { appwriteConfig } from "@/lib/appwrite/config";

const VALID: ApprovalDecision[] = [
	"approved",
	"changes_requested",
	"rejected",
];

async function loadEntitySummary(
	entityType: "contract" | "license",
	entityId: string,
): Promise<{ name: string; status?: string }> {
	try {
		const { tablesDB } = await createAdminClient();
		const tableId =
			entityType === "license"
				? appwriteConfig.licensesCollectionId!
				: appwriteConfig.contractsCollectionId!;
		const row = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId!,
			tableId,
			rowId: entityId,
		});
		const flat = flattenTableRow(row as Record<string, unknown>);
		return {
			name: String(
				entityType === "license"
					? flat.licenseName || "License"
					: flat.contractName || "Contract",
			),
			status: String(flat.status || "") || undefined,
		};
	} catch {
		return {
			name: entityType === "license" ? "License" : "Contract",
		};
	}
}

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const parsed = await resolveApprovalActionToken(decodeURIComponent(token));
	if (!parsed) {
		return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
	}
	const summary = await loadEntitySummary(parsed.entityType, parsed.entityId);
	return NextResponse.json({
		success: true,
		entityType: parsed.entityType,
		entityId: parsed.entityId,
		entityName: summary.name,
		status: summary.status,
	});
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const parsed = await resolveApprovalActionToken(decodeURIComponent(token));
	if (!parsed) {
		return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
	}

	const body = await request.json().catch(() => ({}));
	const decision = body.decision as ApprovalDecision;
	const notes = typeof body.notes === "string" ? body.notes : undefined;
	if (!VALID.includes(decision)) {
		return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
	}

	try {
		const result =
			parsed.entityType === "license"
				? await decideLicense({
						licenseId: parsed.entityId,
						viewerUserId: parsed.userId,
						decision,
						notes,
					})
				: await decide({
						contractId: parsed.entityId,
						viewerUserId: parsed.userId,
						decision,
						notes,
					});
		await markApprovalActionTokenUsed(parsed.$id);
		return NextResponse.json({
			success: true,
			contractStatus: result.contractStatus,
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to record decision";
		return NextResponse.json({ error: message }, { status: 403 });
	}
}
