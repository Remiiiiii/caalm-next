import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { seedCfceEvidenceMap } from "@/lib/audits/readiness/evidence-map.service";
import { requirePermission } from "@/lib/rbac/middleware";

/** Seeds CFCE evidence map rows (idempotent). Requires AUDIT.EXPORT as ops gate. */
export async function POST(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.AUDIT.EXPORT,
	});
	if (denied) return denied;

	try {
		const result = await seedCfceEvidenceMap();
		return NextResponse.json({ success: true, data: result });
	} catch (error) {
		console.error("[SERVER] seed evidence map failed", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Failed to seed evidence map. Create Appwrite collection 3cfb1121431b22b684e3 first.",
			},
			{ status: 500 },
		);
	}
}
