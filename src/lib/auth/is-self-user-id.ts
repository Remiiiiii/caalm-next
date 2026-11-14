/**
 * True when `id` names the signed-in user. Client components get the Appwrite
 * account (`$id` = Auth account id) while server code gets the users-table row,
 * and the two ids differ (rows are created with ID.unique()). Accept either.
 */
export function isSelfUserId(
	id: string | null | undefined,
	user: { $id: string; accountId?: string | null },
): boolean {
	if (!id) return false;
	return id === user.$id || (!!user.accountId && id === user.accountId);
}
