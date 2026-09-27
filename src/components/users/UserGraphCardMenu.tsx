"use client";

import { Eye, Pencil, Power, ShieldCheck } from "lucide-react";
import Image from "next/image";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserActionKind } from "@/components/users/UserManagementActionDialogs";
import type { UserManagementUser } from "@/hooks/useUsers";
import { isSameUserIdentity } from "@/lib/impersonation/policy";

type ActorLike = {
	$id?: string;
	accountId?: string;
} | null;

export function UserGraphCardMenu({
	user,
	actor,
	canView,
	canEdit,
	canDeactivate,
	canAssignRoles,
	canImpersonate,
	onAction,
}: {
	user: UserManagementUser;
	actor?: ActorLike;
	canView: boolean;
	canEdit: boolean;
	canDeactivate: boolean;
	canAssignRoles: boolean;
	canImpersonate: boolean;
	onAction: (
		user: UserManagementUser,
		kind: Exclude<UserActionKind, null>,
	) => void;
}) {
	const isSuspended =
		user.status === "suspended" || user.status === "inactive";
	const viewingSelf = isSameUserIdentity(
		{
			$id: actor?.$id,
			accountId: actor?.accountId || actor?.$id,
		},
		{
			$id: user.$id,
			accountId: user.accountId,
		},
	);
	const showImpersonate = canImpersonate && !viewingSelf;

	if (
		!canView &&
		!canEdit &&
		!canDeactivate &&
		!canAssignRoles &&
		!showImpersonate
	) {
		return null;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className="nodrag nopan shad-no-focus rounded-full transition-colors hover:bg-white/30"
				aria-label={`Actions for ${user.fullName}`}
			>
				<Image src="/assets/icons/dots.svg" alt="" width={34} height={34} />
			</DropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="min-w-45">
				{canView ? (
					<AppDropdownMenuItem
						icon={Eye}
						onSelect={() => onAction(user, "view")}
					>
						View profile
					</AppDropdownMenuItem>
				) : null}
				{canEdit ? (
					<AppDropdownMenuItem
						icon={Pencil}
						onSelect={() => onAction(user, "edit")}
					>
						Update
					</AppDropdownMenuItem>
				) : null}
				{showImpersonate ? (
					<AppDropdownMenuItem
						icon={Eye}
						onSelect={() => onAction(user, "impersonate")}
					>
						View as user
					</AppDropdownMenuItem>
				) : null}
				{canAssignRoles ? (
					<AppDropdownMenuItem
						icon={ShieldCheck}
						onSelect={() => onAction(user, "role")}
					>
						Assign roles
					</AppDropdownMenuItem>
				) : null}
				{canDeactivate ? (
					<>
						<DropdownMenuSeparator />
						<AppDropdownMenuItem
							icon={Power}
							tone="danger"
							onSelect={() => onAction(user, "suspend")}
						>
							{isSuspended ? "Reactivate" : "Deactivate"}
						</AppDropdownMenuItem>
					</>
				) : null}
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}
