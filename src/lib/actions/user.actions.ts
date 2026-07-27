"use server";

import * as crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as sdk from "node-appwrite";
import { ID, Query } from "node-appwrite";
import { cache } from "react";
import {
	getUserDefaultOrganization,
	getUserRoles,
} from "@/lib/rbac/permissions";
import CacheManager from "@/lib/services/cache-manager";
import { avatarPlaceholderUrl, type UserDivision } from "../../../constants";
import { createAdminClient, createSessionClient } from "../appwrite";
import { appwriteConfig } from "../appwrite/config";
import { parseStringify } from "../utils";
import { triggerUserInvitationNotification } from "../utils/notificationTriggers";
import {
	notifyInvitationAccepted,
	notifyInvitationSent,
	notifyOTPVerified,
} from "../utils/smsNotifications";

// Calendar role type for compatibility with calendar permissions
export type CalendarRole =
	| "admin"
	| "approver"
	| "reviewer"
	| "scheduler"
	| "viewer";

export type AppUser = {
	$id: string;
	fullName: string;
	email: string;
	avatar: string;
	accountId: string;
	role: CalendarRole; // For calendar permissions compatibility only
	division?: UserDivision;
	department?: string; // Direct department field (if available)
	phone?: string;
	status?: "active" | "inactive";
	profileImageId?: string | null;
};

export const getUserByEmail = async (email: string) => {
	try {
		const cacheKey = `user:email:${email.toLowerCase()}`;
		const cachedUser = await CacheManager.withCache(
			"users",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();
				const result = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.usersCollectionId || "users",
					queries: [Query.equal("email", email)],
				});
				return result.total > 0 ? result.rows[0] : null;
			},
			300, // 5 minute cache for user lookups
		);

		return cachedUser;
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("getUserByEmail: Error occurred:", error);
		}
		throw error;
	}
};

export const getUserById = async (userId: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		const result = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});
		return result;
	} catch (error) {
		console.error("Failed to get user by ID:", error);
		return null;
	}
};

export const getUserByAccountId = async (
	accountId: string,
): Promise<AppUser | null> => {
	const { tablesDB } = await createAdminClient();
	try {
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [sdk.Query.equal("accountId", accountId)],
		});

		if (!result.rows.length) {
			return null;
		}

		const user = result.rows[0];

		// Get user's role from database (for calendar permissions compatibility)
		// Both functions are now cached, so this is fast
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		const userRoles = defaultOrg
			? await getUserRoles(user.$id, defaultOrg.orgId)
			: [];
		const roleName = userRoles[0]?.roleName || "";

		// Map new RBAC roles to calendar roles for compatibility
		let calendarRole: CalendarRole = "viewer";
		if (roleName === "Super Admin" || roleName === "Organization Admin") {
			calendarRole = "admin";
		} else if (roleName === "Department Manager") {
			calendarRole = "approver";
		} else if (roleName === "Viewer") {
			calendarRole = "viewer";
		} else if (roleName === "IT") {
			calendarRole = "admin"; // IT staff get admin-level calendar access
		}

		return {
			$id: user.$id,
			fullName: user.fullName,
			email: user.email,
			avatar: user.avatar,
			accountId: user.accountId,
			role: calendarRole,
			division: user.division,
			status: user.status,
		};
	} catch (error) {
		console.error("Failed to get user by accountId:", error);
		return null;
	}
};

const handleError = (error: unknown, message: string) => {
	console.log(error, message);
	throw error;
};

export const sendEmailOTP = async ({ email }: { email: string }) => {
	try {
		const { isDemoMode, getDemoOtpCode } = await import(
			"@/lib/config/demo-mode"
		);
		const { tablesDB } = await createAdminClient();

		// Demo mode: store fixed OTP, never send email
		if (isDemoMode()) {
			const expirationTime = new Date();
			expirationTime.setMinutes(expirationTime.getMinutes() + 60);
			await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
				rowId: ID.unique(),
				data: {
					email,
					otp: getDemoOtpCode(),
					expiresAt: expirationTime.toISOString(),
					used: false,
				},
			});
			return ID.unique();
		}

		// Check if an OTP was recently sent (within the last 30 seconds) to prevent duplicates
		const thirtySecondsAgo = new Date();
		thirtySecondsAgo.setSeconds(thirtySecondsAgo.getSeconds() - 30);

		const recentOtpResponse = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
			queries: [
				Query.equal("email", email),
				Query.equal("used", false),
				Query.greaterThan("$createdAt", thirtySecondsAgo.toISOString()),
			],
		});

		if (recentOtpResponse.rows.length > 0) {
			// Return success but don't send duplicate email
			return ID.unique();
		}

		// Also check if there's any valid (non-expired) unused OTP for this email
		const now = new Date();
		const validOtpResponse = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
			queries: [
				Query.equal("email", email),
				Query.equal("used", false),
				Query.greaterThan("expiresAt", now.toISOString()),
				Query.limit(1),
			],
		});

		if (validOtpResponse.rows.length > 0) {
			// Return success but don't send duplicate email
			return ID.unique();
		}

		// Generate a 6-digit OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Store OTP in database with expiration (5 minutes)
		const expirationTime = new Date();
		expirationTime.setMinutes(expirationTime.getMinutes() + 5);

		// Store OTP in the database and get user name in parallel
		const [_, user] = await Promise.all([
			tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
				rowId: ID.unique(),
				data: {
					email,
					otp,
					expiresAt: expirationTime.toISOString(),
					used: false,
				},
			}),
			getUserByEmail(email).catch(() => null), // Get user in parallel
		]);

		// Use user data from parallel fetch
		const userFullName = user?.fullName || "User";

		// Send OTP via Mailgun (non-blocking for faster response)
		const { mailgunService } = await import("../services/mailgun");
		mailgunService
			.sendOTPEmail(email, otp, { fullName: userFullName })
			.catch(() => {
				// Silently fail - email sending shouldn't block sign-in
			});

		// Return a dummy userId for compatibility with existing code
		return ID.unique();
	} catch (error) {
		if (error instanceof Error) {
			if (
				error.message.includes("Invalid email") ||
				error.message.includes("invalid email")
			) {
				throw new Error("Please enter a valid email address.");
			} else if (
				error.message.includes("rate limit") ||
				error.message.includes("too many")
			) {
				throw new Error(
					"Too many requests. Please wait a moment before requesting another code.",
				);
			} else if (
				error.message.includes("network") ||
				error.message.includes("connection")
			) {
				throw new Error(
					"Network error. Please check your connection and try again.",
				);
			} else if (error.message.includes("Failed to send email")) {
				throw new Error("Failed to send verification code. Please try again.");
			} else {
				console.error("Email OTP error:", error);
				throw new Error("Failed to send verification code. Please try again.");
			}
		}
		throw error;
	}
};

export const createAccount = async ({ email }: { email: string }) => {
	// Only send OTP, do not create Auth user or messaging target yet
	await sendEmailOTP({ email });
	return { sent: true };
};

// This function should be called only after OTP is verified
export const finalizeAccountAfterEmailVerification = async ({
	fullName,
	email,
}: {
	fullName: string;
	email: string;
}) => {
	// 1. Create Auth user if not exists, or update name if missing
	const client = new sdk.Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
		.setKey(process.env.NEXT_APPWRITE_API_KEY!);
	const users = new sdk.Users(client);
	// Check if user already exists in Auth
	const userList = await users.list({
		queries: [sdk.Query.equal("email", email)],
	});
	let authUser;
	if (userList.total > 0) {
		authUser = userList.users[0];
		// Update name if missing
		if ((!authUser.name || authUser.name === "") && fullName) {
			await users.updateName({
				userId: authUser.$id,
				name: fullName,
			});
		}
	} else {
		const randomPassword = crypto.randomBytes(16).toString("hex");
		authUser = await users.create({
			userId: sdk.ID.unique(),
			email: email,
			password: randomPassword,
			name: fullName,
		});
	}
	const accountId = authUser.$id;

	// 2. After OTP verification, update email verification status
	await users.updateEmailVerification({
		userId: accountId,
		emailVerification: true,
	});

	// 3. Create users collection document with the fullName (if not already exists)
	const { isDemoMode } = await import("@/lib/config/demo-mode");
	const { tablesDB } = await createAdminClient();
	let usersCollectionId: string | null = null;
	try {
		// Check if user already exists in users collection
		const existingUser = await getUserByEmail(email);
		if (!existingUser) {
			usersCollectionId = ID.unique();
			await tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.usersCollectionId || "users",
				rowId: usersCollectionId,
				data: {
					fullName: fullName,
					email: email,
					avatar: avatarPlaceholderUrl,
					accountId: accountId,
					department: "Administration",
					orgId: isDemoMode() ? "pending-demo" : "default_organization",
				},
			});
			console.log(
				"User document created in users collection with fullName:",
				fullName,
			);
		} else {
			usersCollectionId = existingUser.$id;
			// Update existing user's fullName if it's empty
			if (!existingUser.fullName || existingUser.fullName === "") {
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.usersCollectionId || "users",
					rowId: existingUser.$id,
					data: {
						fullName: fullName,
					},
				});
				console.log("Updated existing user document with fullName:", fullName);
			} else {
				console.log(
					"User document already exists with fullName:",
					existingUser.fullName,
				);
			}
		}
	} catch (error) {
		console.error(
			"Failed to create/update user document in users collection:",
			error,
		);
		// Don't throw error here as the Auth user was created successfully
		// The user can still sign in, but their name won't be in the custom collection
	}

	// Demo mode: provision per-visitor sandbox and skip executive notifications
	if (isDemoMode() && usersCollectionId) {
		const { provisionDemoSandbox } = await import(
			"@/lib/demo/provision-sandbox"
		);
		const sandbox = await provisionDemoSandbox({
			userId: usersCollectionId,
			email,
			fullName,
		});
		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: usersCollectionId,
			data: {
				orgId: sandbox.orgId,
			},
		});
		return {
			accountId,
			userId: usersCollectionId,
			orgId: sandbox.orgId,
			dashboardPath: sandbox.dashboardPath,
		};
	}

	// 4-6. Run non-critical operations in parallel (don't await)
	// These operations run in the background and don't block the user's redirect
	Promise.allSettled([
		// Add messaging target
		addUserEmailTarget({ userId: accountId, email }).catch((error) => {
			console.warn("Failed to add email target:", error);
		}),

		// Send confirmation email
		(async () => {
			try {
				const { mailgunService } = await import("../services/mailgun");
				await mailgunService.sendAccountRequestConfirmation(email, fullName);
				console.log("Account request confirmation email sent to:", email);
			} catch (error) {
				console.error(
					"Failed to send account request confirmation email:",
					error,
				);
			}
		})(),

		// Notify executives
		(async () => {
			try {
				const { triggerNewUserRequestNotification } = await import(
					"../utils/notificationTriggers"
				);
				await triggerNewUserRequestNotification(email, fullName);
				console.log(
					"Executive notification sent for new user request from:",
					email,
				);

				// Also send SMS notification using our new system
				await notifyOTPVerified(email, fullName);
			} catch (error) {
				console.error(
					"Failed to notify executives about new user request:",
					error,
				);
			}
		})(),
	]).then(() => {
		console.log("Background tasks completed for user:", email);
	});

	// Return immediately without waiting for background tasks
	return { accountId, userId: usersCollectionId };
};

export const verifyOTP = async ({
	email,
	otp,
	accountId,
}: {
	email: string;
	otp: string;
	accountId?: string;
}) => {
	try {
		const { isDemoMode, getDemoOtpCode } = await import(
			"@/lib/config/demo-mode"
		);

		// Demo mode: accept fixed OTP even if DB token is missing/stale
		if (isDemoMode() && otp === getDemoOtpCode()) {
			if (accountId) {
				return { success: true, accountId };
			}
			return { success: true };
		}

		const { tablesDB } = await createAdminClient();

		// Find the OTP in the database (optimized query with limit)
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
			throw new Error("Invalid verification code. Please check and try again.");
		}

		const otpRecord = result.rows[0];
		const now = new Date();
		const expiresAt = new Date(otpRecord.expiresAt);

		// Check if OTP has expired
		if (now > expiresAt) {
			throw new Error(
				"The verification code has expired. Please request a new one.",
			);
		}

		// Mark OTP as used and return success in parallel for faster response
		const updatePromise = tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.otpTokensCollectionId || "otp-tokens",
			rowId: otpRecord.$id,
			data: {
				used: true,
			},
		});

		// Send SMS notification to admins for sign-up (not sign-in)
		// Run in background without blocking the response
		if (!accountId) {
			getUserByEmail(email)
				.then((userInfo) => {
					if (userInfo) {
						return notifyOTPVerified(email, userInfo.fullName);
					}
				})
				.catch(() => {
					// Silently fail - SMS failure shouldn't block user flow
				});
		}

		// Wait for update to complete
		await updatePromise;

		// If accountId is provided (sign-in flow), return it for client-side session creation
		if (accountId) {
			return {
				success: true,
				accountId: accountId,
			};
		}

		return { success: true };
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("verifyOTP: Error occurred:", error);
		}

		if (error instanceof Error) {
			if (
				error.message.includes("Invalid verification code") ||
				error.message.includes("expired")
			) {
				throw error; // Re-throw user-friendly messages
			} else {
				throw new Error("Verification failed. Please try again.");
			}
		}

		throw new Error("An unexpected error occurred. Please try again.");
	}
};

export const verifySecret = async ({
	accountId,
	password,
}: {
	accountId: string;
	password: string;
}) => {
	try {
		const { account } = await createAdminClient();
		const session = await account.createSession({
			userId: accountId,
			secret: password,
		});

		const cookieStore = await cookies();
		cookieStore.set("appwrite-session", session.secret, {
			path: "/",
			httpOnly: true,
			sameSite: "strict",
			secure: true,
		});

		// Note: 2fa_completed cookie will be set after 2FA setup/verification
		// This is just the OTP verification step

		return parseStringify({ sessionId: session.$id });
	} catch (error) {
		// Handle specific Appwrite errors with user-friendly messages
		if (error instanceof Error) {
			if (
				error.message.includes("Invalid token") ||
				error.message.includes("invalid token")
			) {
				throw new Error(
					"The verification code you entered is invalid. Please check and try again.",
				);
			} else if (
				error.message.includes("expired") ||
				error.message.includes("Expired")
			) {
				throw new Error(
					"The verification code has expired. Please request a new one.",
				);
			} else if (
				error.message.includes("rate limit") ||
				error.message.includes("too many")
			) {
				throw new Error(
					"Too many attempts. Please wait a moment before trying again.",
				);
			} else if (
				error.message.includes("user not found") ||
				error.message.includes("User not found")
			) {
				throw new Error(
					"Account not found. Please check your email and try again.",
				);
			} else if (
				error.message.includes("permission") ||
				error.message.includes("unauthorized")
			) {
				throw new Error("You do not have permission to perform this action.");
			} else if (
				error.message.includes("network") ||
				error.message.includes("connection")
			) {
				throw new Error(
					"Network error. Please check your connection and try again.",
				);
			} else {
				// Log the original error for debugging but return a user-friendly message
				console.error("OTP verification error:", error);
				throw new Error("Verification failed. Please try again.");
			}
		}

		// Fallback for unknown error types
		console.error("Unknown OTP verification error:", error);
		throw new Error("An unexpected error occurred. Please try again.");
	}
};

const getCurrentUserImpl = async () => {
	try {
		const { tablesDB, account } = await createSessionClient();
		const result = await account.get();

		// Only log in development
		if (process.env.NODE_ENV === "development") {
			console.log("getCurrentUser - Account ID:", result.$id);
		}

		const user = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [sdk.Query.equal("accountId", result.$id)],
		});

		if (process.env.NODE_ENV === "development") {
			console.log("getCurrentUser - Database query result:", {
				total: user.total,
				rows: user.rows,
				firstRow: user.rows[0] || null,
			});
		}

		if (user.total === 0) return null;

		// Return only the user data, not the client objects
		const userData = user.rows[0];

		// Parallel: Get user's role from database (for calendar permissions compatibility)
		// Both functions are now cached, so this is fast
		const defaultOrg = await getUserDefaultOrganization(userData.$id);
		const userRoles = defaultOrg
			? await getUserRoles(userData.$id, defaultOrg.orgId)
			: [];
		const roleName = userRoles[0]?.roleName || "";

		// Map new RBAC roles to calendar roles for compatibility
		let calendarRole: CalendarRole = "viewer";
		if (roleName === "Super Admin" || roleName === "Organization Admin") {
			calendarRole = "admin";
		} else if (roleName === "Department Manager") {
			calendarRole = "approver";
		} else if (roleName === "Viewer") {
			calendarRole = "viewer";
		} else if (roleName === "IT") {
			calendarRole = "admin"; // IT staff get admin-level calendar access
		}

		return parseStringify({
			$id: userData.$id,
			fullName: userData.fullName,
			email: userData.email,
			avatar: userData.avatar,
			accountId: userData.accountId,
			role: calendarRole,
			division: userData.division,
			status: userData.status,
			$createdAt: userData.$createdAt,
			$updatedAt: userData.$updatedAt,
		});
	} catch (error) {
		// Don't log session errors as they're expected in 2FA flow
		if (error instanceof Error && error.message.includes("No session found")) {
			// If no session found, try to get user from 2FA cookies
			console.log(
				"getCurrentUser - No session found, checking 2FA authentication",
			);
			return await getCurrentUserFrom2FA();
		}
		console.log("getCurrentUser - Error:", error);
		return null;
	}
};

const getCurrentUserCached = cache(getCurrentUserImpl);

export async function getCurrentUser() {
	return getCurrentUserCached();
}

const getCurrentUserFrom2FAImpl = async () => {
	try {
		const cookieStore = await cookies();
		const hasCompleted2FA = cookieStore.get("2fa_completed");
		const userIdFromCookie = cookieStore.get("2fa_user_id");

		if (!hasCompleted2FA?.value || !userIdFromCookie?.value) {
			console.log(
				"getCurrentUserFrom2FA - No 2FA completion or user ID cookie found",
			);
			return null;
		}

		try {
			const { tablesDB } = await createAdminClient();
			const userResponse = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: appwriteConfig.usersCollectionId || "users",
				queries: [Query.equal("$id", userIdFromCookie.value)],
			});

			if (userResponse.total === 0) {
				console.log("getCurrentUserFrom2FA - User not found in database");
				return null;
			}

			const user = userResponse.rows[0];

			const defaultOrg = await getUserDefaultOrganization(user.$id);
			const userRoles = defaultOrg
				? await getUserRoles(user.$id, defaultOrg.orgId)
				: [];
			const roleName = userRoles[0]?.roleName || "";

			let calendarRole: CalendarRole = "viewer";
			if (roleName === "Super Admin" || roleName === "Organization Admin") {
				calendarRole = "admin";
			} else if (roleName === "Department Manager") {
				calendarRole = "approver";
			} else if (roleName === "Viewer") {
				calendarRole = "viewer";
			}

			return parseStringify({
				$id: user.$id,
				fullName: user.fullName,
				email: user.email,
				avatar: user.avatar,
				accountId: user.accountId,
				role: calendarRole,
				division: user.division,
				status: user.status,
				profileImageId: resolveProfileImageId({
					avatar: user.avatar,
					profileImageId: user.profileImageId,
				}),
				$createdAt: user.$createdAt,
				$updatedAt: user.$updatedAt,
			});
		} catch (fetchError) {
			console.error(
				"getCurrentUserFrom2FA - Database fetch failed:",
				fetchError,
			);
			return null;
		}
	} catch (error) {
		console.error("getCurrentUserFrom2FA - Error occurred:", error);
		return null;
	}
};

const getCurrentUserFrom2FACached = cache(getCurrentUserFrom2FAImpl);

export async function getCurrentUserFrom2FA() {
	return getCurrentUserFrom2FACached();
}

export const signOutUser = async () => {
	// Clear cookies immediately and redirect - don't wait for Appwrite session deletion
	const cookieStore = await cookies();
	cookieStore.delete("appwrite-session");
	cookieStore.delete("2fa_completed");
	cookieStore.delete("2fa_user_id");

	// Fire and forget - delete session in background (non-blocking)
	createSessionClient()
		.then(({ account }) => account.deleteSession("current"))
		.catch(() => {
			// Silently ignore - session might already be invalid
		});

	// Redirect immediately
	redirect("/sign-in");
};

export const signInUser = async ({ email }: { email: string }) => {
	try {
		// Optimized: Check both sources in parallel for faster response
		const [existingUser, authUserResult] = await Promise.allSettled([
			getUserByEmail(email),
			// Check Appwrite Auth in parallel (only if custom user not found)
			(async () => {
				const client = new sdk.Client()
					.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
					.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
					.setKey(process.env.NEXT_APPWRITE_API_KEY!);
				const users = new sdk.Users(client);
				const userList = await users.list({
					queries: [sdk.Query.equal("email", email)],
				});
				return userList.total > 0 ? userList.users[0] : null;
			})(),
		]);

		const user =
			existingUser.status === "fulfilled"
				? (existingUser.value as AppUser | null)
				: null;

		const authUser = user
			? null
			: authUserResult.status === "fulfilled"
				? authUserResult.value
				: null;

		// If user lookup failed due to auth (e.g. missing API key), surface that instead of "not found"
		if (existingUser.status === "rejected") {
			const err = existingUser.reason as
				| { code?: number; type?: string; message?: string }
				| undefined;
			const isUnauthorized =
				err?.code === 401 ||
				err?.type === "user_unauthorized" ||
				err?.message?.includes("not authorized");
			if (isUnauthorized) {
				throw new Error(
					"Server configuration error: Unable to verify user. Please contact support.",
				);
			}
		}

		if (user) {
			// User found - send OTP in background (non-blocking for faster response)
			sendEmailOTP({ email }).catch((err) => {
				if (process.env.NODE_ENV === "development") {
					console.error("Failed to send OTP (non-blocking):", err);
				}
			});
			return { accountId: user.accountId };
		}

		if (authUser) {
			// Create user record and send OTP in parallel
			const { isDemoMode } = await import("@/lib/config/demo-mode");
			const { tablesDB } = await createAdminClient();
			const userId = ID.unique();

			// Parallelize user creation and OTP sending
			await Promise.all([
				tablesDB.createRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.usersCollectionId || "users",
					rowId: userId,
					data: {
						fullName: authUser.name || "",
						email: authUser.email,
						avatar: avatarPlaceholderUrl,
						accountId: authUser.$id,
						department: "Administration",
						orgId: isDemoMode() ? "pending-demo" : "default_organization",
					},
				}),
				sendEmailOTP({ email }),
			]);

			if (isDemoMode()) {
				const { provisionDemoSandbox } = await import(
					"@/lib/demo/provision-sandbox"
				);
				const sandbox = await provisionDemoSandbox({
					userId,
					email: authUser.email,
					fullName: authUser.name || "Demo Visitor",
				});
				await tablesDB.updateRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: appwriteConfig.usersCollectionId || "users",
					rowId: userId,
					data: { orgId: sandbox.orgId },
				});
			}

			// Invalidate cache for this email to ensure fresh data
			await CacheManager.invalidateUsers(email);

			return { accountId: authUser.$id };
		}

		return {
			accountId: null,
			error:
				"No account found with this email address. Please check your email or sign up for a new account.",
		};
	} catch (error) {
		if (process.env.NODE_ENV === "development") {
			console.error("signInUser: Error occurred:", error);
		}

		// Handle specific errors with user-friendly messages
		if (error instanceof Error) {
			if (
				error.message.includes("Invalid email") ||
				error.message.includes("invalid email")
			) {
				return {
					accountId: null,
					error: "Please enter a valid email address.",
				};
			} else if (
				error.message.includes("rate limit") ||
				error.message.includes("too many")
			) {
				return {
					accountId: null,
					error: "Too many requests. Please wait a moment before trying again.",
				};
			} else if (
				error.message.includes("network") ||
				error.message.includes("connection")
			) {
				return {
					accountId: null,
					error: "Network error. Please check your connection and try again.",
				};
			} else if (
				error.message.includes("permission") ||
				error.message.includes("unauthorized")
			) {
				return {
					accountId: null,
					error:
						"You do not have permission to sign in. Please contact support.",
				};
			} else {
				return { accountId: null, error: "Sign in failed. Please try again." };
			}
		}

		return {
			accountId: null,
			error: "An unexpected error occurred. Please try again.",
		};
	}
};

const INVITATIONS_COLLECTION =
	appwriteConfig.invitationsCollectionId || "invitations";

// Types for invitation functions
interface CreateInvitationParams {
	email: string;
	orgId: string;
	role: string;
	department: string;
	division?: string;
	name: string;
	expiresInDays?: number;
	invitedBy: string;
}

interface AcceptInvitationParams {
	token: string;
}

interface RevokeInvitationParams {
	token: string;
}

interface ListPendingInvitationsParams {
	orgId: string;
}

// Valid RBAC role names for invitations
const VALID_RBAC_ROLES = [
	"Super Admin",
	"Organization Admin",
	"Department Manager",
	"Viewer",
];

export const createInvitation = async ({
	email,
	orgId,
	role,
	department,
	division,
	name,
	expiresInDays = 7,
	invitedBy,
}: CreateInvitationParams) => {
	try {
		console.log("createInvitation: Starting invitation creation for:", email);
		console.log("createInvitation: Parameters:", {
			email,
			orgId,
			role,
			department,
			division,
			name,
			invitedBy,
		});
		const { tablesDB } = await createAdminClient();
		console.log("createInvitation: Admin client created successfully");
		const token = crypto.randomBytes(32).toString("hex");
		const expiresAt = new Date(
			Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
		).toISOString();
		const status = "pending";
		const revoked = false;

		// Validate role against new RBAC roles
		const normalizedRole = role.trim();
		const isRecognizedRole = VALID_RBAC_ROLES.includes(normalizedRole);

		console.log("createInvitation: Role validation:", {
			originalRole: role,
			normalizedRole,
			isRecognizedRole,
			validRoles: VALID_RBAC_ROLES,
		});

		if (!isRecognizedRole) {
			console.error("createInvitation: Invalid role:", {
				role,
				normalizedRole,
				validRoles: VALID_RBAC_ROLES,
			});
			throw new Error(
				`Invalid role: ${role}. Must be one of ${VALID_RBAC_ROLES.join(", ")}`,
			);
		}
		console.log("createInvitation: Role validation passed");

		// Validate division against expected enum values
		const validDivisions = [
			"c-suite",
			"clinic",
			"residential",
			"help-desk",
			"hr",
			"support",
			"accounting",
			"behavioral-health",
			"child-welfare",
			"cfs",
		];

		// Debug: Log the received parameters
		console.log("createInvitation: Received parameters:", {
			email,
			role,
			department,
			division,
			divisionType: typeof division,
			divisionLength: division?.length,
			divisionTrimmed: division?.trim(),
			isValidDivision: validDivisions.includes(division?.trim() || ""),
			validDivisions,
			name,
			orgId,
			invitedBy,
		});

		// Validate division value if provided
		if (division && !validDivisions.includes(division.trim())) {
			console.error("createInvitation: Invalid division value:", {
				received: division,
				trimmed: division.trim(),
				validOptions: validDivisions,
			});
			throw new Error(
				`Invalid division value: "${division}". Must be one of: ${validDivisions.join(
					", ",
				)}`,
			);
		}

		// 1. Create invitation document
		console.log("createInvitation: Creating database row...");
		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: INVITATIONS_COLLECTION,
			rowId: ID.unique(),
			data: {
				email,
				orgId,
				role: normalizedRole,
				department: department?.trim(),
				division: division?.trim(),
				name,
				token,
				expiresAt,
				status,
				revoked,
				invitedBy,
			},
		});
		console.log("createInvitation: Database row created successfully");

		// Send SMS notification to admins, executives, and managers
		try {
			await notifyInvitationSent(
				email,
				name,
				normalizedRole,
				department || "N/A",
			);
		} catch (error) {
			console.error("Failed to send invitation SMS:", error);
			// Don't throw - SMS failure shouldn't block invitation creation
		}

		// 2. Send invite link email (using Mailgun)
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://www.caalmsolutions.com";
		const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

		// Send the invite email via Mailgun
		try {
			const { mailgunService } = await import("../services/mailgun");
			await mailgunService.sendInvitationEmail(
				email,
				name,
				inviteLink,
				normalizedRole,
				department,
			);
			console.log("Invitation email sent via Mailgun to:", email);
		} catch (error) {
			console.error("Failed to send invite email via Mailgun:", error);
			throw error;
		}

		// Trigger user invitation notification
		try {
			await triggerUserInvitationNotification(
				invitedBy, // Notify the person who sent the invitation
				email,
				name,
			);
		} catch (error) {
			console.error("Failed to trigger user invitation notification:", error);
			// Don't throw error here as the invitation was created successfully
		}

		return { email, token, expiresAt };
	} catch (error) {
		console.error("createInvitation: Error occurred:", error);

		// Handle specific errors with user-friendly messages
		if (error instanceof Error) {
			if (
				error.message.includes("permission") ||
				error.message.includes("unauthorized")
			) {
				throw new Error("You do not have permission to create invitations.");
			} else if (
				error.message.includes("network") ||
				error.message.includes("connection")
			) {
				throw new Error(
					"Network error. Please check your connection and try again.",
				);
			} else if (
				error.message.includes("database") ||
				error.message.includes("collection")
			) {
				throw new Error("Database error. Please try again later.");
			} else {
				// Log the original error for debugging but return a user-friendly message
				console.error("createInvitation: Original error:", error);
				throw new Error("Failed to create invitation. Please try again.");
			}
		}

		// Fallback for unknown error types
		console.error("createInvitation: Unknown error:", error);
		throw new Error("An unexpected error occurred. Please try again.");
	}
};

export const acceptInvitation = async ({ token }: AcceptInvitationParams) => {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		queries: [sdk.Query.equal("token", token)],
	});
	if (result.total === 0) throw new Error("Invalid invitation token");
	const invite = result.rows[0];
	if (invite.status !== "pending" || invite.revoked)
		throw new Error("Invitation is not valid");
	if (new Date(invite.expiresAt) < new Date())
		throw new Error("Invitation expired");

	// 1. Find Auth user by email
	const client = new sdk.Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
		.setKey(process.env.NEXT_APPWRITE_API_KEY!);
	const users = new sdk.Users(client);
	const userList = await users.list({
		queries: [sdk.Query.equal("email", invite.email)],
	});
	const authUser = userList.total > 0 ? userList.users[0] : null;
	if (!authUser) throw new Error("User not found in Auth");
	const accountId = authUser.$id;

	// 2. Create users collection document if not exists (role is assigned via user_roles table)
	let user = await getUserByEmail(invite.email);
	if (!user) {
		// Validate division against expected enum values
		const validDivisions = [
			"c-suite",
			"clinic",
			"residential",
			"help-desk",
			"hr",
			"support",
			"accounting",
			"behavioral-health",
			"child-welfare",
			"cfs",
		];

		console.log("acceptInvitation: Creating user with data:", {
			fullName: invite.name,
			email: invite.email,
			role: invite.role,
			department: invite.department,
			division: invite.division,
			divisionType: typeof invite.division,
			divisionLength: invite.division?.length,
			divisionTrimmed: invite.division?.trim(),
			isValidDivision: validDivisions.includes(invite.division?.trim() || ""),
			validDivisions,
		});

		// Validate division value
		if (invite.division && !validDivisions.includes(invite.division.trim())) {
			console.error("acceptInvitation: Invalid division value:", {
				received: invite.division,
				trimmed: invite.division.trim(),
				validOptions: validDivisions,
			});
			throw new Error(
				`Invalid division value: "${
					invite.division
				}". Must be one of: ${validDivisions.join(", ")}`,
			);
		}

		await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: sdk.ID.unique(),
			data: {
				fullName: invite.name,
				email: invite.email,
				avatar: avatarPlaceholderUrl,
				accountId,
				department: invite.department,
				division: invite.division,
			},
		});
		user = await getUserByEmail(invite.email);
	}
	if (!user) throw new Error("User creation failed");

	// 3. Assign role to user via user_roles table
	// Get role ID from roles table
	const rolesResult = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "roles",
		queries: [sdk.Query.equal("name", invite.role)],
	});

	if (rolesResult.total > 0) {
		const roleId = rolesResult.rows[0].$id;
		// Get default organization
		const defaultOrg = await getUserDefaultOrganization(user.$id);
		if (defaultOrg) {
			// Check if user_role already exists
			const existingUserRoles = await tablesDB.listRows({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				queries: [
					sdk.Query.equal("userId", user.$id),
					sdk.Query.equal("orgId", defaultOrg.orgId),
					sdk.Query.equal("roleId", roleId),
				],
			});

			if (existingUserRoles.total === 0) {
				await tablesDB.createRow({
					databaseId: appwriteConfig.databaseId || "default-db",
					tableId: "user_roles",
					rowId: ID.unique(),
					data: {
						userId: user.$id,
						orgId: defaultOrg.orgId,
						roleId: roleId,
						assignedBy: invite.invitedBy || user.$id,
					},
				});

				// Invalidate RBAC cache for this user
				await CacheManager.invalidateRBAC(user.$id, defaultOrg.orgId);
			}
		}
	}

	// 4. Mark invitation as accepted
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		rowId: invite.$id,
		data: { status: "accepted" },
	});

	// Send SMS notification to admins, executives, and department managers
	try {
		await notifyInvitationAccepted(
			invite.email,
			invite.name,
			invite.role,
			invite.department || "N/A",
		);
	} catch (error) {
		console.error("Failed to send invitation acceptance SMS:", error);
		// Don't throw - SMS failure shouldn't block invitation acceptance
	}

	// 5. Return info for frontend to redirect to dashboard
	return {
		success: true,
		email: invite.email,
		accountId: user.accountId,
		role: invite.role,
		department: user.department,
	};
};

export const revokeInvitation = async ({ token }: RevokeInvitationParams) => {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		queries: [sdk.Query.equal("token", token)],
	});
	if (result.total === 0) throw new Error("Invalid invitation token");
	const invite = result.rows[0];
	await tablesDB.updateRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		rowId: invite.$id,
		data: { revoked: true, status: "revoked" },
	});
	return { success: true };
};

export const deleteInvitation = async ({ token }: RevokeInvitationParams) => {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		queries: [sdk.Query.equal("token", token)],
	});
	if (result.total === 0) throw new Error("Invalid invitation token");
	const invite = result.rows[0];
	await tablesDB.deleteRow({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		rowId: invite.$id,
	});
	return { success: true };
};

export const listPendingInvitations = async ({
	orgId,
}: ListPendingInvitationsParams) => {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: INVITATIONS_COLLECTION,
			queries: [
				sdk.Query.equal("orgId", orgId),
				sdk.Query.equal("status", "pending"),
				sdk.Query.equal("revoked", false),
			],
		});
		return result.rows;
	} catch (error: any) {
		console.error("Failed to fetch pending invitations:", error);

		// Return empty array in test/CI environments when Appwrite fails
		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return [];
		}

		throw error;
	}
};

export const addUserEmailTarget = async ({
	userId,
	email,
}: {
	userId: string;
	email: string;
}) => {
	const client = new sdk.Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
		.setKey(process.env.NEXT_APPWRITE_API_KEY!);

	const users = new sdk.Users(client);
	const targetType = sdk.MessagingProviderType.Email;

	try {
		// First, check if a target already exists for this user and email
		const existingTargets = await users.listTargets({ userId });
		const existingEmailTarget = existingTargets.targets.find(
			(target) =>
				target.providerType === "email" && target.identifier === email,
		);

		if (existingEmailTarget) {
			console.log("Email target already exists for user:", userId);
			return existingEmailTarget;
		}

		// If no existing target, create a new one with a more specific ID
		const targetId = `email_${userId}_${Date.now()}`;
		const response = await users.createTarget({
			userId: userId,
			targetId: targetId,
			providerType: targetType,
			identifier: email,
		});
		return response;
	} catch (error) {
		// If the error is about duplicate ID, try with a different approach
		if (error instanceof Error && error.message.includes("already exists")) {
			console.log("Target ID conflict, trying with unique ID...");
			try {
				const response = await users.createTarget({
					userId,
					targetId: ID.unique(),
					providerType: targetType,
					identifier: email,
				});
				return response;
			} catch (retryError) {
				console.error("Error creating email target on retry:", retryError);
				throw retryError;
			}
		}
		console.error("Error creating email target:", error);
		throw error;
	}
};

export const addUserSmsTarget = async ({
	userId,
	e164Phone,
}: {
	userId: string;
	e164Phone: string;
}) => {
	const client = new sdk.Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
		.setKey(process.env.NEXT_APPWRITE_API_KEY!);

	const users = new sdk.Users(client);
	const targetType = sdk.MessagingProviderType.Sms;

	try {
		// Validate E.164 format
		if (!/^\+\d{10,15}$/.test(e164Phone)) {
			throw new Error("Phone must be in E.164 format, e.g. +15551234567");
		}

		// Check if an SMS target already exists for this user and phone
		const existingTargets = await users.listTargets({ userId });
		const existingSmsTarget = existingTargets.targets.find(
			(target) =>
				target.providerType === "sms" && target.identifier === e164Phone,
		);

		if (existingSmsTarget) {
			return existingSmsTarget;
		}

		// Create with deterministic ID, fallback to unique on conflict
		const targetId = `sms_${userId}_${Date.now()}`;
		try {
			const response = await users.createTarget({
				userId: userId,
				targetId: targetId,
				providerType: targetType,
				identifier: e164Phone,
			});
			return response;
		} catch (err) {
			if (err instanceof Error && err.message.includes("already exists")) {
				return await users.createTarget({
					userId: userId,
					targetId: sdk.ID.unique(),
					providerType: targetType,
					identifier: e164Phone,
				});
			}
			throw err;
		}
	} catch (error) {
		console.error("Error creating SMS target:", error);
		throw error;
	}
};

export const getInvitationByToken = async (token: string) => {
	const { tablesDB } = await createAdminClient();
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: INVITATIONS_COLLECTION,
		queries: [sdk.Query.equal("token", token)],
	});
	return result.total > 0 ? result.rows[0] : null;
};

export const resendInvitation = async ({ token }: { token: string }) => {
	try {
		console.log("resendInvitation: Starting resend for token:", token);

		const { tablesDB } = await createAdminClient();

		// Get the invitation details
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId!,
			tableId: INVITATIONS_COLLECTION,
			queries: [sdk.Query.equal("token", token)],
		});

		if (result.rows.length === 0) {
			throw new Error("Invitation not found");
		}

		const invitation = result.rows[0];
		console.log("resendInvitation: Found invitation:", invitation);

		// Check if invitation is still valid (not revoked and not expired)
		if (invitation.revoked) {
			throw new Error("Cannot resend a revoked invitation");
		}

		const now = new Date();
		const expiresAt = new Date(invitation.expiresAt);
		if (now > expiresAt) {
			throw new Error("Cannot resend an expired invitation");
		}

		// Generate new invite link
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL || "https://www.caalmsolutions.com";
		const inviteLink = `${baseUrl}/invite/accept?token=${token}`;

		// Send the invite email via Mailgun
		const { mailgunService } = await import("../services/mailgun");
		await mailgunService.sendInvitationEmail(
			invitation.email,
			invitation.name,
			inviteLink,
			invitation.role || "Viewer",
			invitation.department,
		);

		console.log(
			"resendInvitation: Email resent successfully to:",
			invitation.email,
		);

		return { success: true, email: invitation.email };
	} catch (error) {
		console.error("resendInvitation: Error occurred:", error);

		if (error instanceof Error) {
			throw new Error(`Failed to resend invitation: ${error.message}`);
		} else {
			throw new Error("Failed to resend invitation");
		}
	}
};

/**
 * Update a user's profile in the users collection.
 * @param {Object} params
 * @param {string} params.accountId - The user's accountId (Appwrite Auth user ID)
 * @param {string} [params.fullName] - The user's full name
 * @param {string} [params.role] - The user's role
 * @returns {Promise<Object>} The updated user document
 */
export const updateUserProfile = async ({
	accountId,
	fullName,
	division,
	role,
	department,
}: {
	accountId: string;
	fullName?: string;
	division?: UserDivision;
	role?: string;
	department?: string;
}) => {
	try {
		const { tablesDB } = await createAdminClient();
		// Find the user document by accountId
		const userList = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [sdk.Query.equal("accountId", accountId)],
		});
		if (userList.total === 0) throw new Error("User not found");
		const userDoc = userList.rows[0];

		// Prepare update payload
		// Note: role updates should be done via user_roles table, not directly on user
		const updatePayload: Record<string, unknown> = {};
		if (fullName !== undefined) updatePayload.fullName = fullName;
		if (division !== undefined) updatePayload.division = division;
		if (department !== undefined) updatePayload.department = department;

		// Preserve required fields like orgId if they exist in the document
		// This ensures we don't lose required attributes during partial updates
		if (userDoc.orgId) {
			updatePayload.orgId = userDoc.orgId;
		}

		// Update the user document
		const updatedUser = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userDoc.$id,
			data: updatePayload,
		});
		return updatedUser;
	} catch (error) {
		handleError(error, "Failed to update user profile");
	}
};

/**
 * Update a user's department field while preserving required attributes
 * @param userId - The user's document ID ($id)
 * @param department - The new department value
 * @returns The updated user document
 */
export const updateUserDepartment = async ({
	userId,
	department,
}: {
	userId: string;
	department: string;
}) => {
	try {
		const { tablesDB } = await createAdminClient();

		// First, get the existing user document to preserve required fields
		const userDoc = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});

		if (!userDoc) {
			throw new Error("User not found");
		}

		// Prepare update payload with department and preserve required fields
		const updatePayload: Record<string, unknown> = {
			department,
		};

		// Preserve orgId if it exists (required attribute)
		if (userDoc.orgId) {
			updatePayload.orgId = userDoc.orgId;
		}

		// Preserve other required fields that might exist
		if (userDoc.accountId) {
			updatePayload.accountId = userDoc.accountId;
		}
		if (userDoc.email) {
			updatePayload.email = userDoc.email;
		}

		// Update the user document
		const updatedUser = await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
			data: updatePayload,
		});

		return updatedUser;
	} catch (error) {
		handleError(error, "Failed to update user department");
	}
};

/**
 * List all users in the users collection.
 * @returns {Promise<any[]>} Array of user documents
 */
export const listAllUsers = async () => {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
		});
		return result.rows;
	} catch (error) {
		handleError(error, "Failed to list all users");
	}
};

export interface UserManagementRow {
	$id: string;
	fullName: string;
	email: string;
	avatar: string;
	accountId: string;
	role: CalendarRole;
	roleName: string;
	assignedByName: string;
	assignedDate?: string;
	lastActiveAt?: string;
	$createdAt?: string;
	$updatedAt?: string;
	department?: string;
	status?: string;
}

function calendarRoleFromRbacName(roleName: string): CalendarRole {
	const name = roleName.trim();
	if (name === "Super Admin" || name === "Organization Admin") return "admin";
	if (name === "Department Manager") return "approver";
	if (name === "Viewer") return "viewer";
	if (name === "IT") return "admin";
	return "viewer";
}

function resolveProfileAvatarUrl(user: {
	avatar?: string;
	profileImageId?: string | null;
}): string {
	const avatarValue = user.avatar?.trim();
	const profileImageId = user.profileImageId?.trim();

	if (avatarValue && /^https?:\/\//i.test(avatarValue)) {
		return avatarValue;
	}
	if (avatarValue?.startsWith("/")) {
		return avatarValue;
	}

	const imageId = avatarValue || profileImageId;
	if (
		imageId &&
		appwriteConfig.endpointUrl &&
		appwriteConfig.profilePicturesBucketId &&
		appwriteConfig.projectId
	) {
		return `${appwriteConfig.endpointUrl}/storage/buckets/${appwriteConfig.profilePicturesBucketId}/files/${imageId}/view?project=${appwriteConfig.projectId}`;
	}

	return avatarPlaceholderUrl;
}

function resolveProfileImageId(user: {
	avatar?: string;
	profileImageId?: string | null;
}): string | null {
	const avatarValue = user.avatar?.trim();
	if (
		avatarValue &&
		!avatarValue.startsWith("/") &&
		!/^https?:\/\//i.test(avatarValue)
	) {
		return avatarValue;
	}
	return user.profileImageId || null;
}

export const listUsersForManagement = async (
	orgId: string,
): Promise<UserManagementRow[]> => {
	try {
		const { tablesDB } = await createAdminClient();
		const databaseId = appwriteConfig.databaseId || "default-db";
		const usersTableId = appwriteConfig.usersCollectionId || "users";

		const [usersResult, userRolesResult, rolesResult] = await Promise.all([
			tablesDB.listRows({
				databaseId,
				tableId: usersTableId,
				queries: [Query.limit(500)],
			}),
			tablesDB.listRows({
				databaseId,
				tableId: "user_roles",
				queries: [Query.equal("orgId", orgId), Query.limit(500)],
			}),
			tablesDB.listRows({
				databaseId,
				tableId: "roles",
				queries: [Query.limit(500)],
			}),
		]);

		const rolesById = new Map<string, string>();
		for (const role of rolesResult.rows) {
			const roleId = String((role as { $id?: string }).$id || "");
			const roleName = String((role as { name?: string }).name || "N/A");
			if (roleId) rolesById.set(roleId, roleName);
		}

		const usersById = new Map<
			string,
			{ fullName: string; email: string; avatar?: string }
		>();
		for (const user of usersResult.rows) {
			const userId = String((user as { $id?: string }).$id || "");
			if (!userId) continue;
			usersById.set(userId, {
				fullName: String((user as { fullName?: string }).fullName || "Unknown"),
				email: String((user as { email?: string }).email || ""),
				avatar: (user as { avatar?: string }).avatar,
			});
		}

		const assignmentsByUserId = new Map<
			string,
			{
				roleName: string;
				assignedByName: string;
				assignedDate?: string;
			}
		>();

		for (const assignment of userRolesResult.rows) {
			const targetUserId = String(
				(assignment as { userId?: string }).userId || "",
			);
			if (!targetUserId) continue;

			const roleId = String((assignment as { roleId?: string }).roleId || "");
			const assignedById = String(
				(assignment as { assignedBy?: string }).assignedBy || "",
			);
			const assignedByUser = assignedById ? usersById.get(assignedById) : null;
			const roleName = roleId ? (rolesById.get(roleId) ?? "N/A") : "N/A";
			const assignedDate =
				(assignment as { assignedAt?: string }).assignedAt ||
				(assignment as { $createdAt?: string }).$createdAt;

			const existing = assignmentsByUserId.get(targetUserId);
			if (!existing) {
				assignmentsByUserId.set(targetUserId, {
					roleName,
					assignedByName: assignedByUser?.fullName || "System",
					assignedDate,
				});
				continue;
			}

			const existingTs = existing.assignedDate
				? new Date(existing.assignedDate).getTime()
				: 0;
			const nextTs = assignedDate ? new Date(assignedDate).getTime() : 0;

			if (nextTs > existingTs) {
				assignmentsByUserId.set(targetUserId, {
					roleName,
					assignedByName: assignedByUser?.fullName || "System",
					assignedDate,
				});
			}
		}

		return usersResult.rows
			.filter((user) => {
				const userId = String((user as { $id?: string }).$id || "");
				const docOrgId = (user as { orgId?: string }).orgId;
				if (docOrgId === orgId || assignmentsByUserId.has(userId)) return true;
				return false;
			})
			.map((user) => {
				const userId = String((user as { $id?: string }).$id || "");
				const assignment = assignmentsByUserId.get(userId);
				const createdAt = (user as { $createdAt?: string }).$createdAt;
				const updatedAt = (user as { $updatedAt?: string }).$updatedAt;
				const roleName = assignment?.roleName || "Unassigned";
				const accountId = String(
					(user as { accountId?: string }).accountId || "",
				);
				return {
					$id: userId,
					fullName: String(
						(user as { fullName?: string }).fullName || "Unknown",
					),
					email: String((user as { email?: string }).email || ""),
					avatar: resolveProfileAvatarUrl(
						user as { avatar?: string; profileImageId?: string | null },
					),
					accountId,
					role: calendarRoleFromRbacName(roleName),
					roleName,
					assignedByName: assignment?.assignedByName || "System",
					assignedDate: assignment?.assignedDate || createdAt,
					lastActiveAt: updatedAt || createdAt,
					$createdAt: createdAt,
					$updatedAt: updatedAt,
					department: (user as { department?: string }).department,
					status: (user as { status?: string }).status,
				};
			});
	} catch (error) {
		handleError(error, "Failed to list users for management");
		return [];
	}
};

export const getActiveUsersCount = async () => {
	try {
		const { tablesDB } = await createAdminClient();
		const result = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			queries: [sdk.Query.equal("status", "active")],
		});
		return result.total;
	} catch (error: any) {
		console.error("Failed to fetch active users count:", error);

		// Return 0 in test/CI environments when Appwrite fails
		if (
			process.env.CI ||
			process.env.NODE_ENV === "test" ||
			error?.isTestConfig ||
			error?.code === "TEST_CONFIG" ||
			error?.message?.includes(
				"Project with the requested ID could not be found",
			) ||
			error?.message?.includes("AppwriteException")
		) {
			return 0;
		}

		return 0;
	}
};

/**
 * Delete a user document from the users collection by $id.
 * @param {string} userId - The $id of the user document to delete
 */
export const deleteUser = async (userId: string) => {
	try {
		const { tablesDB } = await createAdminClient();
		await tablesDB.deleteRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});
		return { success: true };
	} catch (error) {
		handleError(error, "Failed to delete user");
	}
};

export const getContracts = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		const res = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.contractsCollectionId || "contracts",
		});
		return parseStringify(res.rows);
	} catch (error) {
		console.error("Failed to fetch contracts:", error);
		return [];
	}
};

export const getUnreadNotificationsCount = async (userId: string) => {
	const { tablesDB } = await createAdminClient();
	try {
		const res = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: "notifications",
			queries: [
				sdk.Query.equal("userId", userId),
				sdk.Query.equal("read", false),
			],
		});
		return res.total;
	} catch (error) {
		console.error("Failed to fetch unread notifications:", error);
		return 0;
	}
};

// Get all users from Auth database
export const getAllAuthUsers = async () => {
	try {
		// Get all Auth users
		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const users = new sdk.Users(client);
		const authUsers = await users.list({});

		return authUsers.users.map((user) => ({
			$id: user.$id,
			email: user.email,
			fullName: user.name || "Unknown",
			$createdAt: user.$createdAt,
		}));
	} catch (error) {
		console.error("Failed to fetch Auth users:", error);
		return [];
	}
};

// Get users who have signed up but haven't been invited yet
export const getUninvitedUsers = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		// Get all Auth users
		const client = new sdk.Client()
			.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
			.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
			.setKey(process.env.NEXT_APPWRITE_API_KEY!);
		const users = new sdk.Users(client);
		const authUsers = await users.list({});

		// Get all users in the users collection (invited users)
		const invitedUsers = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
		});

		// Get all pending invitations
		const pendingInvitations = await tablesDB.listRows({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: INVITATIONS_COLLECTION,
			queries: [sdk.Query.equal("status", "pending")],
		});

		// Filter out users who are already in the users collection or have pending invitations
		const invitedEmails = new Set([
			...invitedUsers.rows.map(
				(u: Record<string, unknown>) => u.email as string,
			),
			...pendingInvitations.rows.map(
				(inv: Record<string, unknown>) => inv.email as string,
			),
		]);

		const uninvitedUsers = authUsers.users.filter(
			(authUser) => !invitedEmails.has(authUser.email),
		);

		return uninvitedUsers.map((user) => ({
			$id: user.$id,
			email: user.email,
			fullName: user.name || "Unknown",
			$createdAt: user.$createdAt,
		}));
	} catch (error) {
		console.error("Failed to fetch uninvited users:", error);
		return [];
	}
};

export async function fetchUserNamesByIds(
	userIds: string[],
): Promise<AppUser[]> {
	if (!userIds || userIds.length === 0) {
		return [];
	}

	try {
		// Use absolute URL for server-side compatibility
		const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
		const response = await fetch(`${baseUrl}/api/users/get-by-ids`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ userIds }),
		});

		if (!response.ok) {
			const errorData = await response
				.json()
				.catch(() => ({ error: "Unknown error" }));
			console.error("[fetchUserNamesByIds] API error:", {
				status: response.status,
				statusText: response.statusText,
				error: errorData,
			});
			throw new Error(errorData.error || "Failed to fetch user names");
		}

		const users: AppUser[] = await response.json();

		// Filter out any debug info or non-user objects
		const validUsers = Array.isArray(users)
			? users.filter(
					(user) =>
						user &&
						typeof user === "object" &&
						("$id" in user || "fullName" in user),
				)
			: [];

		if (validUsers.length !== users.length) {
			console.warn("[fetchUserNamesByIds] Filtered out invalid user objects:", {
				requested: userIds,
				received: users.length,
				valid: validUsers.length,
			});
		}

		return validUsers;
	} catch (error) {
		console.error("[fetchUserNamesByIds] Error:", error);
		return [];
	}
}
