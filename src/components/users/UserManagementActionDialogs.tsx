"use client";

import {
	Ban,
	Loader2,
	Save,
	ShieldCheck,
	Trash2,
	UserRound,
} from "lucide-react";
import Image from "next/image";
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
import type { UserManagementUser } from "@/hooks/useUsers";
import { avatarPlaceholderUrl } from "../../../constants";
import { fetcher } from "@/lib/swr-config";
import { useOrganization } from "@/contexts/OrganizationContext";

function isSafeNextImageSrc(src: string): boolean {
	const s = src.trim();
	if (!s) return false;
	if (/^https?:\/\//i.test(s)) return true;
	if (s.startsWith("/") && !s.startsWith("//")) return true;
	return false;
}

function hasCustomAvatar(avatar: string | undefined): boolean {
	const a = avatar?.trim();
	if (!a) return false;
	if (!isSafeNextImageSrc(a)) return false;
	if (a === avatarPlaceholderUrl) return false;
	if (a.includes("avatar-placeholder")) return false;
	return true;
}

export type UserActionKind =
	| "view"
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
	onClose: () => void;
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
	footer: React.ReactNode;
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
				<div className="glass-dialog-footer-wrap">{footer}</div>
			</DialogContent>
		</Dialog>
	);
}

export function UserManagementActionDialogs({
	user,
	action,
	roleOptions,
	busy,
	onClose,
	onSaveEdit,
	onSaveRole,
	onConfirmReset,
	onConfirmRevoke,
	onConfirmSuspend,
	onConfirmDelete,
}: UserManagementActionDialogsProps) {
	const { orgId } = useOrganization();
	const [fullName, setFullName] = useState("");
	const [department, setDepartment] = useState("");
	const [division, setDivision] = useState("");
	const [managerUserId, setManagerUserId] = useState<string>("");
	const [roleName, setRoleName] = useState("");

	const historyUrl =
		user && action === "edit"
			? `/api/users/${user.$id}/org-history`
			: null;
	const { data: historyData } = useSWR<{
		success: boolean;
		data: { history: Array<{ $id: string; changedAt: string; reason?: string; toOrgUnitId?: string }> };
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
	}, [user, action]);

	if (!user || !action) return null;

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
					<div className="flex justify-end">
						<Button
							variant="outline"
							onClick={onClose}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="h-4 w-4" />
							Close
						</Button>
					</div>
				}
			>
				<div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
					<div className="flex items-center gap-3">
						{hasCustomAvatar(user.avatar) ? (
							<div
								className="shrink-0 overflow-hidden rounded-full"
								style={{
									background:
										"linear-gradient(135deg, #12477d 0%, #03afbf 100%)",
									padding: "2px",
									width: "48px",
									height: "48px",
								}}
							>
								<Image
									src={user.avatar!}
									alt=""
									width={44}
									height={44}
									className="h-11 w-11 rounded-full border-2 border-white object-cover"
								/>
							</div>
						) : (
							<Avatar
								name={user.fullName}
								userId={user.$id}
								size="lg"
								className="shrink-0 gap-0"
							/>
						)}
						<div>
							<p className="font-semibold text-slate-900">{user.fullName}</p>
							<p className="text-sm text-slate-600">{user.email}</p>
						</div>
					</div>
					<dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
						<div>
							<dt className="text-slate-500">Role</dt>
							<dd className="font-medium text-slate-800">
								{user.roleName || "Unassigned"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Department</dt>
							<dd className="font-medium text-slate-800">
								{user.department || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Division</dt>
							<dd className="font-medium text-slate-800">
								{user.division || "—"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Assigned by</dt>
							<dd className="font-medium text-slate-800">
								{user.assignedByName || "System"}
							</dd>
						</div>
						<div>
							<dt className="text-slate-500">Status</dt>
							<dd className="font-medium text-slate-800 capitalize">
								{user.status || "active"}
							</dd>
						</div>
					</dl>
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
							variant="outline"
							onClick={onClose}
							disabled={busy}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="h-4 w-4" />
							Cancel
						</Button>
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
									.filter(
										(u: { $id?: string }) => u.$id && u.$id !== user.$id,
									)
									.map((u: { $id: string; fullName?: string; email?: string }) => (
										<SelectItem key={u.$id} value={u.$id}>
											{u.fullName || u.email || u.$id}
										</SelectItem>
									))}
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
							variant="outline"
							onClick={onClose}
							disabled={busy}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="h-4 w-4" />
							Cancel
						</Button>
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
		suspend: {
			title: isSuspended ? "Reactivate account" : "Suspend account",
			body: isSuspended
				? `Reactivate ${user.fullName}'s account?`
				: `Suspend ${user.fullName}? They won't be able to sign in until reactivated.`,
			confirm: isSuspended ? "Reactivate" : "Suspend",
			onConfirm: onConfirmSuspend,
		},
		delete: {
			title: "Delete user",
			body: `Permanently delete ${user.fullName}? This cannot be undone.`,
			confirm: "Delete user",
			onConfirm: onConfirmDelete,
		},
	} as const;

	if (
		action === "reset" ||
		action === "revoke" ||
		action === "suspend" ||
		action === "delete"
	) {
		const cfg = confirmConfig[action];
		return (
			<DialogShell
				open
				onClose={onClose}
				title={cfg.title}
				icon={
					action === "delete" ? (
						<Trash2 className="h-5 w-5 text-red-600" />
					) : (
						<UserRound className="h-5 w-5 text-[#0f5384]" />
					)
				}
				footer={
					<div className="flex items-center justify-end gap-3">
						<Button
							variant="outline"
							onClick={onClose}
							disabled={busy}
							className="primary-btn px-3 sm:px-4"
						>
							<Ban className="h-4 w-4" />
							Cancel
						</Button>
						<Button
							disabled={busy}
							onClick={cfg.onConfirm}
							className="primary-btn px-3 sm:px-4"
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
