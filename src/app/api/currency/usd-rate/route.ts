import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	fetchUsdRateFromProvider,
	normalizeCurrencyCode,
} from "@/lib/currency";
import { requirePermission } from "@/lib/rbac/middleware";

export async function GET(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: [
			PERMISSIONS.CONTRACTS.VIEW,
			PERMISSIONS.CONTRACTS.CREATE,
			PERMISSIONS.LICENSES.VIEW,
			PERMISSIONS.LICENSES.CREATE,
		],
	});
	if (denied) return denied;

	try {
		const from = normalizeCurrencyCode(
			request.nextUrl.searchParams.get("from"),
		);
		const rate = await fetchUsdRateFromProvider(from);
		return NextResponse.json({ success: true, from, to: "USD", rate });
	} catch (error) {
		console.error("[SERVER] currency/usd-rate:", error);
		return NextResponse.json(
			{ success: false, error: "Could not load the USD exchange rate" },
			{ status: 502 },
		);
	}
}
