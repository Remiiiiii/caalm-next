type PresenceEntry = {
	userId: string;
	name: string;
	at: number;
};

const store = new Map<string, PresenceEntry[]>();
const TTL_MS = 45_000;

export function touchScriptPresence(
	sessionId: string,
	user: { userId: string; name: string },
) {
	const now = Date.now();
	const key = sessionId;
	const current = (store.get(key) ?? []).filter((e) => now - e.at < TTL_MS);
	const without = current.filter((e) => e.userId !== user.userId);
	without.push({ userId: user.userId, name: user.name, at: now });
	store.set(key, without);
	return without.map((e) => ({
		userId: e.userId,
		name: e.name,
		at: new Date(e.at).toISOString(),
	}));
}