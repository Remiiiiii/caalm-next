"use client";

import {
	Eye,
	KeyRound,
	LogOut,
	ShieldCheck,
	UserRound,
	UserX,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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

export function UserManagementRowActions({
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

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="ml-auto h-8 w-8 border-0 bg-transparent p-0 text-slate-500 shadow-none shad-no-focus hover:bg-transparent hover:text-[#0f5384] focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label={`Actions for ${user.fullName}`}
				>
					<Image
						src="/assets/icons/dots.svg"
						alt=""
						width={24}
						height={24}
						className="h-6 w-6"
					/>
				</Button>
			</DropdownMenuTrigger>
			<AppDropdownMenuContent align="end" className="min-w-[230px]">
				<AppDropdownMenuItem
					icon={UserRound}
					onSelect={() => onAction(user, "view")}
				>
					View profile
				</AppDropdownMenuItem>
				<AppDropdownMenuItem
					icon={Eye}
					disabled={!canImpersonate || viewingSelf}
					onSelect={() => onAction(user, "impersonate")}
				>
					View as user
				</AppDropdownMenuItem>
				<AppDropdownMenuItem
					icon={ShieldCheck}
					disabled={!canAssignRoles}
					onSelect={() => onAction(user, "role")}
				>
					Change role
				</AppDropdownMenuItem>
				<AppDropdownMenuItem
					icon={KeyRound}
					disabled={!canManageUsers}
					onSelect={() => onAction(user, "reset")}
				>
					Reset password
				</AppDropdownMenuItem>
				<AppDropdownMenuItem
					icon={LogOut}
					disabled={!canManageUsers}
					onSelect={() => onAction(user, "revoke")}
				>
					Revoke active sessions
				</AppDropdownMenuItem>
				<DropdownMenuSeparator />
				<AppDropdownMenuItem
					icon={UserX}
					tone="danger"
					disabled={!canManageUsers}
					onSelect={() => onAction(user, "delete")}
				>
					Delete user
				</AppDropdownMenuItem>
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}
