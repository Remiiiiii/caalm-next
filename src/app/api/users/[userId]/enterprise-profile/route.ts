import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getCostCenterById,
	getOrgUnitById,
} from "@/lib/org/org-units.service";
import { toScimEnterpriseOrgFields } from "@/lib/org/org-unit-validation";
import { getOrganization } from "@/lib/rbac/organizations";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.VIEW,
	});
	if (denied) return denied;

	try {
		const { userId } = await params;
		const { tablesDB } = await createAdminClient();
		const user = await tablesDB.getRow({
			databaseId: appwriteConfig.databaseId || "default-db",
			tableId: appwriteConfig.usersCollectionId || "users",
			rowId: userId,
		});

		let orgName: string | null = null;
		if (user.orgId) {
			try {
				const org = await getOrganization(String(user.orgId));
				orgName = org?.name || null;
			} catch {
				orgName = null;
			}
		}

		let costCenterCode: string | null = null;
		if (user.costCenterId) {
			const cc = await getCostCenterById(String(user.costCenterId));
			costCenterCode = cc?.code || null;
		}

		const enterprise = toScimEnterpriseOrgFields({
			department: user.department as string | undefined,
			division: user.division as string | undefined,
			orgId: user.orgId as string | undefined,
			orgName,
			managerUserId: user.managerUserId as string | undefined,
			costCenterCode,
		});

		const primaryUnit = user.primaryOrgUnitId
			? await getOrgUnitById(String(user.primaryOrgUnitId))
			: null;

		return NextResponse.json({
			success: true,
			data: {
				schemas: [
					"urn:ietf:params:scim:schemas:extension:enterprise:2.0:User",
				],
				enterprise,
				primaryOrgUnit: primaryUnit,
			},
		});
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "User not found" },
			{ status: 404 },
		);
	}
}
