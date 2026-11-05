export function buildFindingKey(
	title: string,
	frameworkRefs: string[],
): string {
	const base = title
		.toLowerCase()
		.replace(/[^\w\s]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.slice(0, 80);
	const ref = (frameworkRefs[0] || "unspecified")
		.toLowerCase()
		.replace(/[^\w.-]/g, "");
	return `${ref}:${base}`;
}
