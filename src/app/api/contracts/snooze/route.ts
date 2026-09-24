import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/contracts/middleware/auth.middleware";
import {
	errorResponse,
	generateRequestId,
	successResponse,
} from "@/lib/api/contracts/utils/response.util";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { logAuditEvent } from "@/lib/services/audit-logger";

export async function POST(request: NextRequest) {
	const requestId = generateRequestId();
	try {
		// Authentication
		const authError = await requireAuth(request);
		if (authError) return authError;

		const body = await request.json();
		const { contractId, snoozedUntil } = body;

		if (!contractId || !snoozedUntil) {
			return errorResponse(
				new Error("Missing required fields: contractId, snoozedUntil"),
				400,
				{ requestId },
			);
		}

		const { tablesDB } = await createAdminClient();

		// Update contract's snoozedUntil field
		const updatedContract = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId!,
			tableId: appwriteConfig.contractsCollectionId!,
			rowId: contractId,
			data: {
				snoozedUntil: snoozedUntil,
			},
		});

		const actor = await getCurrentUser();
		const contractLabel =
			String(
				(updatedContract as { contractName?: string }).contractName ||
					contractId,
			);
		void logAuditEvent({
			event_id: `contract_snooze_${contractId}_${Date.now()}`,
			event_title: `Expiry reminder snoozed: ${contractLabel}`,
			action: "update",
			source: "caalm",
			user_id: actor?.$id || "system",
			user_name:
				(actor as { fullName?: string } | null)?.fullName ||
				actor?.email ||
				"User",
			user_email: actor?.email || "",
			orgId:
				(updatedContract as { orgId?: string }).orgId ||
				"default_organization",
			status: "success",
			module: "contracts",
			target_type: "contract",
			target_id: contractId,
			target_label: contractLabel,
			summary: `${(actor as { fullName?: string } | null)?.fullName || actor?.email || "User"} snoozed expiry alerts until ${snoozedUntil}`,
		});

		return successResponse(updatedContract, { requestId });
	} catch (error) {
		console.error("Error updating contract snooze:", error);
		return errorResponse(
			error instanceof Error
				? error
				: new Error("Failed to update contract snooze"),
			500,
			{ requestId },
		);
	}
}
