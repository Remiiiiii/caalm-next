import {
	createInvitation,
	getUserByEmail,
	listPendingInvitations,
} from "@/lib/actions/user.actions";
import {
	assertBillingWriteAccess,
	assertWithinLimit,
	BillingLimitError,
	getEffectiveLimits,
} from "@/lib/billing/entitlements";
import { isPlanLimitError } from "@/lib/billing/planLimits";
import { countOrgMembers } from "@/lib/billing/usage";
import { getOrganization } from "@/lib/rbac/organizations";
import { validateUserOrgAccess } from "@/lib/rbac/permissions";
import { listRoles } from "@/lib/rbac/roles";
import { INVITABLE_ROLE_NAMES, type MappedUserImportRow } from "./parse";

export type UserImportPlanRow =
	| {
			rowNumber: number;
			action: "invite";
			name: string;
			email: string;
			role: string;
			department?: string;
			division?: string;
	  }
	| { rowNumber: number; action: "skip"; reason: string }
	| { rowNumber: number; action: "error"; reason: string };

export async function dryRunUserImport(
	orgId: string,
	rows: MappedUserImportRow[],
): Promise<{
	rows: UserImportPlanRow[];
	counts: { invite: number; skip: number; error: number };
	seatPreview: { used: number; maxUsers: number | null; remaining: number | null };
}> {
	const [roles, pending, org, used] = await Promise.all([
		listRoles(orgId),
		listPendingInvitations({ orgId }),
		getOrganization(orgId),
		countOrgMembers(orgId),
	]);
	const roleByName = new Map(
		roles.map((role) => [role.name.trim().toLowerCase(), role.name]),
	);
	const pendingEmails = new Set(
		pending.map((row) => String((row as { email?: string }).email || "").toLowerCase()),
	);
	const limits = org ? getEffectiveLimits(org) : null;
	let remaining =
		limits && Number.isFinite(limits.maxUsers)
			? Math.max(0, limits.maxUsers - used)
			: null;
	let billingLocked = false;
	if (org) {
		try {
			assertBillingWriteAccess(org);
		} catch {
			billingLocked = true;
		}
	}

	const plans: UserImportPlanRow[] = [];
	const seenEmails = new Set<string>();
	let invite = 0;
	let skip = 0;
	let error = 0;

	for (const row of rows) {
		if (seenEmails.has(row.email) || pendingEmails.has(row.email)) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				reason: "Already invited",
			});
			skip += 1;
			continue;
		}
		const existing = await getUserByEmail(row.email);
		const existingId = existing
			? String((existing as { $id?: string }).$id || "")
			: "";
		if (existingId && (await validateUserOrgAccess(existingId, orgId))) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "skip",
				reason: "Already a member of this organization",
			});
			skip += 1;
			continue;
		}
		const catalogName = roleByName.get(row.role.toLowerCase());
		if (!catalogName) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: `Role not found in this organization: ${row.role}`,
			});
			error += 1;
			continue;
		}
		if (
			!(INVITABLE_ROLE_NAMES as readonly string[]).includes(catalogName)
		) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: `Role is not invitable: ${catalogName}`,
			});
			error += 1;
			continue;
		}
		if (billingLocked) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: "Billing access locked",
			});
			error += 1;
			continue;
		}
		if (remaining != null && remaining <= 0) {
			plans.push({
				rowNumber: row.rowNumber,
				action: "error",
				reason: "Would exceed user seat limit",
			});
			error += 1;
			continue;
		}
		seenEmails.add(row.email);
		if (remaining != null) remaining -= 1;
		plans.push({
			rowNumber: row.rowNumber,
			action: "invite",
			name: row.name,
			email: row.email,
			role: catalogName,
			department: row.department,
			division: row.division,
		});
		invite += 1;
	}

	return {
		rows: plans,
		counts: { invite, skip, error },
		seatPreview: {
			used,
			maxUsers: limits?.maxUsers ?? null,
			remaining,
		},
	};
}

export async function commitUserImport(
	orgId: string,
	invitedBy: string,
	rows: MappedUserImportRow[],
): Promise<{
	invitedCount: number;
	skippedCount: number;
	failedCount: number;
	stoppedReason?: string;
}> {
	const org = await getOrganization(orgId);
	if (!org) {
		return {
			invitedCount: 0,
			skippedCount: 0,
			failedCount: rows.length,
			stoppedReason: "Organization not found",
		};
	}
	try {
		assertBillingWriteAccess(org);
	} catch (error) {
		if (error instanceof BillingLimitError) {
			return {
				invitedCount: 0,
				skippedCount: 0,
				failedCount: rows.length,
				stoppedReason: error.message,
			};
		}
		throw error;
	}

	const dry = await dryRunUserImport(orgId, rows);
	let invitedCount = 0;
	let failedCount = 0;
	let stoppedReason: string | undefined;
	for (const plan of dry.rows) {
		if (plan.action !== "invite") {
			if (plan.action === "error") failedCount += 1;
			continue;
		}
		if (stoppedReason) {
			failedCount += 1;
			continue;
		}
		try {
			const used = await countOrgMembers(orgId);
			assertWithinLimit({
				resource: "users",
				used,
				limits: getEffectiveLimits(org),
			});
			await createInvitation({
				name: plan.name,
				email: plan.email,
				role: plan.role,
				orgId,
				invitedBy,
				department: plan.department ?? "",
				division: plan.division,
			});
			invitedCount += 1;
		} catch (error) {
			if (isPlanLimitError(error) || error instanceof BillingLimitError) {
				stoppedReason = error.message;
				failedCount += 1;
				continue;
			}
			failedCount += 1;
			console.error("[users import commit]", error);
		}
	}
	return {
		invitedCount,
		skippedCount: dry.counts.skip,
		failedCount,
		stoppedReason,
	};
}
