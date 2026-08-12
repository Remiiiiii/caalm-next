/**
 * Scaffold a Next.js App Router API route with an approved auth gate.
 *
 * Usage:
 *   pnpm new:api-route contracts/export --permission CONTRACTS.VIEW
 *   pnpm new:api-route contracts/export --permission CONTRACTS.VIEW --methods GET,POST
 *   pnpm new:api-route cron/nightly-sync --type cron --methods GET
 *   pnpm new:api-route billing/custom-webhook --type webhook --methods POST
 *   pnpm new:api-route public/waitlist --type public --methods POST --allowlist-reason "Marketing waitlist"
 *
 * Path is relative to src/app/api (no leading slash).
 */

import fs from "node:fs";
import path from "node:path";
import { PERMISSIONS } from "../src/constants/permissions";

type GateType = "permission" | "cron" | "webhook" | "public";

type Args = {
	routePath: string;
	type: GateType;
	methods: string[];
	permission?: string;
	allowlistReason?: string;
	force: boolean;
};

function printHelp(): void {
	console.log(`Scaffold an API route with an auth gate.

Usage:
  pnpm new:api-route <api-path> --permission <KEY> [--methods GET,POST]
  pnpm new:api-route <api-path> --type cron|webhook|public [--methods GET] [--allowlist-reason "..."]

Examples:
  pnpm new:api-route contracts/export --permission CONTRACTS.VIEW
  pnpm new:api-route cron/demo-job --type cron --methods GET
  pnpm new:api-route public/waitlist --type public --allowlist-reason "Marketing waitlist signup"

Permission KEY forms:
  CONTRACTS.VIEW
  contracts.view
  PERMISSIONS.CONTRACTS.VIEW
`);
}

function parseArgs(argv: string[]): Args {
	if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
		printHelp();
		process.exit(argv.length === 0 ? 1 : 0);
	}

	const routePath = argv[0]?.replace(/^\/+/, "").replace(/\/+$/, "");
	if (!routePath || routePath.startsWith("-")) {
		console.error("Missing <api-path> (e.g. contracts/export)");
		printHelp();
		process.exit(1);
	}

	let type: GateType = "permission";
	let methods = ["GET"];
	let permission: string | undefined;
	let allowlistReason: string | undefined;
	let force = false;

	for (let i = 1; i < argv.length; i++) {
		const arg = argv[i];
		const next = argv[i + 1];
		if (arg === "--type" && next) {
			type = next as GateType;
			i++;
		} else if (arg === "--permission" && next) {
			permission = next;
			i++;
		} else if (arg === "--methods" && next) {
			methods = next.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
			i++;
		} else if (arg === "--allowlist-reason" && next) {
			allowlistReason = next;
			i++;
		} else if (arg === "--force") {
			force = true;
		} else {
			console.error(`Unknown argument: ${arg}`);
			process.exit(1);
		}
	}

	if (!["permission", "cron", "webhook", "public"].includes(type)) {
		console.error(`Invalid --type ${type}`);
		process.exit(1);
	}

	if (type === "permission" && !permission) {
		console.error("--permission is required when --type is permission (default)");
		process.exit(1);
	}

	if (type === "public" && !allowlistReason?.trim()) {
		console.error("--allowlist-reason is required for --type public");
		process.exit(1);
	}

	const allowedMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
	for (const m of methods) {
		if (!allowedMethods.has(m)) {
			console.error(`Unsupported method: ${m}`);
			process.exit(1);
		}
	}

	return { routePath, type, methods, permission, allowlistReason, force };
}

function resolvePermissionExpr(input: string): {
	expr: string;
	literal: string;
} {
	let cleaned = input.trim();
	if (cleaned.startsWith("PERMISSIONS.")) {
		cleaned = cleaned.slice("PERMISSIONS.".length);
	}

	// Dot path into PERMISSIONS object: CONTRACTS.VIEW
	if (/^[A-Z][A-Z0-9_]*(\.[A-Z][A-Z0-9_]*)+$/.test(cleaned)) {
		const parts = cleaned.split(".");
		let cursor: unknown = PERMISSIONS;
		for (const part of parts) {
			if (
				cursor &&
				typeof cursor === "object" &&
				part in (cursor as Record<string, unknown>)
			) {
				cursor = (cursor as Record<string, unknown>)[part];
			} else {
				console.error(
					`Unknown permission path PERMISSIONS.${cleaned}. Check src/constants/permissions.ts`,
				);
				process.exit(1);
			}
		}
		if (typeof cursor !== "string") {
			console.error(`PERMISSIONS.${cleaned} is not a permission string`);
			process.exit(1);
		}
		return { expr: `PERMISSIONS.${cleaned}`, literal: cursor };
	}

	// Raw key: contracts.view
	if (/^[a-z0-9]+(\.[a-z0-9_]+)+$/.test(cleaned)) {
		const flat = Object.values(PERMISSIONS).flatMap((category) =>
			Object.values(category),
		) as string[];
		if (!flat.includes(cleaned)) {
			console.error(
				`Unknown permission key "${cleaned}". Add it to permissions.ts or use CONTRACTS.VIEW form.`,
			);
			process.exit(1);
		}
		// Prefer PERMISSIONS.* expression when we can find it
		for (const [cat, group] of Object.entries(PERMISSIONS)) {
			for (const [name, value] of Object.entries(
				group as Record<string, string>,
			)) {
				if (value === cleaned) {
					return {
						expr: `PERMISSIONS.${cat}.${name}`,
						literal: cleaned,
					};
				}
			}
		}
		return { expr: `"${cleaned}" as const`, literal: cleaned };
	}

	console.error(
		`Could not parse permission "${input}". Use CONTRACTS.VIEW or contracts.view`,
	);
	process.exit(1);
}

function renderPermissionHandler(method: string, permExpr: string): string {
	return `export async function ${method}(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: ${permExpr},
	});
	if (denied) return denied;

	try {
		// TODO: implement ${method} handler
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}`;
}

function renderCronHandler(method: string): string {
	return `export async function ${method}(request: NextRequest) {
	if (!isAuthorizedCron(request)) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		// TODO: implement cron work
		return NextResponse.json({
			success: true,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}`;
}

function renderWebhookHandler(method: string): string {
	return `export async function ${method}(request: NextRequest) {
	const signature = request.headers.get("stripe-signature");
	if (!signature) {
		return NextResponse.json(
			{ error: "Missing stripe-signature" },
			{ status: 400 },
		);
	}

	try {
		const payload = await request.text();
		// TODO: verify signature and handle event
		void payload;
		void signature;
		return NextResponse.json({ received: true });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ error: "Webhook error" },
			{ status: 400 },
		);
	}
}`;
}

function renderPublicHandler(method: string): string {
	return `export async function ${method}(_request: NextRequest) {
	try {
		// TODO: implement public handler (no session). Keep tightly scoped.
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ success: false, error: "Internal server error" },
			{ status: 500 },
		);
	}
}`;
}

function buildFileContents(args: Args): string {
	if (args.type === "permission") {
		const { expr, literal } = resolvePermissionExpr(args.permission!);
		const handlers = args.methods
			.map((m) => renderPermissionHandler(m, expr))
			.join("\n\n");
		return `import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requirePermission } from "@/lib/rbac/middleware";

/**
 * Scaffolded API route — permission gate required.
 * Permission: ${literal} (${expr})
 */

${handlers}
`;
	}

	if (args.type === "cron") {
		const handlers = args.methods.map(renderCronHandler).join("\n\n");
		return `import { type NextRequest, NextResponse } from "next/server";

function isAuthorizedCron(request: NextRequest): boolean {
	const authHeader = request.headers.get("authorization");
	if (!authHeader?.startsWith("Bearer ")) return false;
	const token = authHeader.slice("Bearer ".length).trim();
	const expected =
		process.env.CRON_SECRET || process.env.CRON_SECRET_TOKEN || "";
	return Boolean(expected) && token === expected;
}

/**
 * Scaffolded cron route — Bearer CRON_SECRET required.
 */

${handlers}
`;
	}

	if (args.type === "webhook") {
		const handlers = args.methods.map(renderWebhookHandler).join("\n\n");
		return `import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Scaffolded webhook route — verify provider signature before handling.
 */

${handlers}
`;
	}

	// public
	const handlers = args.methods.map(renderPublicHandler).join("\n\n");
	return `import { type NextRequest, NextResponse } from "next/server";

/**
 * Scaffolded public route.
 * Allowlist reason: ${args.allowlistReason}
 *
 * After creating this file, add an entry to src/lib/rbac/api-authz-allowlist.ts
 * (class: "public") with that reason, then run: pnpm run test:api-authz
 */

${handlers}
`;
}

function appendAllowlistHint(routePath: string, reason: string): void {
	console.log(`
Public routes must be allowlisted. Add this to src/lib/rbac/api-authz-allowlist.ts:

  {
    path: "${routePath}",
    class: "public",
    reason: ${JSON.stringify(reason)},
  },

Then run: pnpm run test:api-authz
`);
}

function main(): void {
	const args = parseArgs(process.argv.slice(2));
	const apiRoot = path.join(process.cwd(), "src/app/api");
	const dir = path.join(apiRoot, ...args.routePath.split("/"));
	const file = path.join(dir, "route.ts");

	if (fs.existsSync(file) && !args.force) {
		console.error(`Refusing to overwrite existing file: ${file} (use --force)`);
		process.exit(1);
	}

	fs.mkdirSync(dir, { recursive: true });
	const contents = buildFileContents(args);
	fs.writeFileSync(file, contents, "utf8");

	console.log(`Created ${path.relative(process.cwd(), file)}`);
	console.log(`Gate: ${args.type}`);
	if (args.type === "permission") {
		console.log(`Permission: ${args.permission}`);
	}
	console.log(`Methods: ${args.methods.join(", ")}`);
	console.log("Next: implement the TODO body, then run pnpm run test:api-authz");

	if (args.type === "public") {
		appendAllowlistHint(args.routePath, args.allowlistReason!);
	}
}

main();
