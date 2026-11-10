"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { PendingInvitationsBulkBar } from "@/components/dashboard/PendingInvitationsBulkBar";
import { PendingInvitationsDataTable } from "@/components/dashboard/PendingInvitationsDataTable";
import {
	formatInvitationRole,
	type PendingInvitationRow,
} from "@/components/dashboard/pending-invitations-types";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	ConfirmDialog,
	formatConfirmDate,
} from "@/components/ui/confirm-dialog";
import { MailClock } from "@/components/ui/mail-clock-icon";
import { MetricStatDotsBackdrop } from "@/components/ui/metric-stat-card";
import { StatCardIcon } from "@/components/ui/stat-card-icon";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ConfirmTarget = {
	token: string;
	email: string;
	role?: string;
	invitedAt?: string;
	invitedBy?: string;
	expiresAt?: string;
};

function toConfirmTarget(inv: PendingInvitationRow): ConfirmTarget {
	return {
		token: inv.token,
		email: inv.email,
		role: inv.role,
		invitedAt: inv.$createdAt,
		invitedBy: inv.invitedBy,
		expiresAt: inv.expiresAt,
	};
}

function invitationConfirmRows(target: ConfirmTarget | null) {
	if (!target) return [];
	const invitedDate = formatConfirmDate(target.invitedAt);
	const invitedValue = invitedDate
		? target.invitedBy?.trim()
			? `${invitedDate} by ${target.invitedBy.trim()}`
			: invitedDate
		: null;
	const lapsesDate = formatConfirmDate(target.expiresAt);
	const role = formatInvitationRole(target.role);
	return [
		...(target.email
			? [{ label: "Person", value: target.email, lead: true as const }]
			: []),
		...(role !== "—" ? [{ label: "Role", value: role }] : []),
		...(invitedValue ? [{ label: "Invited", value: invitedValue }] : []),
		...(lapsesDate
			? [{ label: "Lapses", value: `${lapsesDate} if not accepted` }]
			: []),
	];
}

export function PendingInvitationsCard({
	invitations,
	isLoading = false,
	addingTokens,
	onResend,
	onRevoke,
	onDelete,
	variant = "executive",
	className,
}: {
	invitations: PendingInvitationRow[];
	isLoading?: boolean;
	addingTokens?: Set<string>;
	onResend: (token: string) => Promise<void>;
	onRevoke: (token: string) => Promise<void>;
	onDelete: (token: string) => Promise<void>;
	variant?: "executive" | "admin";
	className?: string;
}) {
	const { toast } = useToast();
	const cardRef = useRef<HTMLDivElement>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [busyToken, setBusyToken] = useState<string | null>(null);
	const [bulkBusy, setBulkBusy] = useState(false);
	const [removingTokens, setRemovingTokens] = useState<Set<string>>(new Set());

	const [revokeTarget, setRevokeTarget] = useState<ConfirmTarget | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<ConfirmTarget | null>(null);
	const [bulkRevokeOpen, setBulkRevokeOpen] = useState(false);
	const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

	const selectedRows = useMemo(
		() => invitations.filter((inv) => selectedIds.has(inv.$id)),
		[invitations, selectedIds],
	);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	const markRemoving = useCallback((token: string) => {
		setRemovingTokens((prev) => new Set(prev).add(token));
		setTimeout(() => {
			setRemovingTokens((prev) => {
				const next = new Set(prev);
				next.delete(token);
				return next;
			});
		}, 300);
	}, []);

	const handleToggle = useCallback((id: string, checked: boolean) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (checked) next.add(id);
			else next.delete(id);
			return next;
		});
	}, []);

	const handleToggleAll = useCallback(
		(checked: boolean) => {
			setSelectedIds(
				checked ? new Set(invitations.map((inv) => inv.$id)) : new Set(),
			);
		},
		[invitations],
	);

	const handleResendOne = useCallback(
		async (inv: PendingInvitationRow) => {
			setBusyToken(inv.token);
			try {
				await onResend(inv.token);
				toast({
					title: "Invitation resent",
					description: `A new invite was sent to ${inv.email}.`,
				});
			} catch (error) {
				toast({
					title: "Error",
					description:
						error instanceof Error
							? error.message
							: "Failed to resend invitation",
					variant: "destructive",
				});
			} finally {
				setBusyToken(null);
			}
		},
		[onResend, toast],
	);

	const confirmRevokeOne = useCallback(async () => {
		const token = revokeTarget?.token;
		if (!token) return;
		setBusyToken(token);
		markRemoving(token);
		try {
			await onRevoke(token);
			setSelectedIds((prev) => {
				const row = invitations.find((i) => i.token === token);
				if (!row) return prev;
				const next = new Set(prev);
				next.delete(row.$id);
				return next;
			});
			toast({
				title: "Invitation revoked",
				description: "The invitation has been successfully revoked.",
			});
			setRevokeTarget(null);
		} catch (error) {
			throw error instanceof Error
				? error
				: new Error("Failed to revoke invitation. Please try again.");
		} finally {
			setBusyToken(null);
		}
	}, [invitations, markRemoving, onRevoke, revokeTarget, toast]);

	const confirmDeleteOne = useCallback(async () => {
		const token = deleteTarget?.token;
		if (!token) return;
		setBusyToken(token);
		markRemoving(token);
		try {
			await onDelete(token);
			setSelectedIds((prev) => {
				const row = invitations.find((i) => i.token === token);
				if (!row) return prev;
				const next = new Set(prev);
				next.delete(row.$id);
				return next;
			});
			toast({
				title: "Invitation deleted",
				description: "The invitation has been permanently deleted.",
			});
			setDeleteTarget(null);
		} catch (error) {
			throw error instanceof Error
				? error
				: new Error("Failed to delete invitation. Please try again.");
		} finally {
			setBusyToken(null);
		}
	}, [deleteTarget, invitations, markRemoving, onDelete, toast]);

	const runBulkResend = useCallback(async () => {
		if (selectedRows.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		let fail = 0;
		for (const inv of selectedRows) {
			try {
				await onResend(inv.token);
				ok += 1;
			} catch {
				fail += 1;
			}
		}
		setBulkBusy(false);
		clearSelection();
		if (fail === 0) {
			toast({
				title: "Invitations resent",
				description: `Resent ${ok} invitation${ok === 1 ? "" : "s"}.`,
			});
		} else {
			toast({
				variant: "destructive",
				title: "Some invites failed",
				description: `Resent ${ok}, failed ${fail}.`,
			});
		}
	}, [clearSelection, onResend, selectedRows, toast]);

	const confirmBulkRevoke = useCallback(async () => {
		if (selectedRows.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		let fail = 0;
		for (const inv of selectedRows) {
			markRemoving(inv.token);
			try {
				await onRevoke(inv.token);
				ok += 1;
			} catch {
				fail += 1;
			}
		}
		setBulkBusy(false);
		setBulkRevokeOpen(false);
		clearSelection();
		if (fail === 0) {
			toast({
				title: "Invitations revoked",
				description: `Revoked ${ok} invitation${ok === 1 ? "" : "s"}.`,
			});
		} else {
			toast({
				variant: "destructive",
				title: "Some revokes failed",
				description: `Revoked ${ok}, failed ${fail}.`,
			});
		}
	}, [clearSelection, markRemoving, onRevoke, selectedRows, toast]);

	const confirmBulkDelete = useCallback(async () => {
		if (selectedRows.length === 0) return;
		setBulkBusy(true);
		let ok = 0;
		let fail = 0;
		for (const inv of selectedRows) {
			markRemoving(inv.token);
			try {
				await onDelete(inv.token);
				ok += 1;
			} catch {
				fail += 1;
			}
		}
		setBulkBusy(false);
		setBulkDeleteOpen(false);
		clearSelection();
		if (fail === 0) {
			toast({
				title: "Invitations deleted",
				description: `Deleted ${ok} invitation${ok === 1 ? "" : "s"}.`,
			});
		} else {
			toast({
				variant: "destructive",
				title: "Some deletes failed",
				description: `Deleted ${ok}, failed ${fail}.`,
			});
		}
	}, [clearSelection, markRemoving, onDelete, selectedRows, toast]);

	const isExecutive = variant === "executive";

	return (
		<>
			<Card
				ref={cardRef}
				className={cn(
					isExecutive
						? "glass-card relative overflow-hidden"
						: "relative overflow-hidden bg-white/30 backdrop-blur border border-white/40 shadow-lg",
					className,
				)}
			>
				{isExecutive ? (
					<>
						<div className="glass-card-cap" />
						<MetricStatDotsBackdrop />
					</>
				) : null}
				<CardHeader
					className={cn(
						"relative z-10 mb-4 border-b border-slate-200/80 pb-4",
						isExecutive && "px-6 pt-6",
					)}
				>
					<CardTitle className="flex items-center gap-2.5 text-lg font-bold sidebar-gradient-text">
						<StatCardIcon icon={MailClock} />
						Pending Invitations
					</CardTitle>
					<CardDescription className="mt-1.5 text-[12.5px] text-slate-600">
						People who got an invite but have not joined yet. Resend the link,
						revoke it, or delete it from here.
					</CardDescription>
				</CardHeader>
				<CardContent className="relative z-10">
					<PendingInvitationsDataTable
						invitations={invitations}
						isLoading={isLoading}
						selectedIds={selectedIds}
						removingTokens={removingTokens}
						addingTokens={addingTokens}
						busyToken={busyToken}
						onToggle={handleToggle}
						onToggleAll={handleToggleAll}
						onResend={(inv) => void handleResendOne(inv)}
						onRevoke={(inv) => setRevokeTarget(toConfirmTarget(inv))}
						onDelete={(inv) => setDeleteTarget(toConfirmTarget(inv))}
					/>
				</CardContent>
			</Card>

			<PendingInvitationsBulkBar
				count={selectedIds.size}
				anchorRef={cardRef}
				busy={bulkBusy}
				onResend={() => void runBulkResend()}
				onRevoke={() => setBulkRevokeOpen(true)}
				onDelete={() => setBulkDeleteOpen(true)}
				onClear={clearSelection}
			/>

			<ConfirmDialog
				open={Boolean(revokeTarget)}
				onOpenChange={(next) => {
					if (!next) setRevokeTarget(null);
				}}
				tone="danger"
				icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
				title="Revoke this invitation?"
				description={
					<>
						They will no longer be able to accept it, and{" "}
						<strong className="font-medium text-slate-700">
							this cannot be undone
						</strong>
						. You can send a new invitation at any time.
					</>
				}
				summaryRows={invitationConfirmRows(revokeTarget)}
				confirmLabel="Revoke invitation"
				pendingLabel="Revoking…"
				onConfirm={confirmRevokeOne}
			/>

			<ConfirmDialog
				open={Boolean(deleteTarget)}
				onOpenChange={(next) => {
					if (!next) setDeleteTarget(null);
				}}
				tone="danger"
				icon={<Trash2 className="h-5 w-5" aria-hidden />}
				title="Delete this invitation?"
				description={
					<>
						This permanently removes the invitation, and{" "}
						<strong className="font-medium text-slate-700">
							this cannot be undone
						</strong>
						. The recipient will no longer be able to use the link.
					</>
				}
				summaryRows={invitationConfirmRows(deleteTarget)}
				confirmLabel="Delete invitation"
				pendingLabel="Deleting…"
				onConfirm={confirmDeleteOne}
			/>

			<ConfirmDialog
				open={bulkRevokeOpen}
				onOpenChange={setBulkRevokeOpen}
				tone="danger"
				icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
				title={`Revoke ${selectedRows.length} invitation${selectedRows.length === 1 ? "" : "s"}?`}
				description={
					<>
						Selected people will no longer be able to accept these invites, and{" "}
						<strong className="font-medium text-slate-700">
							this cannot be undone
						</strong>
						.
					</>
				}
				confirmLabel={`Revoke ${selectedRows.length}`}
				pendingLabel="Revoking…"
				onConfirm={confirmBulkRevoke}
			/>

			<ConfirmDialog
				open={bulkDeleteOpen}
				onOpenChange={setBulkDeleteOpen}
				tone="danger"
				icon={<Trash2 className="h-5 w-5" aria-hidden />}
				title={`Delete ${selectedRows.length} invitation${selectedRows.length === 1 ? "" : "s"}?`}
				description={
					<>
						This permanently removes the selected invitations, and{" "}
						<strong className="font-medium text-slate-700">
							this cannot be undone
						</strong>
						.
					</>
				}
				confirmLabel={`Delete ${selectedRows.length}`}
				pendingLabel="Deleting…"
				onConfirm={confirmBulkDelete}
			/>
		</>
	);
}
