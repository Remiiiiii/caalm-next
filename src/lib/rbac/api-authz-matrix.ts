/**
 * API authorization matrix scanner.
 * Classifies every Next.js route.ts under src/app/api and supports a CI ratchet:
 * - Allowlisted routes may omit session/permission checks
 * - Baseline grandfathered gaps must not grow
 * - New unguarded routes fail CI
 */

import fs from "node:fs";
import path from "node:path";
import {
	API_AUTHZ_ALLOWLIST,
	API_AUTHZ_ALLOWLIST_PATHS,
} from "@/lib/rbac/api-authz-allowlist";

export type DetectedAuthClass =
	| "permission"
	| "session"
	| "cron"
	| "webhook"
	| "allowlisted"
	| "unguarded";

export type ClassifiedApiRoute = {
	path: string;
	file: string;
	detected: DetectedAuthClass;
	signals: string[];
	allowReason?: string;
};

const API_ROOT = path.join(process.cwd(), "src/app/api");
const BASELINE_PATH = path.join(
	process.cwd(),
	"src/lib/rbac/api-authz-baseline.json",
);

const SIGNAL_PATTERNS: Array<{ signal: string; class: DetectedAuthClass; re: RegExp }> =
	[
		{
			signal: "requirePermission",
			class: "permission",
			re: /\brequirePermission\s*\(/,
		},
		{
			signal: "requireITPermission",
			class: "permission",
			re: /\brequireITPermission\s*\(/,
		},
		{
			signal: "requireContractCreateContext",
			class: "permission",
			re: /\brequireContractCreateContext\s*\(/,
		},
		{
			signal: "hasPermission",
			class: "permission",
			re: /\bhasPermission\s*\(/,
		},
		{
			signal: "hasAnyPermission",
			class: "permission",
			re: /\bhasAnyPermission\s*\(/,
		},
		{
			signal: "authorize",
			class: "permission",
			re: /\bauthorize(CurrentUser)?\s*\(/,
		},
		{
			signal: "requireAuth",
			class: "session",
			re: /\brequireAuth\s*\(/,
		},
		{
			signal: "requireContractPermission",
			class: "session",
			re: /\brequireContractPermission\s*\(/,
		},
		{
			signal: "getCurrentUser",
			class: "session",
			re: /\bgetCurrentUser\s*\(/,
		},
		{
			signal: "getLoggedInUser",
			class: "session",
			re: /\bgetLoggedInUser\s*\(/,
		},
		{
			signal: "createSessionClient",
			class: "session",
			re: /\bcreateSessionClient\s*\(/,
		},
		{
			signal: "CRON_SECRET",
			class: "cron",
			re: /\bCRON_SECRET\b|\bisAuthorizedCron\b|x-cron-secret/i,
		},
		{
			signal: "stripeWebhook",
			class: "webhook",
			re: /\bconstructWebhookEvent\b|\bstripe-signature\b|\bstripe\.webhooks\b/i,
		},
		{
			signal: "githubWebhook",
			class: "webhook",
			re: /\bverifyGitHubWebhookSignature\b|\bx-hub-signature-256\b/i,
		},
	];

const CLASS_RANK: Record<DetectedAuthClass, number> = {
	permission: 5,
	cron: 4,
	webhook: 4,
	session: 3,
	allowlisted: 2,
	unguarded: 0,
};

function walkRouteFiles(dir: string, out: string[] = []): string[] {
	if (!fs.existsSync(dir)) return out;
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walkRouteFiles(full, out);
		} else if (entry.name === "route.ts" || entry.name === "route.js") {
			out.push(full);
		}
	}
	return out;
}

export function routePathFromFile(file: string): string {
	const rel = path.relative(API_ROOT, path.dirname(file));
	return rel.split(path.sep).join("/");
}

export function classifyRouteSource(
	source: string,
	routePath: string,
): Omit<ClassifiedApiRoute, "file"> {
	const signals: string[] = [];
	let best: DetectedAuthClass = "unguarded";

	for (const { signal, class: cls, re } of SIGNAL_PATTERNS) {
		if (re.test(source)) {
			signals.push(signal);
			if (CLASS_RANK[cls] > CLASS_RANK[best]) {
				best = cls;
			}
		}
	}

	if (best === "unguarded" && API_AUTHZ_ALLOWLIST_PATHS.has(routePath)) {
		const entry = API_AUTHZ_ALLOWLIST.find((e) => e.path === routePath);
		return {
			path: routePath,
			detected: "allowlisted",
			signals: [...signals, `allowlist:${entry?.class ?? "unknown"}`],
			allowReason: entry?.reason,
		};
	}

	return {
		path: routePath,
		detected: best,
		signals,
		allowReason: undefined,
	};
}

export function scanApiAuthzMatrix(): ClassifiedApiRoute[] {
	const files = walkRouteFiles(API_ROOT);
	return files
		.map((file) => {
			const routePath = routePathFromFile(file);
			const source = fs.readFileSync(file, "utf8");
			const classified = classifyRouteSource(source, routePath);
			return { ...classified, file };
		})
		.sort((a, b) => a.path.localeCompare(b.path));
}

export type ApiAuthzBaseline = {
	generatedAt: string;
	description: string;
	/** Unguarded route paths grandfathered until fixed */
	unguarded: string[];
};

export function loadApiAuthzBaseline(): ApiAuthzBaseline {
	const raw = fs.readFileSync(BASELINE_PATH, "utf8");
	return JSON.parse(raw) as ApiAuthzBaseline;
}

export function getUnguardedRoutes(
	routes: ClassifiedApiRoute[] = scanApiAuthzMatrix(),
): ClassifiedApiRoute[] {
	return routes.filter((r) => r.detected === "unguarded");
}

export function diffUnguardedAgainstBaseline(
	routes: ClassifiedApiRoute[] = scanApiAuthzMatrix(),
	baseline: ApiAuthzBaseline = loadApiAuthzBaseline(),
): {
	newUnguarded: string[];
	resolved: string[];
	remaining: string[];
} {
	const current = new Set(getUnguardedRoutes(routes).map((r) => r.path));
	const base = new Set(baseline.unguarded);
	const newUnguarded = [...current].filter((p) => !base.has(p)).sort();
	const resolved = [...base].filter((p) => !current.has(p)).sort();
	const remaining = [...current].filter((p) => base.has(p)).sort();
	return { newUnguarded, resolved, remaining };
}

export function assertAllowlistPathsExist(
	routes: ClassifiedApiRoute[] = scanApiAuthzMatrix(),
): string[] {
	const existing = new Set(routes.map((r) => r.path));
	return API_AUTHZ_ALLOWLIST.map((e) => e.path).filter((p) => !existing.has(p));
}

export function buildBaselineFromScan(
	routes: ClassifiedApiRoute[] = scanApiAuthzMatrix(),
): ApiAuthzBaseline {
	return {
		generatedAt: new Date().toISOString(),
		description:
			"Grandfathered API routes lacking detectable authz. Ratchet: may shrink, must not grow. Prefer requirePermission.",
		unguarded: getUnguardedRoutes(routes).map((r) => r.path),
	};
}

export { BASELINE_PATH, API_ROOT };
