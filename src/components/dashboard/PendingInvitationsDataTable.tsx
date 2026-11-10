"use client";

import dynamic from "next/dynamic";
import { PendingInvitationRowActions } from "@/components/dashboard/PendingInvitationRowActions";
import {
	formatInvitationRole,
	formatInvitationStatusLabel,
	invitationStatusBadgeClass,
	type PendingInvitationRow,
} from "@/components/dashboard/pending-invitations-types";
import {
	CaalmDataTable,
	CaalmDataTableEmpty,
	CaalmDataTableSkeleton,
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_CELL,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/components/ui/caalm-data-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const ClientDate = dynamic(() => import("@/components/ClientDate"), {
	ssr: false,
});

const rowPad = "px-3 py-3";
/** Body copy matches Email; Name / Status / Actions keep their own look. */
const cellText = "text-sm text-slate-600";

export function PendingInvitationsDataTable({
	invitations,
	isLoading = false,
	selectedIds,
	removingTokens,
	addingTokens,
	busyToken,
	onToggle,
	onToggleAll,
	onResend,
	onRevoke,
	onDelete,
}: {
	invitations: PendingInvitationRow[];
	isLoading?: boolean;
	selectedIds: Set<string>;
	removingTokens?: Set<string>;
	addingTokens?: Set<string>;
	/** Token currently in a single-row busy state (resend/revoke/delete). */
	busyToken?: string | null;
	onToggle: (id: string, checked: boolean) => void;
	onToggleAll: (checked: boolean) => void;
	onResend: (inv: PendingInvitationRow) => void;
	onRevoke: (inv: PendingInvitationRow) => void;
	onDelete: (inv: PendingInvitationRow) => void;
}) {
	if (isLoading) {
		return <CaalmDataTableSkeleton columns={10} rows={4} className="pt-2" />;
	}

	if (invitations.length === 0) {
		return (
			<CaalmDataTableEmpty
				title="No pending invitations"
				description="Send an invite above to get started."
			/>
		);
	}

	const allSelected =
		invitations.length > 0 &&
		invitations.every((inv) => selectedIds.has(inv.$id));
	const someSelected =
		invitations.some((inv) => selectedIds.has(inv.$id)) && !allSelected;

	return (
		<CaalmDataTable className="pt-2">
			<TableHeader className="[&_tr]:border-b-0">
				<TableRow className={DATA_TABLE_HEADER_ROW}>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "w-10 pl-4 pr-2")}>
						<Checkbox
							checked={
								allSelected ? true : someSelected ? "indeterminate" : false
							}
							onCheckedChange={(checked) => onToggleAll(checked === true)}
							aria-label="Select all invitations"
							className="cursor-pointer"
						/>
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Name
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Email
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Role
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Department
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Division
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Invited
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Expires
					</TableHead>
					<TableHead className={cn(DATA_TABLE_HEADER_CELL, "px-3")}>
						Status
					</TableHead>
					<TableHead
						className={cn(DATA_TABLE_HEADER_CELL, "pl-3 pr-4 text-right")}
					>
						Actions
					</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody className="[&_tr:last-child>td]:border-b-0">
				{invitations.map((inv) => {
					const selected = selectedIds.has(inv.$id);
					const busy = busyToken === inv.token;
					return (
						<TableRow
							key={inv.$id}
							className={cn(
								DATA_TABLE_BODY_ROW_BASE,
								"group bg-transparent transition-all duration-300",
								selected &&
									"bg-blue/10 hover:bg-blue/10 shadow-none [&>td:first-child]:relative [&>td:first-child]:before:absolute [&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-0.5 [&>td:first-child]:before:bg-[#0f5384]",
								removingTokens?.has(inv.token) && "invitation-removing",
								addingTokens?.has(inv.token) && "invitation-adding",
							)}
						>
							<TableCell className={cn(rowPad, "pl-4 pr-2")}>
								<Checkbox
									checked={selected}
									onCheckedChange={(checked) =>
										onToggle(inv.$id, checked === true)
									}
									aria-label={`Select ${inv.name || inv.email}`}
									className="cursor-pointer"
								/>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className="text-sm font-medium text-slate-700">
									{inv.name || "—"}
								</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className={cellText}>{inv.email}</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className={cellText}>
									{formatInvitationRole(inv.role)}
								</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className={cellText}>
									{inv.department?.trim() || "—"}
								</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								{inv.division?.trim() ? (
									<span className={cellText}>{inv.division.trim()}</span>
								) : (
									<span className={cn(cellText, "italic")}>Not assigned</span>
								)}
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className={cellText}>
									{inv.$createdAt ? (
										<ClientDate dateString={inv.$createdAt} />
									) : (
										"—"
									)}
								</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span className={cellText}>
									{inv.expiresAt ? (
										<ClientDate dateString={inv.expiresAt} />
									) : (
										"—"
									)}
								</span>
							</TableCell>
							<TableCell className={cn(DATA_TABLE_CELL, rowPad)}>
								<span
									className={cn(
										"inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
										invitationStatusBadgeClass(String(inv.status ?? "")),
									)}
								>
									{formatInvitationStatusLabel(String(inv.status ?? ""))}
								</span>
							</TableCell>
							<TableCell
								className={cn(DATA_TABLE_CELL, rowPad, "pl-3 pr-4 text-right")}
							>
								<PendingInvitationRowActions
									label={inv.name || inv.email}
									busy={busy}
									onResend={() => onResend(inv)}
									onRevoke={() => onRevoke(inv)}
									onDelete={() => onDelete(inv)}
								/>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</CaalmDataTable>
	);
}
