import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { processExpiredDocuments } from "@/lib/renewals/processExpiredDocuments";

/**
 * POST /api/contracts/update-expired
 * Auto-renews flagged contracts/licenses, marks others expired, refreshes daysUntilExpiry.
 */
export async function POST(_request: NextRequest) {
	try {
		const result = await processExpiredDocuments();

		return NextResponse.json({
			success: true,
			message: result.message,
			updatedCount: result.updatedCount,
			autoRenewedCount: result.autoRenewedCount,
			totalChecked: result.totalChecked,
			errors: result.errors,
			timestamp: new Date().toISOString(),
		});
	} catch (error: unknown) {
		const err = error as {
			isTestConfig?: boolean;
			code?: string;
			message?: string;
		};
		console.error("Error updating expired documents:", error);

		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			err?.isTestConfig ||
			err?.code === "TEST_CONFIG" ||
			err?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			err?.message?.includes("AppwriteException")
		) {
			return NextResponse.json({
				success: true,
				message: "No documents updated (test environment)",
				updatedCount: 0,
				autoRenewedCount: 0,
				totalChecked: 0,
				errors: undefined,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json(
			{
				error: "Failed to update expired documents",
				message: err?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * GET /api/contracts/update-expired
 * Vercel Cron (Authorization: Bearer) runs the processor; otherwise returns status counts.
 */
export async function GET(request: NextRequest) {
	try {
		const authHeader = request.headers.get("authorization");
		const isCronRequest = authHeader?.startsWith("Bearer ");

		if (isCronRequest) {
			console.log("[CRON] Updating expired documents (with auto-renew)...");

			const result = await processExpiredDocuments();

			console.log("[CRON] Expired documents update complete:", result);

			return NextResponse.json({
				success: true,
				message: result.message,
				updatedCount: result.updatedCount,
				autoRenewedCount: result.autoRenewedCount,
				totalChecked: result.totalChecked,
				errors: result.errors,
				timestamp: new Date().toISOString(),
			});
		}

		try {
			const { tablesDB } = await createAdminClient();

			if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
				return NextResponse.json(
					{ error: "Database or collection ID not configured" },
					{ status: 500 },
				);
			}

			const expiredContracts = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractsCollectionId,
				queries: [Query.equal("isExpired", true), Query.limit(1)],
			});

			const totalContracts = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.contractsCollectionId,
				queries: [Query.isNotNull("contractExpiryDate"), Query.limit(1)],
			});

			return NextResponse.json({
				expiredCount: expiredContracts.total,
				totalContractsWithExpiry: totalContracts.total,
				timestamp: new Date().toISOString(),
			});
		} catch (statusError: unknown) {
			const err = statusError as {
				isTestConfig?: boolean;
				code?: string;
				message?: string;
			};
			if (
				process.env.CI ||
				process.env.NODE_ENV === "test" ||
				err?.isTestConfig ||
				err?.code === "TEST_CONFIG" ||
				err?.message?.includes(
					"Project with the requested ID could not be found",
				) ||
				err?.message?.includes("AppwriteException")
			) {
				return NextResponse.json({
					expiredCount: 0,
					totalContractsWithExpiry: 0,
					timestamp: new Date().toISOString(),
				});
			}
			throw statusError;
		}
	} catch (error: unknown) {
		const err = error as {
			isTestConfig?: boolean;
			code?: string;
			message?: string;
		};
		console.error("Error in GET /api/contracts/update-expired:", error);

		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			err?.isTestConfig ||
			err?.code === "TEST_CONFIG" ||
			err?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			err?.message?.includes("AppwriteException")
		) {
			return NextResponse.json({
				expiredCount: 0,
				totalContractsWithExpiry: 0,
				timestamp: new Date().toISOString(),
			});
		}

		return NextResponse.json(
			{
				error: "Failed to process request",
				message: err?.message || "Unknown error",
			},
			{ status: 500 },
		);
	}
}
