"use client";

import { useEffect, useMemo, useState } from "react";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

export interface LookedUpUser {
	$id: string;
	accountId?: string;
	fullName: string;
	imageUrl?: string | null;
}

/**
 * Resolves user ids to people. Records store managers by account id or document
 * id depending on how they were saved, so the result is keyed by both.
 */
export function useUsersByIds(ids: string[]): Map<string, LookedUpUser> {
	const key = useMemo(
		() => [...new Set(ids.filter(Boolean))].sort().join("|"),
		[ids],
	);
	const [users, setUsers] = useState<Map<string, LookedUpUser>>(new Map());

	useEffect(() => {
		if (!key) {
			setUsers(new Map());
			return;
		}
		let cancelled = false;
		fetch("/api/users/get-by-ids", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userIds: key.split("|") }),
		})
			.then((res) => (res.ok ? res.json() : []))
			.then(
				(
					rows: Array<{
						$id?: string;
						accountId?: string;
						fullName?: string;
						email?: string;
						avatar?: string | null;
						profileImageId?: string | null;
					}>,
				) => {
					if (cancelled) return;
					const map = new Map<string, LookedUpUser>();
					for (const row of Array.isArray(rows) ? rows : []) {
						if (!row?.$id) continue;
						const person: LookedUpUser = {
							$id: row.$id,
							accountId: row.accountId,
							fullName: row.fullName || row.email || "User",
							imageUrl: resolveAvatarDisplayUrl({
								avatar: row.avatar,
								profileImageId: row.profileImageId,
							}),
						};
						map.set(row.$id, person);
						if (row.accountId) map.set(row.accountId, person);
					}
					setUsers(map);
				},
			)
			.catch(() => {
				if (!cancelled) setUsers(new Map());
			});
		return () => {
			cancelled = true;
		};
	}, [key]);

	return users;
}
