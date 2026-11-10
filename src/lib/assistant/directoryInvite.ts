/**
 * Match Ask CAALM invitees against the same connected-directory list
 * as the dashboard “Send Invite Link” form (uninvited Appwrite users).
 */

import { getUninvitedUsers } from "@/lib/actions/user.actions";

export type DirectoryInvitee = {
	$id: string;
	email: string;
	fullName: string;
};

/** Strip trailing sentence punctuation so "Chris Vale." still matches "Chris Vale". */
export function normalizeDirectoryHint(hint: string): string {
	return hint
		.trim()
		.replace(/^["'`]+|["'`]+$/g, "")
		.replace(/[.,;:!?…]+$/g, "")
		.trim();
}

function scoreDirectoryMatch(
	user: DirectoryInvitee,
	hint: string,
): number {
	const q = normalizeDirectoryHint(hint).toLowerCase();
	if (!q) return 0;
	const email = user.email.trim().toLowerCase();
	const name = user.fullName.trim().toLowerCase();
	let score = 0;
	if (email === q) score = Math.max(score, 1000);
	if (name === q) score = Math.max(score, 900);
	if (name.includes(q) && q.length >= 3) {
		score = Math.max(score, 400 + Math.min(q.length, 50));
	}
	const tokens = q
		.split(/\s+/)
		.map((t) => t.replace(/[.,;:!?…]+$/g, ""))
		.filter((t) => t.length >= 2);
	if (tokens.length >= 2 && tokens.every((t) => name.includes(t))) {
		score = Math.max(score, 750);
	}
	return score;
}

export async function listDirectoryInvitees(): Promise<DirectoryInvitee[]> {
	const rows = await getUninvitedUsers();
	return (rows ?? []).map((row) => {
		const rec = row as {
			$id?: string;
			email?: string;
			fullName?: string;
			name?: string;
		};
		return {
			$id: String(rec.$id ?? ""),
			email: String(rec.email ?? "").trim(),
			fullName: String(rec.fullName || rec.name || "Unknown").trim(),
		};
	}).filter((row) => row.$id && row.email);
}

/**
 * Resolve name/email hints to directory rows. Unmatched hints are returned
 * so the assistant can explain they are not ready for a CAALM invite.
 */
export async function resolveDirectoryInvitees(params: {
	nameHints: string[];
	emails: string[];
}): Promise<{
	matched: DirectoryInvitee[];
	unmatched: string[];
}> {
	const directory = await listDirectoryInvitees();
	const byEmail = new Map(
		directory.map((row) => [row.email.toLowerCase(), row] as const),
	);
	const matched: DirectoryInvitee[] = [];
	const matchedIds = new Set<string>();
	const unmatched: string[] = [];

	for (const email of params.emails) {
		const hit = byEmail.get(email.trim().toLowerCase());
		if (hit) {
			if (!matchedIds.has(hit.$id)) {
				matched.push(hit);
				matchedIds.add(hit.$id);
			}
		} else {
			unmatched.push(email.trim());
		}
	}

	for (const hint of params.nameHints) {
		const q = normalizeDirectoryHint(hint);
		if (!q) continue;
		// Skip hints that were already resolved as emails.
		if (byEmail.has(q.toLowerCase()) && matchedIds.has(byEmail.get(q.toLowerCase())!.$id)) {
			continue;
		}
		let best: DirectoryInvitee | null = null;
		let bestScore = 0;
		// Score everyone, including people already matched by email — form replies
		// send both "Name" and "email", and the name must not become "unmatched".
		for (const row of directory) {
			const score = scoreDirectoryMatch(row, q);
			if (score > bestScore) {
				bestScore = score;
				best = row;
			}
		}
		if (best && bestScore >= 400) {
			if (!matchedIds.has(best.$id)) {
				matched.push(best);
				matchedIds.add(best.$id);
			}
		} else {
			unmatched.push(q);
		}
	}

	return { matched, unmatched };
}
