"use client";

import {
	Eye,
	Loader2,
	Pencil,
	Power,
	Save,
	ShieldCheck,
	Trash2,
	TriangleAlert,
	UserRound,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { OrgUnitPicker } from "@/components/settings/OrgUnitPicker";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { UserManagementUser } from "@/hooks/useUsers";
import { MIN_IMPERSONATION_REASON_LENGTH } from "@/lib/impersonation/policy";
import { fetcher } from "@/lib/swr-config";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

function formatLastActiveLabel(iso?: string): string {
	if (!iso) return "—";
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "—";

	const now = Date.now();
	const diffDays = Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) return "Today";
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 30) return `${diffDays} days ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export type UserActionKind =
	| "view"
	| "impersonate"
	| "edit"
	| "role"
	| "reset"
	| "revoke"
	| "suspend"
	| "delete"
	| null;

interface UserManagementActionDialogsProps {
	user: UserManagementUser | null;
	action: UserActionKind;
	roleOptions: string[];
	busy: boolean;
	canManageUsers?: boolean;
	onClose: () => void;
	onOpenAction?: (
		kind: Extract<UserActionKind, "view" | "edit" | "suspend">,
	) => void;
	onSaveEdit: (payload: {
		fullName: string;
		department: string;
		division: string;
		managerUserId: string | null;
	}) => void;
	onSaveRole: (roleName: string) => void;
	onConfirmReset: () => void;
	onConfirmRevoke: () => void;
	onConfirmSuspend: () => void;
	onConfirmDelete: () => void;
	onConfirmImpersonate: (reason: string) => void;
}

function DialogShell({
	open,
	onClose,
	title,
	icon,
	subtitle,
	children,
	footer,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	icon: React.ReactNode;
	subtitle?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="flex max-h-[90vh] max-w-[560px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							{icon}
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								{title}
							</DialogTitle>
						</div>
					</div>
					{subtitle ? (
						<p className="ml-14 mt-1 text-sm text-slate-600">{subtitle}</p>
					) : null}
				</div>
				<div className="glass-dialog-body-padded flex-1 overflow-y-auto">
					{children}
				</div>
				{footer ? (
					<div className="glass-dialog-footer-wrap">{footer}</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

export function UserManagementActionDialogs({
	user,
	action,
	roleOptions,
	busy,
	canManageUsers = false,
	onClose,
	onOpenAction,
	onSaveEdit,
	onSaveRole,
	onConfirmReset,
	onConfirmRevoke,
	onConfirmSuspend,
	onConfirmDelete,
	onConfirmImpersonate,
}: UserManagementActionDialogsProps) {
	const { orgId } = useOrganization();
	const [fullName, setFullName] = useState("");
	const [department, setDepartment] = useState("");
	const [division, setDivision] = useState("");
	const [managerUserId, setManagerUserId] = useState<string>("");
	const [roleName, setRoleName] = useState("");
	const [impersonationReason, setImpersonationReason] = useState("");

	const historyUrl =
		user && action === "edit" ? `/api/users/${user.$id}/org-history` : null;
	const { data: historyData } = useSWR<{
		success: boolean;
		data: {
			history: Array<{
				$id: string;
				changedAt: string;
				reason?: string;
				toOrgUnitId?: string;
			}>;
		};
	}>(historyUrl, fetcher);

	const usersUrl = orgId
		? `/api/users?orgId=${encodeURIComponent(orgId)}`
		: null;
	const { data: orgUsersRaw } = useSWR(usersUrl, fetcher);

	useEffect(() => {
		if (!user) return;
		setFullName(user.fullName || "");
		setDepartment(user.department || "");
		setDivision(user.division || "");
		setManagerUserId(user.managerUserId || "");
		setRoleName(user.roleName || "");
		setImpersonationReason("");
	}, [user, action]);

	if (!user || !action) return null;

	const isSuspended = user.status === "suspended" || user.status === "inactive";

	if (action === "view") {
		const statusLabel = isSuspended ? "Deactivated" : "Active";
		const statusBadgeClass = isSuspended
			? "bg-orange/10 text-orange border-orange/20"
			: "bg-green/10 text-green border-green/20";
		const emptyOrgLabel = "Not assigned";

		return (
			<DialogShell
				open
				onClose={onClose}
				title="User profile"
				icon={<UserRound className="h-5 w-5 text-[#0f5384]" />}
				subtitle={user.email}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							type="button"
							disabled={busy || !canManageUsers}
							onClick={() => onOpenAction?.("suspend")}
							className={
								isSuspended
									? "primary-btn px-3 sm:px-4"
									: "delete-btn px-3 sm:px-4"
							}
						>
							<Power className="h-4 w-4" />
							{isSuspended ? "Reactivate" : "Deactivate"}
						</Button>
						<Button
							type="button"
							disabled={busy || !canManageUsers}
							onClick={() => onOpenAction?.("edit")}
							className="primary-btn px-3 sm:px-4"
						>
							<Pencil className="h-4 w-4" />
							Edit user
						</Button>
					</div>
				}
			>
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
							<p className="truncate font-semibold text-slate-700">
								{user.fullName}
							</p>
							<p className="truncate text-sm text-slate-600">{user.email}</p>
							<span
								className={`mt-2 inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${statusBadgeClass}`}
							>
								{statusLabel}
							</span>
						</div>
					</div>
					<dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-4 text-sm">
						<div>
							<dt className="text-slate-500">Role</dt>
							<dd className="font-medium text-slate-700">
								{user.roleName || "Unassigned"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Department</dt>
							<dd className="font-medium text-slate-700">
								{user.department?.trim() || emptyOrgLabel}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Division</dt>
							<dd className="font-medium text-slate-700">
								{user.division?.trim() || emptyOrgLabel}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Assigned by</dt>
							<dd className="font-medium text-slate-700">
								{user.assignedByName || "System"}
							</dd>
						</div>
					</dl>
				</div>
			</DialogShell>
		);
	}

	if (action === "impersonate") {
		const reasonReady =
			impersonationReason.trim().length >= MIN_IMPERSONATION_REASON_LENGTH;
		return (
			<DialogShell
				open
				onClose={onClose}
				title="View as user"
				icon={<Eye className="h-5 w-5 text-[#0f5384]" />}
				subtitle={`You will browse CAALM as ${user.fullName}. Your admin session stays signed in.`}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							disabled={busy || !reasonReady}
							onClick={() => onConfirmImpersonate(impersonationReason.trim())}
							className="primary-btn px-3 sm:px-4"
							data-impersonation-allow=""
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Eye className="h-4 w-4" />
							)}
							View as {user.fullName}
						</Button>
					</div>
				}
			>
				<div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
					<p className="text-sm text-slate-700">
						This session is read-only, time-boxed, and written to the audit log.
						You cannot impersonate another admin or nest sessions.
					</p>
					<div>
						<Label
							htmlFor="impersonation-reason"
							className="mb-1 text-sm text-slate-700"
						>
							Reason (ticket ID or note)
						</Label>
						<Textarea
							id="impersonation-reason"
							value={impersonationReason}
							onChange={(e) => setImpersonationReason(e.target.value)}
							placeholder="TKT-2026-0042: reproduce missing contracts"
							disabled={busy}
							className="min-h-[96px] resize-y"
						/>
						<p className="mt-1 text-xs text-slate-500">
							At least {MIN_IMPERSONATION_REASON_LENGTH} characters. Required
							before step-up authentication.
						</p>
					</div>
				</div>
			</DialogShell>
		);
	}

	if (action === "edit") {
		return (
			<DialogShell
				open
				onClose={onClose}
				title="Edit user details"
				icon={<UserRound className="h-5 w-5 text-[#0f5384]" />}
				subtitle={user.email}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							disabled={busy || !fullName.trim()}
							onClick={() =>
								onSaveEdit({
									fullName: fullName.trim(),
									department,
									division,
									managerUserId: managerUserId || null,
								})
							}
							className="primary-btn px-3 sm:px-4"
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Save
						</Button>
					</div>
				}
			>
				<div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
					<div>
						<Label className="mb-1 text-sm text-slate-700">Full name</Label>
						<Input
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							className="bg-white"
						/>
					</div>
					<OrgUnitPicker
						orgId={orgId || "default_organization"}
						departmentCode={department}
						divisionCode={division}
						onDepartmentChange={setDepartment}
						onDivisionChange={setDivision}
						disabled={busy}
					/>
					<div>
						<Label className="mb-1 text-sm text-slate-700">Manager</Label>
						<Select
							value={managerUserId || "__none"}
							onValueChange={(v) => setManagerUserId(v === "__none" ? "" : v)}
						>
							<SelectTrigger className="bg-white cursor-pointer">
								<SelectValue placeholder="Select manager" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none">None</SelectItem>
								{(Array.isArray(orgUsersRaw) ? orgUsersRaw : [])
									.filter((u: { $id?: string }) => u.$id && u.$id !== user.$id)
									.map(
										(u: { $id: string; fullName?: string; email?: string }) => (
											<SelectItem key={u.$id} value={u.$id}>
												{u.fullName || u.email || u.$id}
											</SelectItem>
										),
									)}
							</SelectContent>
						</Select>
					</div>
					{historyData?.data?.history?.length ? (
						<div>
							<p className="text-sm font-medium text-slate-800 mb-2">
								Org placement history
							</p>
							<ul className="space-y-1 text-xs text-slate-600 max-h-32 overflow-y-auto">
								{historyData.data.history.map((h) => (
									<li key={h.$id} className="border-b border-slate-100 py-1">
										{new Date(h.changedAt).toLocaleString()}
										{h.reason ? ` — ${h.reason}` : ""}
									</li>
								))}
							</ul>
						</div>
					) : null}
				</div>
			</DialogShell>
		);
	}

	if (action === "role") {
		return (
			<DialogShell
				open
				onClose={onClose}
				title="Change role"
				icon={<ShieldCheck className="h-5 w-5 text-[#0f5384]" />}
				subtitle={`Assign a role for ${user.fullName}`}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							disabled={busy || !roleName}
							onClick={() => onSaveRole(roleName)}
							className="primary-btn px-3 sm:px-4"
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Save className="h-4 w-4" />
							)}
							Update role
						</Button>
					</div>
				}
			>
				<div className="rounded-lg border border-slate-200 bg-white p-4">
					<Label className="mb-1 text-sm text-slate-700">Role</Label>
					<p className="mb-2 text-xs text-slate-500">
						A role sets this user&apos;s access. Permissions come from the role,
						not from this dialog.
					</p>
					<Select value={roleName} onValueChange={setRoleName}>
						<SelectTrigger className="bg-white">
							<SelectValue placeholder="Select role" />
						</SelectTrigger>
						<SelectContent>
							{roleOptions.map((role) => (
								<SelectItem key={role} value={role}>
									{role}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</DialogShell>
		);
	}

	const confirmConfig = {
		reset: {
			title: "Reset password",
			body: `Send a password reset email to ${user.email}?`,
			confirm: "Send reset email",
			onConfirm: onConfirmReset,
		},
		revoke: {
			title: "Revoke sessions",
			body: `Sign ${user.fullName} out of all devices?`,
			confirm: "Revoke sessions",
			onConfirm: onConfirmRevoke,
		},
	} as const;

	if (action === "delete") {
		return (
			<Dialog open onOpenChange={(next) => !next && onClose()}>
				<DialogContent
					className="flex max-h-[90vh] max-w-[440px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl"
					variant="destructive"
				>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="mt-4 flex items-start gap-3 border-b border-slate-200/80 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red/20 bg-red/10">
							<Trash2 className="h-4 w-4 text-red" aria-hidden />
						</div>
						<div className="min-w-0 pt-0.5">
							<DialogTitle className="text-lg font-semibold sidebar-gradient-text">
								Delete user
							</DialogTitle>
							<p className="mt-0.5 text-xs text-slate-600">
								This action is permanent and cannot be undone.
							</p>
						</div>
					</div>

					<div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-6 py-4">
						<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
							<Avatar
								name={user.fullName}
								userId={user.$id}
								size="md"
								className="shrink-0 gap-0"
								imageUrl={resolveAvatarDisplayUrl(user)}
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold text-slate-700">
									{user.fullName}
								</p>
								<p className="truncate text-xs text-slate-600">{user.email}</p>
								<div className="mt-1.5 flex flex-wrap gap-4">
									<div>
										<p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
											Role
										</p>
										<p className="text-xs font-semibold text-slate-800">
											{user.roleName || "Unassigned"}
										</p>
									</div>
									<div>
										<p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
											Last active
										</p>
										<p className="text-xs font-semibold text-slate-800">
											{formatLastActiveLabel(
												user.lastActiveAt || user.$updatedAt,
											)}
										</p>
									</div>
								</div>
							</div>
						</div>

						<div className="flex gap-2.5 rounded-lg border border-red/20 bg-red/10 p-3">
							<TriangleAlert
								className="mt-0.5 h-4 w-4 shrink-0 text-red"
								aria-hidden
							/>
							<p className="text-xs leading-relaxed text-slate-800">
								Removing{" "}
								<span className="font-semibold text-slate-700">
									{user.fullName}
								</span>{" "}
								revokes their CAALM access immediately and unassigns them from
								all active tasks and contracts.
							</p>
						</div>
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
						<Button
							type="button"
							disabled={busy}
							onClick={onConfirmDelete}
							className="delete-btn gap-2 px-3 sm:px-4"
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
							) : (
								<Trash2 className="h-4 w-4" aria-hidden />
							)}
							Delete user
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		);
	}

	if (action === "suspend") {
		return (
			<DialogShell
				open
				onClose={onClose}
				title={isSuspended ? "Reactivate account" : "Deactivate account"}
				icon={<Power className="h-5 w-5 text-[#0f5384]" />}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							type="button"
							disabled={busy}
							onClick={() => onOpenAction?.("view")}
							className="primary-btn cursor-pointer px-3 sm:px-4"
						>
							<X className="h-4 w-4" />
							Cancel
						</Button>
						<Button
							type="button"
							disabled={busy}
							onClick={onConfirmSuspend}
							className={
								isSuspended
									? "primary-btn cursor-pointer px-3 sm:px-4"
									: "delete-btn cursor-pointer px-3 sm:px-4"
							}
						>
							{busy ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Power className="h-4 w-4" />
							)}
							{isSuspended ? "Reactivate" : "Deactivate"}
						</Button>
					</div>
				}
			>
				<div className="space-y-4">
					<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
						<Avatar
							name={user.fullName}
							userId={user.$id}
							size="md"
							className="shrink-0 gap-0"
							imageUrl={resolveAvatarDisplayUrl(user)}
						/>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-700">
								{user.fullName}
							</p>
							<p className="truncate text-xs text-slate-600">{user.email}</p>
						</div>
					</div>
					<p className="text-sm leading-relaxed text-slate-700">
						{isSuspended
							? "They'll be able to sign in again. This does not change their data or history."
							: (
								<>
									They won&apos;t be able to sign in until an admin reactivates
									the account.{" "}
									<span className="font-bold">
										This does not delete their data or history.
									</span>
								</>
							)}
					</p>
				</div>
			</DialogShell>
		);
	}

	if (action === "reset" || action === "revoke") {
		const cfg = confirmConfig[action];
		return (
			<DialogShell
				open
				onClose={onClose}
				title={cfg.title}
				icon={<UserRound className="h-5 w-5 text-[#0f5384]" />}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							disabled={busy}
							onClick={cfg.onConfirm}
							className="primary-btn cursor-pointer px-3 sm:px-4"
						>
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							{cfg.confirm}
						</Button>
					</div>
				}
			>
				<p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
					{cfg.body}
				</p>
			</DialogShell>
		);
	}

	return null;
}
