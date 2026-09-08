const PROTECTED_LABELS = new Set([
	"effective date",
	"grantor",
	"grantee",
	"signature",
	"authorized signee",
	"authorized signee (printed name)",
	"title",
	"date",
	"contractor",
	"vendor",
	"client",
	"landlord",
	"tenant",
	"consultant",
	"donor",
	"recipient",
	"company",
	"employee",
	"party a",
	"party b",
]);

function normalizedLabel(value: string): string {
	return value
		.replace(/\*\*/g, "")
		.replace(/:$/, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/** Number of leading characters belonging to a wizard-owned field label. */
export function protectedPrefixLength(text: string): number {
	const match = /^(\*\*([^*]{1,80}):\*\*|([^:\n]{1,80}):)\s*/.exec(text);
	if (!match) return 0;
	const label = normalizedLabel(match[2] || match[3] || "");
	return PROTECTED_LABELS.has(label) ? match[0].length : 0;
}

/** Signature headings and authored bold defined terms cannot be replaced. */
export function isProtectedStructuralText(text: string): boolean {
	const plain = text.replace(/\*\*/g, "").trim();
	if (PROTECTED_LABELS.has(normalizedLabel(plain))) return true;

	const boldTerms = [...text.matchAll(/\*\*([^*]{1,80})\*\*/g)];
	return boldTerms.some((match) =>
		PROTECTED_LABELS.has(normalizedLabel(match[1] || "")),
	);
}
