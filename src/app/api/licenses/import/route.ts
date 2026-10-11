import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { requireAuth } from "@/lib/api/licenses/middleware/auth.middleware";
import { readImportPayload } from "@/lib/import/http";
import type { LicenseImportFieldKey } from "@/lib/licenses/import/fields";
import { applyLicenseColumnMapping } from "@/lib/licenses/import/parse";
import {
	commitLicenseImport,
	dryRunLicenseImport,
} from "@/lib/licenses/import/run-import";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import CacheManager from "@/lib/services/cache-manager";

export async function POST(request: NextRequest) {
	const authError = await requireAuth(request);
	if (authError) return authError;
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.LICENSES.CREATE,
	});
	if (denied) return denied;

	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}
	const org = await getUserDefaultOrganization(user.$id);
	if (!org) {
		return NextResponse.json({ error: "Organization not found" }, { status: 404 });
	}

	const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
	try {
		const parsed = readImportPayload<LicenseImportFieldKey>(await request.json());
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyLicenseColumnMapping(
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
			const result = await dryRunLicenseImport(org.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitLicenseImport(org.orgId, user.$id, valid);
		await CacheManager.invalidateLicenses(org.orgId).catch(() => undefined);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] licenses/import POST:", error);
		return NextResponse.json(
			{ error: "License import failed" },
			{ status: 500 },
		);
	}
}
