export interface DedupeCandidate {
	$id: string;
	title: string;
	description: string;
	frameworkRefs: string[];
}

function tokenize(value: string): Set<string> {
	return new Set(
		value
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(/\s+/)
			.filter((token) => token.length > 2),
	);
}

export function jaccardSimilarity(left: string, right: string): number {
	const a = tokenize(left);
	const b = tokenize(right);
	if (a.size === 0 && b.size === 0) return 1;
	if (a.size === 0 || b.size === 0) return 0;
	let overlap = 0;
	for (const token of a) {
		if (b.has(token)) overlap += 1;
	}
	return overlap / (a.size + b.size - overlap);
}

function frameworkOverlap(left: string[], right: string[]): number {
	if (left.length === 0 || right.length === 0) return 0;
	const rightSet = new Set(right.map((ref) => ref.toLowerCase()));
	const hits = left.filter((ref) => rightSet.has(ref.toLowerCase())).length;
	return hits / Math.max(left.length, right.length);
}

export function findRepeatFinding(
	incoming: Pick<DedupeCandidate, "title" | "description" | "frameworkRefs">,
	history: DedupeCandidate[],
	threshold = 0.55,
): DedupeCandidate | null {
	let best: { item: DedupeCandidate; score: number } | null = null;
	const incomingText = `${incoming.title} ${incoming.description}`;
	for (const item of history) {
		const textScore = jaccardSimilarity(
			incomingText,
			`${item.title} ${item.description}`,
		);
		const refScore = frameworkOverlap(incoming.frameworkRefs, item.frameworkRefs);
		const score = Math.max(textScore, (textScore + refScore) / 2);
		if (score >= threshold && (!best || score > best.score)) {
			best = { item, score };
		}
	}
	return best?.item ?? null;
}
