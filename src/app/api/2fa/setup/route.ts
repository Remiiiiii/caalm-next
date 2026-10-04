import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	isSessionUserError,
	rejectUserIdMismatch,
	requireSessionUser,
} from "@/lib/auth/require-session-user";
import { logSecurityAudit } from "@/lib/auth/security-audit";
import {
	generateTOTPQRUrl,
	generateTOTPSecret,
	verifyTOTPCode,
} from "@/lib/totp";
import { notify2FACompleted } from "@/lib/utils/smsNotifications";

// Temporary secrets for in-progress setup (bound to session accountId)
const tempSecrets = new Map<
	string,
	{
		secret: string;
		userId: string;
		timestamp: number;
	}
>();

setInterval(
	() => {
		const now = Date.now();
		for (const [factorId, data] of tempSecrets.entries()) {
			if (now - data.timestamp > 5 * 60 * 1000) {
				tempSecrets.delete(factorId);
			}
		}
	},
	10 * 60 * 1000,
);

export async function POST(request: NextRequest) {
	try {
		const session = await requireSessionUser();
		if (isSessionUserError(session)) return session;

		let bodyUserId: string | undefined;
		try {
			const body = await request.json();
			bodyUserId =
				typeof body?.userId === "string" ? body.userId : undefined;
		} catch {
			// Body optional — session identity is the source of truth
		}

		const mismatch = rejectUserIdMismatch(session, bodyUserId);
		if (mismatch) return mismatch;

		if (!appwriteConfig.secretKey) {
			console.error("Appwrite secret key is not configured");
			return NextResponse.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}

		const secret = generateTOTPSecret();
		const accountName = session.email || "user@caalm.app";
		const qrUrl = generateTOTPQRUrl({
			secret,
			accountName,
			issuer: "CAALM",
		});
		const factorId = `totp_${session.accountId}_${Date.now()}`;

		tempSecrets.set(factorId, {
			secret,
			userId: session.accountId,
			timestamp: Date.now(),
		});

		return NextResponse.json({
			success: true,
			data: {
				uri: qrUrl,
				secret,
				factorId,
			},
		});
	} catch (error) {
		console.error("Error setting up 2FA:", error);
		return NextResponse.json({ error: "Failed to setup 2FA" }, { status: 500 });
	}
}

export async function PUT(request: NextRequest) {
	try {
		const session = await requireSessionUser();
		if (isSessionUserError(session)) return session;

		const { factorId, code, userId: bodyUserId } = await request.json();

		const mismatch = rejectUserIdMismatch(session, bodyUserId);
		if (mismatch) return mismatch;

		if (!factorId || !code) {
			return NextResponse.json(
				{ error: "Factor ID and verification code are required" },
				{ status: 400 },
			);
		}

		const storedData = tempSecrets.get(factorId);
		if (!storedData) {
			return NextResponse.json(
				{ error: "Invalid or expired setup session" },
				{ status: 400 },
			);
		}

		if (storedData.userId !== session.accountId) {
			return NextResponse.json(
				{ error: "Cannot change two-factor settings for another user" },
				{ status: 403 },
			);
		}

		const now = Date.now();
		if (now - storedData.timestamp > 5 * 60 * 1000) {
			tempSecrets.delete(factorId);
			return NextResponse.json(
				{ error: "Setup session expired. Please try again." },
				{ status: 400 },
			);
		}

		const isValid = verifyTOTPCode({ secret: storedData.secret, code });
		if (!isValid) {
			return NextResponse.json(
				{ error: "Invalid verification code" },
				{ status: 400 },
			);
		}

		try {
			if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
				throw new Error("Missing required Appwrite configuration");
			}

			const client = await createAdminClient();
			const userResponse = await client.tablesDB.listRows({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.usersCollectionId,
				queries: [Query.equal("accountId", session.accountId)],
			});

			if (userResponse.rows.length === 0) {
				return NextResponse.json({ error: "User not found" }, { status: 404 });
			}

			const updateData: Record<string, unknown> = {
				twoFactorEnabled: true,
				twoFactorSecret: storedData.secret,
				twoFactorFactorId: factorId,
				twoFactorSetupAt: new Date().toISOString(),
			};

			await client.tablesDB.updateRow({
				databaseId: appwriteConfig.databaseId,
				tableId: appwriteConfig.usersCollectionId,
				rowId: userResponse.rows[0].$id,
				data: updateData,
			});

			tempSecrets.delete(factorId);

			try {
				const user = userResponse.rows[0];
				if (user.email && user.fullName && user.department) {
					await notify2FACompleted(
						user.email,
						user.fullName,
						user.department,
					);
				}
			} catch (smsError) {
				console.error("Failed to send 2FA completion SMS:", smsError);
			}

			await logSecurityAudit({
				kind: "two_factor_enabled",
				actor: {
					$id: session.profileId,
					fullName: session.fullName,
					email: session.email,
				},
				target: {
					$id: session.profileId,
					fullName: session.fullName,
					email: session.email,
				},
				request,
			});

			const response = NextResponse.json({
				success: true,
				message: "2FA setup completed successfully",
			});

			response.cookies.set("2fa_completed", "true", {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30,
			});
			response.cookies.set("2fa_user_id", userResponse.rows[0].$id, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: 60 * 60 * 24 * 30,
			});

			return response;
		} catch (error) {
			console.error("Error storing 2FA secret:", error);
			if (error instanceof Error && error.message.includes("Attribute")) {
				return NextResponse.json(
					{
						error:
							"Database schema does not support 2FA fields. Please add the required attributes to the users collection.",
					},
					{ status: 500 },
				);
			}
			return NextResponse.json(
				{ error: "Failed to store 2FA configuration" },
				{ status: 500 },
			);
		}
	} catch (error) {
		console.error("Error updating 2FA:", error);
		return NextResponse.json(
			{ error: "Failed to update 2FA" },
			{ status: 500 },
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const session = await requireSessionUser();
		if (isSessionUserError(session)) return session;

		let bodyUserId: string | undefined;
		try {
			const body = await request.json();
			bodyUserId =
				typeof body?.userId === "string" ? body.userId : undefined;
		} catch {
			// optional
		}
		const mismatch = rejectUserIdMismatch(session, bodyUserId);
		if (mismatch) return mismatch;

		if (!appwriteConfig.databaseId || !appwriteConfig.usersCollectionId) {
			return NextResponse.json(
				{ error: "Database configuration missing" },
				{ status: 500 },
			);
		}

		const client = await createAdminClient();
		await client.tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.usersCollectionId,
			rowId: session.profileId,
			data: {
				twoFactorEnabled: false,
				twoFactorSecret: null,
				twoFactorFactorId: null,
				twoFactorSetupAt: null,
			},
		});

		await logSecurityAudit({
			kind: "two_factor_reset",
			actor: {
				$id: session.profileId,
				fullName: session.fullName,
				email: session.email,
			},
			target: {
				$id: session.profileId,
				fullName: session.fullName,
				email: session.email,
			},
			request,
		});

		const response = NextResponse.json({
			success: true,
			message: "2FA disabled successfully",
		});
		response.cookies.delete("2fa_completed");
		response.cookies.delete("2fa_user_id");
		return response;
	} catch (error) {
		console.error("Error disabling 2FA:", error);
		return NextResponse.json(
			{ error: "Failed to disable 2FA" },
			{ status: 500 },
		);
	}
}
