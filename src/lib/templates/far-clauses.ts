/**
 * FAR Part 52 clause catalog from the public eCFR Versioner API.
 * Title 48 Chapter 1 = FAR; Part 52 holds solicitation provisions and contract clauses.
 */

export type FarClause = {
	number: string;
	title: string;
};

export type FarClauseCatalog = {
	asOf: string;
	source: "ecfr";
	clauses: FarClause[];
};

type EcfrNode = {
	type?: string;
	identifier?: string;
	label?: string;
	label_description?: string;
	reserved?: boolean;
	children?: EcfrNode[];
};

type EcfrTitlesResponse = {
	titles?: Array<{
		number?: number;
		up_to_date_as_of?: string;
	}>;
};

/** Real FAR/DFARS-style clause ids in Part 52 (e.g. 52.212-4), not scope sections. */
export const FAR_CLAUSE_NUMBER_RE = /^52\.\d{3}-\d+/;

const ECFR_BASE = "https://www.ecfr.gov";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

let memoryCache: { expiresAt: number; catalog: FarClauseCatalog } | null = null;

export function isSelectableFarClause(node: {
	identifier?: string;
	label?: string;
	label_description?: string;
	reserved?: boolean;
}): boolean {
	const id = String(node.identifier || "").trim();
	if (!FAR_CLAUSE_NUMBER_RE.test(id)) return false;
	if (node.reserved) return false;
	const title = String(node.label_description || node.label || "").trim();
	if (!title) return false;
	if (/\[reserved\]/i.test(title)) return false;
	return true;
}

export function walkEcfrSections(root: EcfrNode): EcfrNode[] {
	const out: EcfrNode[] = [];
	const visit = (node: EcfrNode) => {
		if (node.type === "section") out.push(node);
		for (const child of node.children || []) visit(child);
	};
	visit(root);
	return out;
}

export function extractFarClausesFromStructure(root: EcfrNode): FarClause[] {
	const seen = new Set<string>();
	const clauses: FarClause[] = [];
	for (const node of walkEcfrSections(root)) {
		if (!isSelectableFarClause(node)) continue;
		const number = String(node.identifier).trim();
		if (seen.has(number)) continue;
		seen.add(number);
		const rawTitle = String(node.label_description || node.label || "").trim();
		const title = rawTitle.replace(/\.$/, "");
		clauses.push({ number, title });
	}
	clauses.sort((a, b) => a.number.localeCompare(b.number, "en", { numeric: true }));
	return clauses;
}

export function formatFarClauseLine(clause: FarClause): string {
	return `FAR ${clause.number} — ${clause.title}`;
}

/** Pull clause numbers from saved token text (lines or comma-separated). */
export function parseFarClauseNumbers(value: string): string[] {
	if (!value.trim()) return [];
	const found = new Set<string>();
	for (const match of value.matchAll(/52\.\d{3}-\d+[A-Za-z0-9-]*/g)) {
		const number = match[0];
		if (FAR_CLAUSE_NUMBER_RE.test(number)) found.add(number);
	}
	return [...found];
}

export function serializeFarClauseSelection(
	numbers: string[],
	catalog: FarClause[],
): string {
	const byNumber = new Map(catalog.map((clause) => [clause.number, clause]));
	const unique = [...new Set(numbers.filter((n) => FAR_CLAUSE_NUMBER_RE.test(n)))];
	return unique
		.map((number) => {
			const clause = byNumber.get(number);
			return clause
				? formatFarClauseLine(clause)
				: `FAR ${number}`;
		})
		.join("\n");
}

export function filterFarClauses(
	clauses: FarClause[],
	query: string,
): FarClause[] {
	const q = query.trim().toLowerCase();
	if (!q) return clauses;
	return clauses.filter(
		(clause) =>
			clause.number.toLowerCase().includes(q) ||
			clause.title.toLowerCase().includes(q),
	);
}

async function resolveTitle48Date(): Promise<string> {
	const response = await fetch(`${ECFR_BASE}/api/versioner/v1/titles.json`, {
		next: { revalidate: 86_400 },
	});
	if (!response.ok) {
		throw new Error(`eCFR titles lookup failed (${response.status})`);
	}
	const body = (await response.json()) as EcfrTitlesResponse;
	const title48 = body.titles?.find((row) => row.number === 48);
	const asOf = title48?.up_to_date_as_of?.trim();
	if (!asOf) throw new Error("eCFR Title 48 date is unavailable");
	return asOf;
}

export async function fetchFarClauseCatalog(): Promise<FarClauseCatalog> {
	if (memoryCache && memoryCache.expiresAt > Date.now()) {
		return memoryCache.catalog;
	}

	const asOf = await resolveTitle48Date();
	const response = await fetch(
		`${ECFR_BASE}/api/versioner/v1/structure/${asOf}/title-48.json?part=52`,
		{ next: { revalidate: 86_400 } },
	);
	if (!response.ok) {
		throw new Error(`eCFR FAR Part 52 fetch failed (${response.status})`);
	}
	const structure = (await response.json()) as EcfrNode;
	const catalog: FarClauseCatalog = {
		asOf,
		source: "ecfr",
		clauses: extractFarClausesFromStructure(structure),
	};
	memoryCache = {
		expiresAt: Date.now() + CACHE_TTL_MS,
		catalog,
	};
	return catalog;
}

/** Test helper — clears the in-process catalog cache. */
export function clearFarClauseCatalogCache(): void {
	memoryCache = null;
}
