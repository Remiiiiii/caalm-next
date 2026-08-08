import { type NextRequest, NextResponse } from "next/server";
import {
	getCurrentUser,
	getCurrentUserFrom2FA,
} from "@/lib/actions/user.actions";
import {
	buildDesktopExpiryAlert,
	sendDesktopAlert,
} from "@/lib/push/notifications-server";

function isAuthorizedCron(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return false;
	const token = authHeader.slice("Bearer ".length).trim();
	const expected =
		process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || "";
	return Boolean(expected) && token === expected;
}

async function resolveSessionAccountId(): Promise<string | null> {
	let user = await getCurrentUser();
	if (!user) {
		user = await getCurrentUserFrom2FA();
	}
	if (!user) return null;
	return (user as { accountId?: string }).accountId || user.$id || null;
}

type Kind = "contract" | "license" | "audit" | "all";

/**
 * Dev/test helper: send sample desktop push(es) to the current user (or
 * userId when authorized with CRON_SECRET).
 *
 * POST /api/notifications/desktop-test
 * Body (optional): { kind?: "contract"|"license"|"audit"|"all", daysUntil?: number, userId?: string }
 *
 * Auth: logged-in session, or Authorization: Bearer <CRON_SECRET>
 */
export async function POST(request: NextRequest) {
	const cronOk = isAuthorizedCron(request);
	const sessionUserId = await resolveSessionAccountId();

	if (!cronOk && !sessionUserId) {
		return NextResponse.json({ error: "Authentication required" }, { status: 401 });
	}

	if (process.env.NODE_ENV === "production" && !cronOk) {
		return NextResponse.json(
			{ error: "desktop-test requires CRON_SECRET in production" },
			{ status: 403 },
		);
	}

	try {
		const body = (await request.json().catch(() => ({}))) as {
			kind?: Kind;
			daysUntil?: number;
			userId?: string;
		};

		const userId =
			cronOk && typeof body.userId === "string" && body.userId.trim()
				? body.userId.trim()
				: sessionUserId;

		if (!userId) {
			return NextResponse.json(
				{ error: "userId required when using CRON_SECRET without a session" },
				{ status: 400 },
			);
		}

		const daysUntil =
			typeof body.daysUntil === "number" && Number.isFinite(body.daysUntil)
				? Math.floor(body.daysUntil)
				: 5;

		const kind: Kind = body.kind || "all";
		const expiry = new Date();
		expiry.setDate(expiry.getDate() + Math.max(daysUntil, 0));
		const expirySlice = expiry.toISOString().slice(0, 10);

		const samples = [
			buildDesktopExpiryAlert({
				kind: "contract",
				name: "Community-Based Behavioral Health & Child Welfare Support Services",
				daysUntil,
				expirySlice,
				autoRenew: true,
				entityId: "desktop-test-contract",
				url: "/contracts",
			}),
			buildDesktopExpiryAlert({
				kind: "license",
				name: "Residential Child-Caring Agency License — Parkline Youth Stabilization Program",
				daysUntil,
				expirySlice,
				entityId: "desktop-test-license",
				url: "/licenses",
			}),
			buildDesktopExpiryAlert({
				kind: "audit",
				name: "Annual HIPAA Compliance Audit — Parkline Programs",
				daysUntil,
				expirySlice,
				entityId: "desktop-test-audit",
				url: "/audits",
			}),
		];

		const selected =
			kind === "all"
				? samples
				: samples.filter((a) => a.tag?.startsWith(`${kind === "audit" ? "audit-upcoming" : `${kind}-expiry`}`));

		const results: { title: string; sent: boolean }[] = [];
		for (const alert of selected) {
			const sent = await sendDesktopAlert(userId, alert);
			results.push({ title: alert.title, sent });
		}

		return NextResponse.json({
			success: true,
			userId,
			daysUntil,
			results,
		});
	} catch (error) {
		console.error("[desktop-test] failed:", error);
		return NextResponse.json(
			{ error: "Failed to send desktop test alerts" },
			{ status: 500 },
		);
	}
}
