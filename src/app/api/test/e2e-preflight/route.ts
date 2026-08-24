import { type NextRequest, NextResponse } from "next/server";
import { runE2EPreflight } from "@/lib/e2e/preflight";

function isE2EPreflightAllowed(): boolean {
	return (
		process.env.CI === "true" ||
		process.env.PLAYWRIGHT_TEST === "true" ||
		process.env.NODE_ENV === "test" ||
		// Local `pnpm run dev` reused by Playwright does not inherit webServer env.
		process.env.NODE_ENV === "development"
	);
}

export async function GET(request: NextRequest) {
	if (!isE2EPreflightAllowed()) {
		return NextResponse.json({ error: "Not available" }, { status: 404 });
	}

	const e2eUserId =
		request.nextUrl.searchParams.get("userId")?.trim() ||
		process.env.PLAYWRIGHT_E2E_USER_ID?.trim() ||
		"";

	const result = await runE2EPreflight(e2eUserId);

	return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
