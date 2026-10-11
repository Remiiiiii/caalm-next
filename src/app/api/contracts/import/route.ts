import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import type { ContractImportFieldKey } from "@/lib/contracts/import/fields";
import { applyContractColumnMapping } from "@/lib/contracts/import/parse";
import {
	commitContractImport,
	dryRunContractImport,
} from "@/lib/contracts/import/run-import";
import { readImportPayload } from "@/lib/import/http";
import { requirePermission } from "@/lib/rbac/middleware";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
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
		const parsed = readImportPayload<ContractImportFieldKey>(
			await request.json(),
		);
		if (!parsed.ok) {
			return NextResponse.json(
				{ error: parsed.error },
				{ status: parsed.status },
			);
		}
		const { valid, errors } = applyContractColumnMapping(
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
			const result = await dryRunContractImport(org.orgId, valid);
			return NextResponse.json({
				...result,
				rowErrors: errors,
				mappedCount: valid.length,
			});
		}
		const result = await commitContractImport(org.orgId, valid);
		return NextResponse.json({ ...result, rowErrors: errors });
	} catch (error) {
		console.error("[SERVER] contracts/import POST:", error);
		return NextResponse.json(
			{ error: "Contract import failed" },
			{ status: 500 },
		);
	}
}
