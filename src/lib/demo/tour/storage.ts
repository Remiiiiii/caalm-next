const STORAGE_KEY = "caalm-demo-tour-seen";

type SeenStore = {
	seen: string[];
};

function readStore(): SeenStore {
	if (typeof window === "undefined") {
		return { seen: [] };
	}
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return { seen: [] };
		const parsed = JSON.parse(raw) as SeenStore;
		if (!parsed || !Array.isArray(parsed.seen)) return { seen: [] };
		return { seen: parsed.seen.filter((id) => typeof id === "string") };
	} catch {
		return { seen: [] };
	}
}

function writeStore(store: SeenStore): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch {
		// Quota or private mode — ignore
	}
}

export function getSeenTipIds(): string[] {
	return readStore().seen;
}

export function markTipSeen(id: string): void {
	const store = readStore();
	if (store.seen.includes(id)) return;
	writeStore({ seen: [...store.seen, id] });
}

/** Clear all dismissed tips so the tour replays (demo debugging). */
export function clearDemoTourSeen(): void {
	if (typeof window === "undefined") return;
	window.localStorage.removeItem(STORAGE_KEY);
}
