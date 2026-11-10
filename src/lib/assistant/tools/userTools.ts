import { ID, Query } from "node-appwrite";
import { CONTRACT_DEPARTMENTS } from "../../../../constants";
import {
	PERMISSION_DEFINITIONS,
	PERMISSIONS,
	type PermissionKey,
} from "@/constants/permissions";
import {
	createInvitation,
	getUninvitedUsers,
	listPendingInvitations,
	listUsersForManagement,
	resendInvitation,
	updateUserProfile,
	type UserManagementRow,
} from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import {
	getOrganization,
	updateOrganization,
} from "@/lib/rbac/organizations";
import { getRolePermissions, listRoles } from "@/lib/rbac/roles";
import { validateRoleIdsUnionForSod } from "@/lib/rbac/separation-of-duties";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";

const PERMISSION_LABEL_BY_KEY = new Map(
	PERMISSION_DEFINITIONS.map((def) => [def.key, def.name] as const),
);

function plainPermissionLabel(key: PermissionKey | string): string {
	return PERMISSION_LABEL_BY_KEY.get(key as PermissionKey) ?? String(key);
}

/** Table row payload so Ask CAALM can prepend Pending Invitations immediately. */
function toDashboardInvitationRow(params: {
	row: Record<string, unknown>;
	name: string;
	email: string;
	role: string;
	department: string;
	division?: string;
	invitedBy?: string;
}): Record<string, unknown> | null {
	const token = String(params.row.token ?? "").trim();
	if (!token) return null;
	const id = String(params.row.$id ?? "").trim() || `temp-${token}`;
	return {
		$id: id,
		name: params.name,
		email: params.email,
		role: params.role,
		token,
		expiresAt:
			typeof params.row.expiresAt === "string"
				? params.row.expiresAt
				: undefined,
		status:
			typeof params.row.status === "string"
				? params.row.status
				: "pending-review",
		revoked: Boolean(params.row.revoked),
		$createdAt:
			typeof params.row.$createdAt === "string"
				? params.row.$createdAt
				: new Date().toISOString(),
		department: params.department,
		...(params.division ? { division: params.division } : {}),
		...(params.invitedBy ? { invitedBy: params.invitedBy } : {}),
	};
}

function actorName(ctx: ToolContext): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

function asError(message: string) {
	return { result: { error: message } };
}

function truthy(value: unknown): boolean {
	return value === true || String(value ?? "").toLowerCase() === "true";
}

function looksLikeEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** "blair.montgomery@example.com" → "blair montgomery" for name fallback. */
function nameHintFromEmail(value: string): string {
	const local = value.trim().split("@")[0] ?? "";
	return local
		.replace(/[._+\-]+/g, " ")
		.replace(/\d+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function nameTokens(hint: string): string[] {
	return hint.split(" ").filter((token) => token.length >= 2);
}

function nameTokensMatch(fullName: string, hint: string): boolean {
	const name = fullName.trim().toLowerCase();
	if (!hint || !name) return false;
	if (name === hint || name.includes(hint)) return true;
	const tokens = nameTokens(hint);
	if (tokens.length < 2) return false;
	return tokens.every((token) => name.includes(token));
}

/**
 * Higher score = better match. Used to pick one person when several soft-match.
 * Exact ids/emails win; invented name@domain emails fall back to name-token scores.
 */
function scoreUserMatch(user: UserManagementRow, query: string): number {
	const q = query.trim().toLowerCase();
	if (!q) return 0;

	const email = String(user.email || "")
		.trim()
		.toLowerCase();
	const name = String(user.fullName || "")
		.trim()
		.toLowerCase();
	let score = 0;

	if (user.$id === query || user.accountId === query) score = Math.max(score, 1000);
	if (email && email === q) score = Math.max(score, 1000);
	if (name && name === q) score = Math.max(score, 900);
	if (name && q.length >= 3 && name.includes(q)) {
		// Longer substring hits rank above short ones ("Alice Example" > "Alice").
		score = Math.max(score, 400 + Math.min(q.length, 50));
	}

	if (looksLikeEmail(query)) {
		const hint = nameHintFromEmail(query);
		if (hint) {
			const tokens = nameTokens(hint);
			if (name === hint) {
				score = Math.max(score, 860);
			} else if (nameTokensMatch(user.fullName, hint)) {
				let tokenScore = 600 + tokens.length * 40;
				if (
					tokens.length >= 2 &&
					name.startsWith(tokens[0]) &&
					name.includes(tokens[tokens.length - 1])
				) {
					tokenScore = 820;
				}
				// Prefer the shortest full name that still fits all tokens
				// (Blair Montgomery over Blair Montgomery Jr).
				tokenScore += Math.max(0, 40 - Math.min(name.length, 40));
				score = Math.max(score, tokenScore);
			}
		}
	}

	if (score > 0 && user.status !== "inactive" && user.status !== "suspended") {
		score += 1;
	}
	return score;
}

function userMatchesDepartment(
	user: UserManagementRow,
	department: string,
): boolean {
	const want = department.trim().toLowerCase();
	if (!want) return true;
	const dept = String(user.department ?? "")
		.trim()
		.toLowerCase();
	const label = String(
		(user as { departmentLabel?: string | null }).departmentLabel ?? "",
	)
		.trim()
		.toLowerCase();
	return dept === want || label === want;
}

async function findUsersInOrg(
	orgId: string,
	query: string,
	department?: string,
): Promise<UserManagementRow[]> {
	let users = await listUsersForManagement(orgId);
	const dept = department?.trim();
	if (dept) {
		users = users.filter((user) => userMatchesDepartment(user, dept));
	}
	const q = query.trim();
	if (!q) return users;

	return users
		.map((user) => ({ user, score: scoreUserMatch(user, q) }))
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score)
		.map((row) => row.user);
}

async function resolveOneUser(
	orgId: string,
	query: string,
): Promise<{ user?: UserManagementRow; error?: string }> {
	const needle = query.trim();
	if (!needle) {
		return { error: "Which person? Give a name or email." };
	}
	const users = await listUsersForManagement(orgId);
	const ranked = users
		.map((user) => ({ user, score: scoreUserMatch(user, needle) }))
		.filter((row) => row.score > 0)
		.sort((a, b) => b.score - a.score);

	if (ranked.length === 0) {
		if (looksLikeEmail(needle)) {
			return {
				error: `No one in this organization has email "${needle}". That address may be wrong — use their exact directory email, or their full name.`,
			};
		}
		return { error: `No one in this organization matches "${needle}".` };
	}

	const best = ranked[0];
	const tied = ranked.filter((row) => row.score === best.score);
	if (tied.length === 1) {
		return { user: best.user };
	}

	return {
		error: `Several people match "${needle}" equally: ${tied
			.slice(0, 3)
			.map((row) => `${row.user.fullName} <${row.user.email}>`)
			.join(", ")}. Use their exact directory email.`,
	};
}

/** Mutating user tools that look people up via userEmail / userId. */
const USER_LOOKUP_MUTATING_TOOLS = new Set([
	"assign_user_roles",
	"deactivate_user",
	"update_user_profile",
]);

/**
 * Before the confirm card, replace a name-based userEmail with the real email
 * so the UI never labels a person's name as "User Email".
 */
export async function normalizeUserToolPendingArgs(
	orgId: string,
	toolName: string,
	args: Record<string, unknown>,
): Promise<{
	args: Record<string, unknown>;
	error?: string;
	subjectLabel?: string;
}> {
	if (!USER_LOOKUP_MUTATING_TOOLS.has(toolName)) {
		return { args };
	}
	const lookup = String(args.userId ?? args.userEmail ?? "").trim();
	const found = await resolveOneUser(orgId, lookup);
	if (found.error || !found.user) {
		return { args, error: found.error ?? "User not found." };
	}
	return {
		args: {
			...args,
			userEmail: found.user.email,
			userId: found.user.$id,
			// Card title only — hidden from the field list.
			userDisplayName: found.user.fullName || found.user.email,
		},
		subjectLabel: found.user.fullName || found.user.email,
	};
}

function summarizeUser(user: UserManagementRow) {
	return {
		id: user.$id,
		name: user.fullName,
		email: user.email,
		role: user.roleName,
		status: user.status ?? "active",
		department: user.department ?? null,
	};
}

async function assignRolesInOrg(input: {
	orgId: string;
	actorId: string;
	actorLabel: string;
	actorEmail: string;
	target: UserManagementRow;
	roleIds: string[];
	mode: "replace" | "add" | "remove";
}): Promise<{ roleIds: string[]; before: string[]; after: string[] }> {
	const { tablesDB } = await createAdminClient();
	const existing = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId || "default-db",
		tableId: "user_roles",
		queries: [
			Query.equal("userId", input.target.$id),
			Query.equal("orgId", input.orgId),
			Query.limit(100),
		],
	});
	const existingRoleIds = existing.rows.map(
		(row) => (row as unknown as { roleId: string }).roleId,
	);

	let nextRoleIds = existingRoleIds;
	if (input.mode === "replace") nextRoleIds = input.roleIds;
	else if (input.mode === "add") {
		nextRoleIds = [...new Set([...existingRoleIds, ...input.roleIds])];
	} else {
		const removeSet = new Set(input.roleIds);
		nextRoleIds = existingRoleIds.filter((id) => !removeSet.has(id));
	}

	const sod = await validateRoleIdsUnionForSod(nextRoleIds);
	if (!sod.ok) {
		throw new Error(sod.message);
	}

	await Promise.all(
		existing.rows.map((row) =>
			tablesDB.deleteRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				rowId: row.$id,
			}),
		),
	);

	await Promise.all(
		nextRoleIds.map((roleId) =>
			tablesDB.createRow({
				databaseId: appwriteConfig.databaseId || "default-db",
				tableId: "user_roles",
				rowId: ID.unique(),
				data: {
					userId: input.target.$id,
					roleId,
					orgId: input.orgId,
					assignedBy: input.actorId,
					assignedAt: new Date().toISOString(),
				},
			}),
		),
	);

	await CacheManager.invalidateRBAC(input.target.$id, input.orgId);
	await CacheManager.invalidateUsers(undefined, input.target.$id);

	await logAuditEvent({
		event_id: `assistant_user_roles_${input.target.$id}`,
		event_title: `Assistant updated roles for ${input.target.fullName || input.target.email}`,
		action: "update",
		source: "caalm",
		user_id: input.actorId,
		user_name: input.actorLabel,
		user_email: input.actorEmail,
		status: "success",
		orgId: input.orgId,
		module: "governance",
		target_type: "user_role",
		target_id: input.target.$id,
		target_label: input.target.fullName || input.target.email,
		summary: `${input.actorLabel} updated roles for ${input.target.fullName || input.target.email} (${input.mode})`,
		metadata: {
			source: "ai_assistant",
			before: existingRoleIds,
			after: nextRoleIds,
			mode: input.mode,
		},
	});

	return { roleIds: nextRoleIds, before: existingRoleIds, after: nextRoleIds };
}

async function assertDirectoryInviteEmail(email: string): Promise<
	| { ok: true; fullName: string; email: string }
	| { ok: false; error: string }
> {
	const normalized = email.trim().toLowerCase();
	if (!normalized || !looksLikeEmail(normalized)) {
		return {
			ok: false,
			error: "Need a valid organization email from the connected directory.",
		};
	}
	const directory = await getUninvitedUsers();
	const hit = (directory ?? []).find((row) => {
		const rec = row as { email?: string; fullName?: string; name?: string };
		return String(rec.email ?? "").trim().toLowerCase() === normalized;
	}) as { email?: string; fullName?: string; name?: string } | undefined;
	if (!hit) {
		return {
			ok: false,
			error: `${email} is not in the connected directory waiting for a CAALM invite. Add them to your company directory first, then invite them into CAALM.`,
		};
	}
	return {
		ok: true,
		email: String(hit.email ?? email).trim(),
		fullName: String(hit.fullName || hit.name || email).trim(),
	};
}

function parseInviteesArg(
	args: Record<string, unknown>,
): Array<{ email: string; name: string }> {
	const raw = args.invitees ?? args.invitees_json;
	let list: unknown = raw;
	if (typeof raw === "string") {
		try {
			list = JSON.parse(raw);
		} catch {
			list = [];
		}
	}
	if (!Array.isArray(list)) return [];
	return list
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const rec = item as Record<string, unknown>;
			const email = String(rec.email ?? "").trim();
			const name = String(rec.name ?? rec.fullName ?? "").trim();
			if (!email || !name) return null;
			return { email, name };
		})
		.filter((row): row is { email: string; name: string } => Boolean(row));
}

export const USER_TOOLS: ToolDefinition[] = [
	{
		name: "invite_user",
		description:
			"Send a CAALM invite link to one person already in the connected directory. Requires email, name, role, and department. Always confirm before sending.",
		requiredPermissions: [PERMISSIONS.USERS.INVITE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				email: {
					type: "string",
					description: "Invitee organization email from the connected directory",
				},
				name: { type: "string", description: "Invitee full name" },
				role: {
					type: "string",
					description:
						"Role name: Super Admin, Organization Admin, Executive, Department Manager, or Viewer",
				},
				department: {
					type: "string",
					description: "Department for the invite (required)",
				},
				division: {
					type: "string",
					description: "Optional division under the department",
				},
			},
			required: ["email", "name", "role", "department"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.INVITE])) {
				return asError(
					"You cannot invite users. Ask an admin for the users.invite permission.",
				);
			}
			const email = String(args.email ?? "").trim();
			const name = String(args.name ?? "").trim();
			const role = String(args.role ?? "").trim();
			const department = String(args.department ?? "").trim();
			const division = String(args.division ?? "").trim();
			if (!email || !name || !role || !department) {
				return asError(
					"Need a directory person, role, and department to send a CAALM invite.",
				);
			}
			const directory = await assertDirectoryInviteEmail(email);
			if (!directory.ok) return asError(directory.error);
			try {
				const row = await createInvitation({
					email: directory.email,
					name: directory.fullName || name,
					role,
					orgId: ctx.orgId,
					department,
					...(division ? { division } : {}),
					invitedBy: ctx.user.$id,
				});
				await logAuditEvent({
					event_id: `assistant_invite_${row.$id}`,
					event_title: `Assistant invited ${directory.email}`,
					action: "create",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "governance",
					target_type: "invitation",
					target_id: row.$id,
					target_label: directory.email,
					summary: `${actorName(ctx)} invited ${directory.fullName || name} (${directory.email}) as ${role} in ${department}`,
					metadata: { source: "ai_assistant" },
				}).catch(() => undefined);
				const invited = {
					email: directory.email,
					name: directory.fullName || name,
					role,
					department,
					division: division || undefined,
				};
				const dashboardRow = toDashboardInvitationRow({
					row: row as Record<string, unknown>,
					name: invited.name,
					email: invited.email,
					role,
					department,
					...(division ? { division } : {}),
					invitedBy: ctx.user.$id,
				});
				return {
					result: {
						invited,
						...(dashboardRow
							? { dashboardInvitations: [dashboardRow] }
							: {}),
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to send the invite.",
				);
			}
		},
	},
	{
		name: "invite_users",
		description:
			"Send CAALM invite links to one or more people already in the connected directory. Requires invitees (name+email), role, and department. Always confirm before sending.",
		requiredPermissions: [PERMISSIONS.USERS.INVITE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				invitees_json: {
					type: "string",
					description:
						'JSON array of {email,name} objects from the connected directory',
				},
				role: {
					type: "string",
					description:
						"Role name: Super Admin, Organization Admin, Executive, Department Manager, or Viewer",
				},
				department: {
					type: "string",
					description: "Department for every invitee (required)",
				},
				division: {
					type: "string",
					description: "Optional division under the department",
				},
			},
			required: ["invitees_json", "role", "department"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.INVITE])) {
				return asError(
					"You cannot invite users. Ask an admin for the users.invite permission.",
				);
			}
			const role = String(args.role ?? "").trim();
			const department = String(args.department ?? "").trim();
			const division = String(args.division ?? "").trim();
			const invitees = parseInviteesArg(args);
			if (!role || !department || invitees.length === 0) {
				return asError(
					"Need at least one directory person plus role and department.",
				);
			}

			const invited: Array<Record<string, unknown>> = [];
			const dashboardInvitations: Array<Record<string, unknown>> = [];
			const failures: Array<{ email: string; error: string }> = [];

			for (const invitee of invitees) {
				const directory = await assertDirectoryInviteEmail(invitee.email);
				if (!directory.ok) {
					failures.push({ email: invitee.email, error: directory.error });
					continue;
				}
				try {
					const row = await createInvitation({
						email: directory.email,
						name: directory.fullName || invitee.name,
						role,
						orgId: ctx.orgId,
						department,
						...(division ? { division } : {}),
						invitedBy: ctx.user.$id,
					});
					await logAuditEvent({
						event_id: `assistant_invite_${row.$id}`,
						event_title: `Assistant invited ${directory.email}`,
						action: "create",
						source: "caalm",
						user_id: ctx.user.$id,
						user_name: actorName(ctx),
						user_email: ctx.user.email || "",
						status: "success",
						orgId: ctx.orgId,
						module: "governance",
						target_type: "invitation",
						target_id: row.$id,
						target_label: directory.email,
						summary: `${actorName(ctx)} invited ${directory.fullName || invitee.name} (${directory.email}) as ${role} in ${department}`,
						metadata: { source: "ai_assistant", batch: true },
					}).catch(() => undefined);
					invited.push({
						email: directory.email,
						name: directory.fullName || invitee.name,
						role,
						department,
						division: division || undefined,
					});
					const dashboardRow = toDashboardInvitationRow({
						row: row as Record<string, unknown>,
						name: directory.fullName || invitee.name,
						email: directory.email,
						role,
						department,
						...(division ? { division } : {}),
						invitedBy: ctx.user.$id,
					});
					if (dashboardRow) dashboardInvitations.push(dashboardRow);
				} catch (error) {
					failures.push({
						email: invitee.email,
						error:
							error instanceof Error
								? error.message
								: "Failed to send the invite.",
					});
				}
			}

			if (invited.length === 0) {
				return asError(
					failures[0]?.error ||
						"Could not send any invites. Check the connected directory and try again.",
				);
			}

			return {
				result: {
					invited,
					...(dashboardInvitations.length > 0
						? { dashboardInvitations }
						: {}),
					...(failures.length > 0 ? { failures } : {}),
				},
			};
		},
	},
	{
		name: "resend_invite",
		description:
			"Resend a pending invite that has not been accepted yet. Requires users.invite.",
		requiredPermissions: [PERMISSIONS.USERS.INVITE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				email: { type: "string", description: "Pending invitee email" },
			},
			required: ["email"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.INVITE])) {
				return asError(
					"You cannot resend invites. Ask an admin for the users.invite permission.",
				);
			}
			const email = String(args.email ?? "").trim().toLowerCase();
			if (!email) return asError("Which invite email should I resend?");
			const pending = await listPendingInvitations({ orgId: ctx.orgId });
			const matches = pending.filter((row) => {
				const rec = row as { email?: string };
				return String(rec.email ?? "").trim().toLowerCase() === email;
			});
			if (matches.length === 0) {
				return asError(
					`No pending invite for ${email} in this organization.`,
				);
			}
			const invitation = matches[0] as { token?: string; email?: string };
			if (!invitation.token) {
				return asError("That invite is missing a token. Open Users and resend there.");
			}
			try {
				const resent = await resendInvitation({ token: invitation.token });
				await logAuditEvent({
					event_id: `assistant_invite_resend_${invitation.token.slice(0, 12)}`,
					event_title: `Assistant resent invite: ${email}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "governance",
					target_type: "invitation",
					target_label: email,
					summary: `${actorName(ctx)} resent invite to ${email}`,
					metadata: { source: "ai_assistant" },
				}).catch(() => undefined);
				return { result: { resent: true, email: resent.email } };
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to resend the invite.",
				);
			}
		},
	},
	{
		name: "list_users",
		description:
			"Find people in the organization by name, email, role, or department. When the user asks for people in a department (e.g. IT), set department. Do NOT use this when the user asks only for the department catalog — use list_departments. Requires users.view.",
		requiredPermissions: [PERMISSIONS.USERS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Optional name, email, or role search",
				},
				department: {
					type: "string",
					description:
						"Optional department filter (e.g. IT, Finance). Use when the user asks who is in a department.",
				},
				limit: { type: "number", description: "Max rows. Default 15." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.VIEW])) {
				return asError(
					"You cannot list users. Ask an admin for the users.view permission.",
				);
			}
			const query = String(args.query ?? "").trim();
			const department = String(args.department ?? "").trim();
			const limit = Math.min(Number(args.limit) || 15, 25);
			const rows = await findUsersInOrg(ctx.orgId, query, department || undefined);
			if (rows.length === 0) {
				return {
					result: {
						users: [],
						department: department || null,
						message: department
							? query
								? `No people in ${department} matched "${query}".`
								: `No people found in the ${department} department.`
							: query
								? `No people matched "${query}".`
								: "No people found in this organization.",
					},
				};
			}
			return {
				result: {
					users: rows.slice(0, limit).map(summarizeUser),
					total: rows.length,
					department: department || null,
					usersHref: "/dashboard/users",
				},
			};
		},
	},
	{
		name: "list_departments",
		description:
			"List the department names available in this organization (IT, Finance, Legal, and so on). Use only when the user asks which departments exist. Do NOT use this for people in a department — use list_users with department. Requires ai.chat.",
		requiredPermissions: [PERMISSIONS.AI.CHAT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {},
		},
		handler: async (ctx) => {
			if (!hasAll(ctx, [PERMISSIONS.AI.CHAT])) {
				return asError(
					"You cannot list departments. Ask an admin for assistant access.",
				);
			}
			return {
				result: {
					departments: CONTRACT_DEPARTMENTS.map((name) => ({ name })),
					total: CONTRACT_DEPARTMENTS.length,
				},
			};
		},
	},
	{
		name: "assign_user_roles",
		description:
			"Attach or detach roles for a user in this organization. Requires users.assign_roles. Confirm before writing.",
		requiredPermissions: [PERMISSIONS.USERS.ASSIGN_ROLES],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				userEmail: {
					type: "string",
					description:
						"Exact directory email, or a unique full name. Never invent an email. When the user already named the person, call this tool directly — do not call list_users first.",
				},
				userId: { type: "string", description: "Optional user document id" },
				roleNames: {
					type: "array",
					items: { type: "string" },
					description: "Role names to add, remove, or replace",
				},
				mode: {
					type: "string",
					enum: ["replace", "add", "remove"],
					description: "Default replace",
				},
			},
			required: ["userEmail"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.ASSIGN_ROLES])) {
				return asError(
					"You cannot assign roles. Ask an admin for the users.assign_roles permission.",
				);
			}
			const lookup = String(args.userId ?? args.userEmail ?? "").trim();
			const found = await resolveOneUser(ctx.orgId, lookup);
			if (found.error || !found.user) return asError(found.error ?? "User not found.");

			const modeRaw = String(args.mode ?? "replace").toLowerCase();
			const mode: "replace" | "add" | "remove" =
				modeRaw === "add" || modeRaw === "remove" ? modeRaw : "replace";

			const names = Array.isArray(args.roleNames)
				? args.roleNames.map((name) => String(name).trim()).filter(Boolean)
				: args.roleNames
					? [String(args.roleNames).trim()]
					: [];
			if (names.length === 0 && mode !== "remove") {
				return asError("Which role(s) should I assign?");
			}

			const roles = await listRoles(ctx.orgId);
			const roleIds: string[] = [];
			for (const name of names) {
				const match = roles.find(
					(role) =>
						role.$id === name ||
						role.name.toLowerCase() === name.toLowerCase(),
				);
				if (!match) {
					return asError(
						`Unknown role "${name}". Use a role that exists in this organization.`,
					);
				}
				roleIds.push(match.$id);
			}

			try {
				const result = await assignRolesInOrg({
					orgId: ctx.orgId,
					actorId: ctx.user.$id,
					actorLabel: actorName(ctx),
					actorEmail: ctx.user.email || "",
					target: found.user,
					roleIds,
					mode,
				});
				return {
					result: {
						user: summarizeUser(found.user),
						mode,
						roleIds: result.after,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to update roles.",
				);
			}
		},
	},
	{
		name: "deactivate_user",
		description:
			"Deactivate or reactivate a user in this organization. Requires users.deactivate. Confirm before writing.",
		requiredPermissions: [PERMISSIONS.USERS.DEACTIVATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				userEmail: {
					type: "string",
					description:
						"Exact directory email, or a unique full name. Never invent an email. When the user already named the person, call this tool directly — do not call list_users first.",
				},
				userId: { type: "string", description: "Optional user document id" },
				reactivate: {
					type: "boolean",
					description: "Set true to reactivate instead of deactivate",
				},
			},
			required: ["userEmail"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.DEACTIVATE])) {
				return asError(
					"You cannot deactivate users. Ask an admin for the users.deactivate permission.",
				);
			}
			const lookup = String(args.userId ?? args.userEmail ?? "").trim();
			const found = await resolveOneUser(ctx.orgId, lookup);
			if (found.error || !found.user) return asError(found.error ?? "User not found.");
			if (found.user.$id === ctx.user.$id) {
				return asError("You cannot deactivate your own account.");
			}
			const nextStatus = truthy(args.reactivate) ? "active" : "inactive";
			try {
				const result = await updateUserProfile({
					accountId: found.user.accountId,
					status: nextStatus,
				});
				if (!result?.user) {
					return asError("Failed to update that account.");
				}
				await logAuditEvent({
					event_id: `assistant_user_status_${found.user.$id}`,
					event_title:
						nextStatus === "active"
							? `Assistant reactivated ${found.user.fullName || found.user.email}`
							: `Assistant deactivated ${found.user.fullName || found.user.email}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "governance",
					target_type: "user",
					target_id: found.user.$id,
					target_label: found.user.fullName || found.user.email,
					summary: `${actorName(ctx)} ${nextStatus === "active" ? "reactivated" : "deactivated"} ${found.user.fullName || found.user.email}`,
					metadata: {
						source: "ai_assistant",
						previousStatus: result.previousStatus,
						nextStatus,
					},
				}).catch(() => undefined);
				return {
					result: {
						user: {
							...summarizeUser(found.user),
							status: nextStatus,
						},
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to update account status.",
				);
			}
		},
	},
	{
		name: "update_user_profile",
		description:
			"Update safe profile fields (name, job title, department, division) for a user. Requires users.edit. Confirm before writing. Never changes roles, status, email, or billing.",
		requiredPermissions: [PERMISSIONS.USERS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				userEmail: {
					type: "string",
					description:
						"Exact directory email, or a unique full name. Never invent an email. When the user already named the person, call this tool directly — do not call list_users first.",
				},
				userId: { type: "string", description: "Optional user document id" },
				fullName: { type: "string", description: "New full name" },
				jobTitle: { type: "string", description: "New job title" },
				department: { type: "string", description: "New department" },
				division: { type: "string", description: "New division" },
			},
			required: ["userEmail"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.EDIT])) {
				return asError(
					"You cannot edit user profiles. Ask an admin for the users.edit permission.",
				);
			}
			const lookup = String(args.userId ?? args.userEmail ?? "").trim();
			const found = await resolveOneUser(ctx.orgId, lookup);
			if (found.error || !found.user) {
				return asError(found.error ?? "User not found.");
			}

			const patch: {
				fullName?: string;
				jobTitle?: string | null;
				department?: string;
				division?: string;
			} = {};
			if (args.fullName !== undefined) {
				const name = String(args.fullName).trim();
				if (!name) return asError("Full name cannot be empty.");
				patch.fullName = name;
			}
			if (args.jobTitle !== undefined) {
				patch.jobTitle = String(args.jobTitle).trim() || null;
			}
			if (args.department !== undefined) {
				patch.department = String(args.department).trim();
			}
			if (args.division !== undefined) {
				patch.division = String(args.division).trim();
			}
			if (Object.keys(patch).length === 0) {
				return asError(
					"Say which field to change: name, job title, department, or division.",
				);
			}

			try {
				const result = await updateUserProfile({
					accountId: found.user.accountId,
					...patch,
				});
				if (!result?.user) {
					return asError("Failed to update that profile.");
				}
				await logAuditEvent({
					event_id: `assistant_user_profile_${found.user.$id}`,
					event_title: `Assistant updated profile for ${found.user.fullName || found.user.email}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "governance",
					target_type: "user",
					target_id: found.user.$id,
					target_label: found.user.fullName || found.user.email,
					summary: `${actorName(ctx)} updated profile fields for ${found.user.fullName || found.user.email}`,
					metadata: { source: "ai_assistant", fields: Object.keys(patch) },
				}).catch(() => undefined);
				return {
					result: {
						user: {
							...summarizeUser(found.user),
							fullName:
								patch.fullName ?? found.user.fullName,
							department:
								patch.department ?? found.user.department ?? null,
							jobTitle: patch.jobTitle ?? null,
							division: patch.division ?? null,
						},
						updatedFields: Object.keys(patch),
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to update the profile.",
				);
			}
		},
	},
	{
		name: "list_roles",
		description:
			"List roles in this organization and summarize what each can do in plain English. Requires users.view.",
		requiredPermissions: [PERMISSIONS.USERS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				query: {
					type: "string",
					description: "Optional role name filter",
				},
				limit: { type: "number", description: "Max roles. Default 12." },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.USERS.VIEW])) {
				return asError(
					"You cannot list roles. Ask an admin for the users.view permission.",
				);
			}
			const query = String(args.query ?? "").trim().toLowerCase();
			const limit = Math.min(Number(args.limit) || 12, 20);
			const roles = await listRoles(ctx.orgId);
			const filtered = query
				? roles.filter((role) => role.name.toLowerCase().includes(query))
				: roles;
			if (filtered.length === 0) {
				return {
					result: {
						roles: [],
						message: query
							? `No roles matched "${args.query}".`
							: "No roles found for this organization.",
					},
				};
			}

			const sliced = filtered.slice(0, limit);
			const summarized = await Promise.all(
				sliced.map(async (role) => {
					const keys = await getRolePermissions(role.$id);
					const labels = keys.map(plainPermissionLabel);
					const shown = labels.slice(0, 8);
					return {
						id: role.$id,
						name: role.name,
						description: role.description || null,
						isSystemRole: role.isSystemRole,
						canDo: shown,
						permissionCount: labels.length,
						morePermissions: Math.max(0, labels.length - shown.length),
					};
				}),
			);

			return {
				result: {
					roles: summarized,
					total: filtered.length,
					rolesHref: "/dashboard/users",
				},
			};
		},
	},
	{
		name: "update_org_settings",
		description:
			"Update a safe subset of organization settings (timezone, website URL). Requires settings.edit. Confirm before writing. Never changes billing, seats, secrets, or logos.",
		requiredPermissions: [PERMISSIONS.SETTINGS.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				timezone: {
					type: "string",
					description: "IANA timezone, e.g. America/New_York",
				},
				websiteUrl: {
					type: "string",
					description: "Organization website URL",
				},
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.SETTINGS.EDIT])) {
				return asError(
					"You cannot edit organization settings. Ask an admin for the settings.edit permission.",
				);
			}

			const patch: { timezone?: string; websiteUrl?: string } = {};
			if (args.timezone !== undefined) {
				const timezone = String(args.timezone).trim();
				if (!timezone) return asError("Timezone cannot be empty.");
				patch.timezone = timezone;
			}
			if (args.websiteUrl !== undefined) {
				patch.websiteUrl = String(args.websiteUrl).trim();
			}
			if (Object.keys(patch).length === 0) {
				return asError(
					"Say which setting to change: timezone or website URL.",
				);
			}

			try {
				const existing = await getOrganization(ctx.orgId);
				if (!existing) {
					return asError("Organization not found.");
				}
				const prior = (existing.settings ?? {}) as Record<string, unknown>;
				const settings = {
					...prior,
					maxUsers:
						typeof prior.maxUsers === "number" ? prior.maxUsers : 10,
					maxDepartments:
						typeof prior.maxDepartments === "number"
							? prior.maxDepartments
							: 3,
					features: Array.isArray(prior.features)
						? (prior.features as string[])
						: [],
					...patch,
				};

				const updated = await updateOrganization(ctx.orgId, { settings });
				if (!updated) {
					return asError("Failed to update organization settings.");
				}
				await CacheManager.invalidateOrganization(ctx.orgId).catch(
					() => undefined,
				);
				await logAuditEvent({
					event_id: `assistant_org_settings_${ctx.orgId}`,
					event_title: `Assistant updated org settings for ${updated.name || ctx.orgId}`,
					action: "update",
					source: "caalm",
					user_id: ctx.user.$id,
					user_name: actorName(ctx),
					user_email: ctx.user.email || "",
					status: "success",
					orgId: ctx.orgId,
					module: "system",
					target_type: "organization",
					target_id: ctx.orgId,
					target_label: updated.name,
					summary: `${actorName(ctx)} updated organization settings (${Object.keys(patch).join(", ")})`,
					metadata: { source: "ai_assistant", fields: Object.keys(patch) },
				}).catch(() => undefined);

				return {
					result: {
						organization: {
							id: ctx.orgId,
							name: updated.name,
							timezone:
								typeof updated.settings?.timezone === "string"
									? updated.settings.timezone
									: patch.timezone ?? null,
							websiteUrl:
								typeof updated.settings?.websiteUrl === "string"
									? updated.settings.websiteUrl
									: patch.websiteUrl ?? null,
						},
						updatedFields: Object.keys(patch),
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to update organization settings.",
				);
			}
		},
	},
];
