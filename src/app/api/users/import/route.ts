import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { readImportPayload } from "@/lib/import/http";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import type { UserImportFieldKey } from "@/lib/users/import/fields";
import { applyUserColumnMapping } from "@/lib/users/import/parse";
import {
	commitUserImport,
	dryRunUserImport,
} from "@/lib/users/import/run-import";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.USERS.INVITE,
	});
	if (denied) return denied;
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}
	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const parsed = readImportPayload<UserImportFieldKey>(await request.json());
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyUserColumnMapping(
			parsed.rows,
			parsed.mapping,
		);
		if (valid.length === 0) {
			return NextResponse.json(
				{ error: "No valid rows after mapping", rowErrors: errors },
				{ status: 400 },
			);
		}
		if (dryRun) {
			const result = await dryRunUserImport(org.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitUserImport(org.orgId, user.$id, valid);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] users/import POST:", error);
		return NextResponse.json(
			{ error: "User import failed" },
			{ status: 500 },
		);
	}
}
