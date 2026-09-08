/**
 * Validates and consumes an email OTP for step-up auth (no login side effects).
 */

import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function verifyStepUpOtp(
	email: string,
	otp: string,
): Promise<{ success: true } | { success: false; error: string }> {
	const {
		clearAuthFailures,
		getAuthLockoutStatus,
		LOCKOUT_USER_MESSAGE,
		recordAuthFailure,
	} = await import("@/lib/auth/attempt-lockout");

	const lockStatus = await getAuthLockoutStatus("email-otp", email);
	if (lockStatus.locked) {
		return { success: false, error: LOCKOUT_USER_MESSAGE };
	}

	const { isDemoMode, getDemoOtpCode } = await import("@/lib/config/demo-mode");
	if (isDemoMode() && otp === getDemoOtpCode()) {
		await clearAuthFailures("email-otp", email);
		return { success: true };
	}

	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
		queries: [
			Query.equal("email", email),
			Query.equal("otp", otp),
			Query.equal("used", false),
			Query.limit(1),
		],
	});

	if (result.total === 0) {
		const failure = await recordAuthFailure("email-otp", email);
		if (failure.justLocked || failure.locked) {
			return { success: false, error: LOCKOUT_USER_MESSAGE };
		}
		return {
			success: false,
			error: "Invalid verification code. Please check and try again.",
		};
	}

	const otpRecord = result.rows[0];
	const now = new Date();
	const expiresAt = new Date(String(otpRecord.expiresAt));

	if (now > expiresAt) {
		const failure = await recordAuthFailure("email-otp", email);
		if (failure.justLocked || failure.locked) {
			return { success: false, error: LOCKOUT_USER_MESSAGE };
		}
		return {
			success: false,
			error: "The verification code has expired. Please request a new one.",
		};
	}

	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
		rowId: otpRecord.$id,
		data: { used: true },
	});
	await clearAuthFailures("email-otp", email);

	return { success: true };
}
