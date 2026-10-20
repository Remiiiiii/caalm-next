"use client";

import { useEffect, useState } from "react";
import type { TaskPerson } from "@/components/tasks/task-ui";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

/**
 * Org directory shaped for TaskAssigneePicker. Loads only when `enabled`.
 * `idField` picks which id a person carries: tasks use the document id, while
 * contract / license managers are stored by account id.
 */
export function useTaskPeople(
	enabled: boolean,
	idField: "$id" | "accountId" = "$id",
): TaskPerson[] {
	const [people, setPeople] = useState<TaskPerson[]>([]);

	useEffect(() => {
		if (!enabled) return;
		let cancelled = false;
		fetch("/api/users/directory")
			.then((r) => (r.ok ? r.json() : []))
			.then(
				(
					users: Array<{
						$id?: string;
						accountId?: string | null;
						fullName?: string;
						email?: string;
						department?: string;
						division?: string | null;
						avatar?: string | null;
						profileImageId?: string | null;
					}>,
				) => {
					if (cancelled) return;
					const list = (Array.isArray(users) ? users : []).map((u) => {
						const department = u.department || "Other";
						const division = u.division || null;
						return {
							id: (idField === "accountId" ? u.accountId : u.$id) || "",
							name: u.fullName || u.email || "User",
							imageUrl: resolveAvatarDisplayUrl({
								avatar: u.avatar,
								profileImageId: u.profileImageId,
							}),
							subtitle:
								[department, division].filter(Boolean).join(" · ") || null,
							department,
							division,
						};
					});
					setPeople(list.filter((p) => p.id));
				},
			)
			.catch(() => {
				if (!cancelled) setPeople([]);
			});
		return () => {
			cancelled = true;
		};
	}, [enabled, idField]);

	return people;
}
