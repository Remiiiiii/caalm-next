"use client";

import Avatar from "@/components/ui/avatar";
import type { UserManagementUser } from "@/hooks/useUsers";
import { formatUserLastActiveLabel } from "@/lib/users/user-management-display";
import { cn, resolveAvatarDisplayUrl } from "@/lib/utils";

function FieldValue({
	value,
	emptyLabel,
}: {
	value?: string | null;
	emptyLabel: string;
}) {
	const filled = Boolean(value?.trim());
	return (
		<dd
			className={cn(
				"font-medium",
				filled ? "text-slate-700" : "text-slate-400",
			)}
		>
			{filled ? value : emptyLabel}
		</dd>
	);
}

export function UserManagementProfileSummary({
	user,
	showLastActive = false,
	reserveMenuSpace = false,
}: {
	user: UserManagementUser;
	showLastActive?: boolean;
	reserveMenuSpace?: boolean;
}) {
	const isSuspended = user.status === "suspended" || user.status === "inactive";
	const statusLabel = isSuspended ? "Deactivated" : "Active";
	const statusBadgeClass = isSuspended
		? "bg-orange/10 text-orange border-orange/20"
		: "bg-green/10 text-green border-green/20";
	const emptyOrgLabel = "Not assigned";

	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
			<div className="flex items-center gap-3">
				<Avatar
					name={user.fullName}
					userId={user.$id}
					size="lg"
					className="shrink-0 gap-0"
					imageUrl={resolveAvatarDisplayUrl(user)}
				/>
				<div className="min-w-0">
					<p
						className={cn(
							"truncate font-semibold text-slate-700",
							reserveMenuSpace && "pr-8",
						)}
					>
						{user.fullName}
					</p>
					<p
						className={cn(
							"truncate text-sm text-slate-600",
							reserveMenuSpace && "pr-8",
						)}
					>
						{user.email}
					</p>
					<span
						className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass}`}
					>
						{statusLabel}
					</span>
					{showLastActive ? (
						<p className="mt-1.5 text-xs text-slate-500">
							Last active{" "}
							{formatUserLastActiveLabel(user.lastActiveAt || user.$updatedAt)}
						</p>
					) : null}
				</div>
			</div>
			<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-4 text-sm">
				<div>
					<dt className="text-slate-500">Role</dt>
					<FieldValue value={user.roleName} emptyLabel="Unassigned" />
				</div>
				<div>
					<dt className="text-slate-500">Department</dt>
					<FieldValue value={user.department} emptyLabel={emptyOrgLabel} />
				</div>
				<div>
					<dt className="text-slate-500">Division</dt>
					<FieldValue value={user.division} emptyLabel={emptyOrgLabel} />
				</div>
				<div>
					<dt className="text-slate-500">Assigned by</dt>
					<dd className="font-medium text-slate-700">
						{user.assignedByName || "System"}
					</dd>
				</div>
			</dl>
		</div>
	);
}
