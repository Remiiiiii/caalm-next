const PLACEHOLDER_PATHS = new Set([
	"/assets/images/avatar-placeholder.png",
	"/assets/images/avatar.png",
]);

export function isUsableAvatarUrl(avatar?: string | null): avatar is string {
	if (!avatar?.trim()) return false;
	const trimmed = avatar.trim();
	if (PLACEHOLDER_PATHS.has(trimmed)) return false;
	return trimmed.startsWith("http") || trimmed.startsWith("/");
}

export function initialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}
