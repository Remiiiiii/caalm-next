import { type NextRequest, NextResponse } from "next/server";
import { fetchFarClauseCatalog } from "@/lib/templates/far-clauses";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";

export async function GET(request: NextRequest) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;

	try {
		const catalog = await fetchFarClauseCatalog();
		return NextResponse.json(catalog, {
			headers: {
				"Cache-Control": "private, max-age=3600",
			},
		});
	} catch (error) {
		console.error("[wizard far-clauses]", error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: "Could not load FAR clauses from eCFR",
			},
			{ status: 502 },
		);
	}
}
