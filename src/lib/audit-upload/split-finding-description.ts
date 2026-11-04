/**
 * Parsed findings store condition + auditor recommendation in one description
 * field, joined with blank lines. Split them so the UI can label each part.
 */
export function splitFindingDescription(raw: string | null | undefined): {
	conditionText: string;
	correctiveText: string;
} {
	const normalized = (raw ?? "").replace(/\r\n/g, "\n").trim();
	if (!normalized) {
		return { conditionText: "", correctiveText: "" };
	}

	const blocks = normalized
		.split(/\n\n+/)
		.map((part) => part.trim())
		.filter(Boolean);

	if (blocks.length < 2) {
		return { conditionText: blocks[0] ?? "", correctiveText: "" };
	}

	return {
		conditionText: blocks[0],
		correctiveText: blocks.slice(1).join("\n\n"),
	};
}
