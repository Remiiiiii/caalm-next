/** Match workflow assignees when Auth accountId and users-table $id both appear. */

export function uniqueIdentityIds(
	ids: Array<string | undefined | null>,
): string[] {
	return [
		...new Set(ids.filter((id): id is string => !!id && id.trim().length > 0)),
	];
}

export function userIdentityKeys(user: {
	$id?: string;
	accountId?: string;
}): string[] {
	return uniqueIdentityIds([user.accountId, user.$id]);
}

export function isAssigneeMatch(
	assigneeUserIds: string[] | undefined,
	viewerIds: Array<string | undefined | null>,
): boolean {
	const assignees = new Set(uniqueIdentityIds(assigneeUserIds || []));
	if (assignees.size === 0) return false;
	return uniqueIdentityIds(viewerIds).some((id) => assignees.has(id));
}
