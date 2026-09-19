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
import { UserManagementProfileSummary } from "@/components/users/UserManagementProfileSummary";
import { useOrganization } from "@/contexts/OrganizationContext";
import type { UserManagementUser } from "@/hooks/useUsers";
import type { CostCenter } from "@/lib/database/schemas/org-units.schema";
import { MIN_IMPERSONATION_REASON_LENGTH } from "@/lib/impersonation/policy";
import { fetcher } from "@/lib/swr-config";
import { formatUserLastActiveLabel } from "@/lib/users/user-management-display";
import { resolveAvatarDisplayUrl } from "@/lib/utils";

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
	selectedUsers?: UserManagementUser[];
	onClose: () => void;
	onOpenAction?: (
		kind: Extract<UserActionKind, "view" | "edit" | "suspend">,
	) => void;
	onSaveEdit: (payload: {
		fullName: string;
		department: string;
		division: string;
		managerUserId: string | null;
		jobTitle: string | null;
		workLocation: string | null;
		costCenterId: string | null;
		matrixManagerUserId: string | null;
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
	selectedUsers,
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
	const [jobTitle, setJobTitle] = useState("");
	const [workLocation, setWorkLocation] = useState("");
	const [costCenterId, setCostCenterId] = useState<string>("");
	const [matrixManagerUserId, setMatrixManagerUserId] = useState<string>("");
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
	const costCentersUrl =
		orgId && action === "edit"
			? `/api/cost-centers?orgId=${encodeURIComponent(orgId)}&includeInactive=true`
			: null;
	const { data: costCentersPayload } = useSWR<{
		success: boolean;
		data: { costCenters: CostCenter[] };
	}>(costCentersUrl, fetcher);

	useEffect(() => {
		if (!user) return;
		setFullName(user.fullName || "");
		setDepartment(user.department || "");
		setDivision(user.division || "");
		setManagerUserId(user.managerUserId || "");
		setJobTitle(user.jobTitle || "");
		setWorkLocation(user.workLocation || "");
		setCostCenterId(user.costCenterId || "");
		setMatrixManagerUserId(user.matrixManagerUserId || "");
		setRoleName(
			selectedUsers && selectedUsers.length > 1 ? "" : user.roleName || "",
		);
		setImpersonationReason("");
	}, [user, action, selectedUsers]);

	if (!user || !action) return null;

	const targets =
		selectedUsers && selectedUsers.length > 0 ? selectedUsers : [user];
	const isBulk = targets.length > 1;
	const bulkLabel = `${targets.length} selected users`;
	const isSuspended = user.status === "suspended" || user.status === "inactive";

	if (action === "view") {
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
				<UserManagementProfileSummary user={user} />
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
		const orgUsers = (
			Array.isArray(orgUsersRaw) ? orgUsersRaw : []
		) as Array<{ $id: string; fullName?: string; email?: string }>;
		const costCenters = costCentersPayload?.data?.costCenters ?? [];
		const matrixConflictsWithManager = Boolean(
			managerUserId &&
				matrixManagerUserId &&
				managerUserId === matrixManagerUserId,
		);
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
							disabled={
								busy || !fullName.trim() || matrixConflictsWithManager
							}
							onClick={() =>
								onSaveEdit({
									fullName: fullName.trim(),
									department,
									division,
									managerUserId: managerUserId || null,
									jobTitle: jobTitle.trim() || null,
									workLocation: workLocation.trim() || null,
									costCenterId: costCenterId || null,
									matrixManagerUserId: matrixManagerUserId || null,
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
					<div>
						<Label className="mb-1 text-sm text-slate-700">Job title</Label>
						<Input
							value={jobTitle}
							onChange={(e) => setJobTitle(e.target.value)}
							placeholder="Chief Financial Officer"
							maxLength={128}
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
						<Label className="mb-1 text-sm text-slate-700">Location</Label>
						<Input
							value={workLocation}
							onChange={(e) => setWorkLocation(e.target.value)}
							placeholder="Austin office"
							maxLength={128}
							className="bg-white"
						/>
					</div>
					<div>
						<Label className="mb-1 text-sm text-slate-700">Cost center</Label>
						<Select
							value={costCenterId || "__none"}
							onValueChange={(v) => setCostCenterId(v === "__none" ? "" : v)}
						>
							<SelectTrigger className="cursor-pointer bg-white">
								<SelectValue placeholder="Select cost center" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none">None</SelectItem>
								{costCenters.map((center) => (
									<SelectItem key={center.$id} value={center.$id}>
										{center.code} — {center.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="mb-1 text-sm text-slate-700">Manager</Label>
						<Select
							value={managerUserId || "__none"}
							onValueChange={(v) => setManagerUserId(v === "__none" ? "" : v)}
						>
							<SelectTrigger className="cursor-pointer bg-white">
								<SelectValue placeholder="Select manager" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none">None</SelectItem>
								{orgUsers
									.filter((u) => u.$id && u.$id !== user.$id)
									.map((u) => (
										<SelectItem key={u.$id} value={u.$id}>
											{u.fullName || u.email || u.$id}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label className="mb-1 text-sm text-slate-700">
							Matrix manager
						</Label>
						<Select
							value={matrixManagerUserId || "__none"}
							onValueChange={(v) =>
								setMatrixManagerUserId(v === "__none" ? "" : v)
							}
						>
							<SelectTrigger className="cursor-pointer bg-white">
								<SelectValue placeholder="Select matrix manager" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none">None</SelectItem>
								{orgUsers
									.filter((u) => u.$id && u.$id !== user.$id)
									.map((u) => (
										<SelectItem key={u.$id} value={u.$id}>
											{u.fullName || u.email || u.$id}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						{matrixConflictsWithManager ? (
							<p className="mt-1 text-xs text-red">
								Matrix manager must be different from the solid-line manager.
							</p>
						) : (
							<p className="mt-1 text-xs text-slate-500">
								Dotted-line manager. Shown on the reporting diagram only.
							</p>
						)}
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
				subtitle={
					isBulk
						? `Assign a role for ${bulkLabel}`
						: `Assign a role for ${user.fullName}`
				}
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
						{isBulk
							? "A role sets access for every selected user. Permissions come from the role, not from this dialog."
							: "A role sets this user's access. Permissions come from the role, not from this dialog."}
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
			body: isBulk
				? `Sign ${bulkLabel} out of all devices?`
				: `Sign ${user.fullName} out of all devices?`,
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
								{isBulk ? "Delete users" : "Delete user"}
							</DialogTitle>
							<p className="mt-0.5 text-xs text-slate-600">
								This action is permanent and cannot be undone.
							</p>
						</div>
					</div>

					<div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-6 py-4">
						{isBulk ? (
							<div className="rounded-lg border border-slate-200 bg-white p-3">
								<p className="text-sm font-semibold text-slate-700">
									{targets.length} users selected
								</p>
								<ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600">
									{targets.slice(0, 8).map((item) => (
										<li key={item.$id} className="truncate">
											{item.fullName}
										</li>
									))}
									{targets.length > 8 ? (
										<li>and {targets.length - 8} more</li>
									) : null}
								</ul>
							</div>
						) : (
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
												{formatUserLastActiveLabel(
													user.lastActiveAt || user.$updatedAt,
												)}
											</p>
										</div>
									</div>
								</div>
							</div>
						)}

						<div className="flex gap-2.5 rounded-lg border border-red/20 bg-red/10 p-3">
							<TriangleAlert
								className="mt-0.5 h-4 w-4 shrink-0 text-red"
								aria-hidden
							/>
							<p className="text-xs leading-relaxed text-slate-800">
								{isBulk ? (
									<>
										Removing these users revokes their CAALM access immediately
										and unassigns them from all active tasks and contracts.
									</>
								) : (
									<>
										Removing{" "}
										<span className="font-semibold text-slate-700">
											{user.fullName}
										</span>{" "}
										revokes their CAALM access immediately and unassigns them
										from all active tasks and contracts.
									</>
								)}
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
							{isBulk ? "Delete users" : "Delete user"}
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
						{isSuspended ? (
							"They'll be able to sign in again. This does not change their data or history."
						) : (
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
