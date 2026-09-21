"use client";

import type { UserActionKind } from "@/components/users/UserManagementActionDialogs";
import { UserManagementProfileSummary } from "@/components/users/UserManagementProfileSummary";
import { UserManagementRowActions } from "@/components/users/UserManagementRowActions";
import type { UserManagementUser } from "@/hooks/useUsers";

type ActorLike = {
	$id?: string;
	accountId?: string;
} | null;

export function UserAssignmentNodeCard({
	user,
	actor,
	canManageUsers,
	canAssignRoles,
	canImpersonate,
	onAction,
}: {
	user: UserManagementUser;
	actor: ActorLike;
	canManageUsers: boolean;
	canAssignRoles: boolean;
	canImpersonate: boolean;
	onAction: (
		user: UserManagementUser,
		kind: Exclude<UserActionKind, null>,
	) => void;
}) {
	return (
		<div className="relative w-[320px] bg-slate-50 sm:w-[360px]">
			<div className="absolute top-2 right-2 z-10">
				<UserManagementRowActions
					user={user}
					actor={actor}
					canManageUsers={canManageUsers}
					canAssignRoles={canAssignRoles}
					canImpersonate={canImpersonate}
					onAction={onAction}
				/>
			</div>
			<UserManagementProfileSummary
				user={user}
				showLastActive
				reserveMenuSpace
			/>
		</div>
	);
}
