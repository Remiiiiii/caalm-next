/** Shared client/server constants for cross-tab session sync. */

export const CACHED_USER_STORAGE_KEY = "cached_user";
export const SESSION_CHANGED_NOTICE_PARAM = "notice";
export const SESSION_CHANGED_NOTICE_VALUE = "session_changed";

export type CachedAuthUser = {
	user?: {
		$id?: string;
		name?: string;
		email?: string;
	};
	timestamp?: number;
};

export function appendSessionChangedNotice(path: string): string {
	const separator = path.includes("?") ? "&" : "?";
	return `${path}${separator}${SESSION_CHANGED_NOTICE_PARAM}=${SESSION_CHANGED_NOTICE_VALUE}`;
}

export function parseCachedAuthUser(raw: string | null): CachedAuthUser | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as CachedAuthUser;
	} catch {
		return null;
	}
}

export function getCachedUserId(raw: string | null): string | null {
	const parsed = parseCachedAuthUser(raw);
	return parsed?.user?.$id ?? null;
}

export function getCachedUserDisplayName(raw: string | null): string | null {
	const parsed = parseCachedAuthUser(raw);
	const user = parsed?.user;
	if (!user) return null;
	return user.name?.trim() || user.email?.trim() || null;
}
