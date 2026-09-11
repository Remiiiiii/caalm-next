/** Template merge leftovers like {{CONTRACTOR_NAME}} — not real field values. */
const TEMPLATE_TOKEN_RE = /^\{\{[A-Z0-9_]+\}\}$/;

export function isTemplateTokenValue(value?: string | null): boolean {
	if (!value) return false;
	return TEMPLATE_TOKEN_RE.test(value.trim());
}

/** Empty when the string is a leftover {{TOKEN}} or blank. */
export function scrubTemplateTokenValue(
	value?: string | null,
): string | undefined {
	if (value === undefined || value === null) return undefined;
	const trimmed = value.trim();
	if (!trimmed || isTemplateTokenValue(trimmed)) return undefined;
	return trimmed;
}
