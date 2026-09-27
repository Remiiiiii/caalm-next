import { Query } from "node-appwrite";
import * as sdk from "node-appwrite";

export type AuthPasswordUpdatesResult = {
	ok: boolean;
	byAccount: Map<string, string>;
};

const PAGE_SIZE = 100;
const MAX_USERS = 500;
/** Auth Users.list is extra data for the sidebar; never block the user list on it. */
export const AUTH_JOIN_TIMEOUT_MS = 2500;

const AUTH_JOIN_FALLBACK: AuthPasswordUpdatesResult = {
	ok: false,
	byAccount: new Map(),
};

async function withTimeout<T>(
	promise: Promise<T>,
	ms: number,
	fallback: T,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<T>((resolve) => {
				timer = setTimeout(() => resolve(fallback), ms);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

function authClient() {
	return new sdk.Client()
		.setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
		.setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
		.setKey(process.env.NEXT_APPWRITE_API_KEY!);
}

async function listAuthPasswordUpdatesUncapped(): Promise<AuthPasswordUpdatesResult> {
	const byAccount = new Map<string, string>();
	try {
		const users = new sdk.Users(authClient());
		let cursor: string | undefined;
		let scanned = 0;
		while (scanned < MAX_USERS) {
			const queries = [Query.limit(PAGE_SIZE)];
			if (cursor) queries.push(Query.cursorAfter(cursor));
			const page = await users.list({ queries });
			const rows = page.users ?? [];
			if (rows.length === 0) break;
			for (const row of rows) {
				scanned += 1;
				cursor = row.$id;
				const stamp = (row as { passwordUpdate?: string }).passwordUpdate;
				if (typeof stamp === "string" && stamp.trim()) {
					byAccount.set(row.$id, stamp);
				}
				if (scanned >= MAX_USERS) break;
			}
			if (rows.length < PAGE_SIZE) break;
		}
		return { ok: true, byAccount };
	} catch {
		return { ok: false, byAccount: new Map() };
	}
}

/** Last password change on the Auth user, keyed by account id. */
export async function listAuthPasswordUpdatesByAccountId(): Promise<AuthPasswordUpdatesResult> {
	return withTimeout(
		listAuthPasswordUpdatesUncapped(),
		AUTH_JOIN_TIMEOUT_MS,
		AUTH_JOIN_FALLBACK,
	);
}
