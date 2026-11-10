"use client";

import { Mail, Trash2, UserX } from "lucide-react";
import type { RefObject } from "react";
import {
	BulkActionDivider,
	BulkActionDock,
} from "@/components/ui/bulk-action-dock";
import { BusyIcon } from "@/components/ui/busy-icon";
import { useBusyAction } from "@/hooks/useBusyAction";

export function PendingInvitationsBulkBar({
	count,
	anchorRef,
	busy = false,
	onResend,
	onRevoke,
	onDelete,
	onClear,
}: {
	count: number;
	anchorRef?: RefObject<HTMLElement | null>;
	busy?: boolean;
	onResend: () => void;
	onRevoke: () => void;
	onDelete: () => void;
	onClear: () => void;
}) {
	const [runResend, resending] = useBusyAction(onResend);
	const disabled = busy || resending;

	return (
		<BulkActionDock
			count={count}
			noun="invitation"
			anchorRef={anchorRef}
			onClear={onClear}
		>
			<button
				type="button"
				disabled={disabled}
				onClick={() => void runResend()}
				className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<BusyIcon busy={resending || busy} icon={Mail} />
				Resend
			</button>
			<button
				type="button"
				disabled={disabled}
				onClick={onRevoke}
				className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<BusyIcon busy={busy} icon={UserX} />
				Revoke
			</button>
			<BulkActionDivider />
			<button
				type="button"
				disabled={disabled}
				onClick={onDelete}
				className="delete-btn cursor-pointer text-sm disabled:cursor-not-allowed disabled:opacity-50"
			>
				<BusyIcon busy={busy} icon={Trash2} />
				Delete
			</button>
		</BulkActionDock>
	);
}
