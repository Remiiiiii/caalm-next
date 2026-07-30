import { ID, Query } from "node-appwrite";
import { avatarPlaceholderUrl } from "../../../../constants";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { addUserToOrganization } from "@/lib/rbac/organizations";
import { DEMO_TEAM_PERSONAS, demoRowId } from "./constants";
import { createRowIfMissing, getDbId } from "./helpers";

export type SeededTeamUser = {
	userId: string;
	fullName: string;
	email: string;
	department: string;
	division: string;
	slug: string;
};

/**
 * Ensure owner has department/division, then create fictional team users.
 */
export async function seedDemoTeamUsers({
	orgId,
	ownerUserId,
}: {
	orgId: string;
	ownerUserId: string;
}): Promise<SeededTeamUser[]> {
	const { tablesDB } = await createAdminClient();
	const db = getDbId();
	const usersTable = appwriteConfig.usersCollectionId || "users";
	const seeded: SeededTeamUser[] = [];

	try {
		await tablesDB.updateRow({
			databaseId: db,
			tableId: usersTable,
			rowId: ownerUserId,
			data: {
				department: "Administration",
				division: "c-suite",
				status: "active",
				orgId,
			},
		});
	} catch (error) {
		console.error("[seedDemoTeamUsers] owner update failed:", error);
	}

	for (const persona of DEMO_TEAM_PERSONAS) {
		const rowId = demoRowId(orgId, persona.slug.replace(/-/g, "").slice(0, 12));

		const existingByEmail = await tablesDB.listRows({
			databaseId: db,
			tableId: usersTable,
			queries: [
				Query.equal("email", persona.email),
				Query.equal("orgId", orgId),
				Query.limit(1),
			],
		});

		let userId = existingByEmail.rows[0]?.$id as string | undefined;

		if (!userId) {
			const created = await createRowIfMissing(
				usersTable,
				rowId,
				{
					fullName: persona.fullName,
					email: persona.email,
					avatar: avatarPlaceholderUrl,
					accountId: `demo-${persona.slug}`.slice(0, 36),
					department: persona.department,
					division: persona.division,
					status: "active",
					orgId,
				},
				`team-user:${persona.slug}`,
			);
			userId = created ?? undefined;
		} else {
			try {
				await tablesDB.updateRow({
					databaseId: db,
					tableId: usersTable,
					rowId: userId,
					data: {
						department: persona.department,
						division: persona.division,
						status: "active",
						orgId,
					},
				});
			} catch {
				// ignore
			}
		}

		if (!userId) continue;

		await addUserToOrganization({
			userId,
			orgId,
			orgRole: "member",
			isDefault: false,
			invitedBy: ownerUserId,
		});

		const rolesExisting = await tablesDB.listRows({
			databaseId: db,
			tableId: "user_roles",
			queries: [
				Query.equal("userId", userId),
				Query.equal("orgId", orgId),
				Query.equal("roleId", persona.roleId),
				Query.limit(1),
			],
		});

		if (rolesExisting.total === 0) {
			try {
				await tablesDB.createRow({
					databaseId: db,
					tableId: "user_roles",
					rowId: ID.unique(),
					data: {
						userId,
						orgId,
						roleId: persona.roleId,
						assignedBy: ownerUserId,
					},
				});
			} catch (error) {
				console.error(
					`[seedDemoTeamUsers] role assign failed for ${persona.slug}:`,
					error,
				);
			}
		}

		seeded.push({
			userId,
			fullName: persona.fullName,
			email: persona.email,
			department: persona.department,
			division: persona.division,
			slug: persona.slug,
		});
	}

	return seeded;
}
