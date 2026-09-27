import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { findMissingNpoShippedRouteModules } from "./npo-shipped-routes";

/**
 * Out-of-lane NPO claims to keep out of marketing/docs — see nonprofit catalog
 * section 10 and FUNDING_OUT_OF_LANE in src/lib/funding/finance-scope-copy.ts.
 */
export const NPO_PACKAGING_SCAN_ROOTS = [
	"src/components/landing",
	"src/content/docs",
] as const;

export type NpoPackagingViolation = {
	file: string;
	line: number;
	snippet: string;
	reason: string;
};

export type NpoPackagingGateResult = {
	ok: boolean;
	reason?: string;
	bannedViolations: NpoPackagingViolation[];
	missingRoutes: ReturnType<typeof findMissingNpoShippedRouteModules>;
};

const ALLOWED_PHRASES = [/import a wealth screen/i, /990 worksheet/i] as const;

function lineIsAllowedException(line: string): boolean {
	return ALLOWED_PHRASES.some((re) => re.test(line));
}

function lineClaims990Efile(line: string): boolean {
	if (!/\b990 e-file\b/i.test(line)) return false;
	if (lineIsAllowedException(line)) return false;
	if (
		/not (a |an )?990 e-file|does not offer 990 e-file|no 990 e-file|without 990 e-file/i.test(
			line,
		)
	) {
		return false;
	}
	return true;
}

function lineClaimsPayrollProduct(line: string): boolean {
	if (
		/not payroll|no payroll|without payroll|is not payroll|not a payroll|outside payroll/i.test(
			line,
		)
	) {
		return false;
	}
	return (
		/\bpayroll system\b/i.test(line) ||
		/\brun payroll\b/i.test(line) ||
		/\bCAALM payroll\b/i.test(line) ||
		/\bour payroll\b/i.test(line)
	);
}

function lineClaimsWealthEngine(line: string): boolean {
	if (lineIsAllowedException(line)) return false;
	return /wealth engine/i.test(line);
}

function lineClaimsLiveIntacct(line: string): boolean {
	if (
		/not.*intacct|without.*intacct|no live intacct|not a live intacct|not a two-way sync/i.test(
			line,
		)
	) {
		return false;
	}
	return (
		/live Intacct connector/i.test(line) ||
		/integrates with Intacct/i.test(line) ||
		/Intacct integration/i.test(line)
	);
}

function scanLine(
	file: string,
	lineNumber: number,
	line: string,
): NpoPackagingViolation[] {
	const hits: NpoPackagingViolation[] = [];
	const push = (reason: string) => {
		hits.push({
			file,
			line: lineNumber,
			snippet: line.trim().slice(0, 160),
			reason,
		});
	};
	if (lineClaims990Efile(line)) push("Banned claim: 990 e-file");
	if (lineClaimsPayrollProduct(line)) push("Banned claim: payroll product");
	if (lineClaimsWealthEngine(line)) push("Banned claim: wealth engine");
	if (lineClaimsLiveIntacct(line)) push("Banned claim: live Intacct connector");
	return hits;
}

function walkMarketingDocs(cwd: string): NpoPackagingViolation[] {
	const violations: NpoPackagingViolation[] = [];
	for (const relRoot of NPO_PACKAGING_SCAN_ROOTS) {
		const root = join(cwd, relRoot);
		const stack = [root];
		while (stack.length) {
			const dir = stack.pop()!;
			let entries;
			try {
				entries = readdirSync(dir, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const entry of entries) {
				const full = join(dir, entry.name);
				if (entry.isDirectory()) stack.push(full);
				else if (/\.(tsx|ts|md|mdx)$/.test(entry.name)) {
					const relFile = full.slice(cwd.length + 1);
					const text = readFileSync(full, "utf8");
					const lines = text.split("\n");
					for (let i = 0; i < lines.length; i++) {
						violations.push(
							...scanLine(relFile, i + 1, lines[i] ?? ""),
						);
					}
				}
			}
		}
	}
	return violations;
}

/** Synchronous packaging gate used by roadmap overview (10.6 + 10.7). */
export function evaluateNpoPackagingGate(cwd = process.cwd()): NpoPackagingGateResult {
	const bannedViolations = walkMarketingDocs(cwd);
	const missingRoutes = findMissingNpoShippedRouteModules(cwd);
	const ok = bannedViolations.length === 0 && missingRoutes.length === 0;
	let reason: string | undefined;
	if (!ok) {
		if (bannedViolations[0]) {
			reason = `${bannedViolations[0].reason} (${bannedViolations[0].file}:${bannedViolations[0].line})`;
		} else if (missingRoutes[0]) {
			reason = `Missing shipped route module for ${missingRoutes[0].pathname}`;
		}
	}
	return { ok, reason, bannedViolations, missingRoutes };
}

/** Cap overall NPO progress at 99% until packaging grep + route checks pass (10.8). */
export function applyNpoPackagingProgressCap(
	percent: number,
	gate: Pick<NpoPackagingGateResult, "ok" | "reason">,
): number {
	if (gate.ok) return percent;
	if (percent >= 100) return 99;
	return percent;
}
