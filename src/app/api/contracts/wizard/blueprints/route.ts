import { type NextRequest, NextResponse } from "next/server";
import { CONTRACT_BLUEPRINTS } from "@/lib/templates/blueprint-catalog";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import { tokenDefsForBlueprint } from "@/lib/templates/token-schema";

export async function GET(request: NextRequest) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;

	const items = CONTRACT_BLUEPRINTS.map((blueprint) => ({
		...blueprint,
		tokens: tokenDefsForBlueprint(blueprint.id),
	}));
	return NextResponse.json({ items });
}
