"use client";

import { Mail, Trash2, UserX } from "lucide-react";
import Image from "next/image";
import {
	AppDropdownMenuContent,
	AppDropdownMenuItem,
	DropdownMenu,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Contracts-size hollow dots; always visible in the Actions column. */
export function PendingInvitationRowActions({
	label,
	busy = false,
	onResend,
	onRevoke,
	onDelete,
}: {
	label: string;
	busy?: boolean;
	onResend: () => void;
	onRevoke: () => void;
	onDelete: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={busy}
				className="shad-no-focus inline-flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-40"
				aria-label={`Actions for ${label}`}
				onClick={(e) => e.stopPropagation()}
			>
				<Image
					src="/assets/icons/dots.svg"
					alt=""
					width={34}
					height={34}
					className="h-[34px] w-[34px] max-h-[34px] max-w-[34px] shrink-0"
					unoptimized
				/>
			</DropdownMenuTrigger>
			<AppDropdownMenuContent
				align="end"
				className="min-w-[180px]"
				onClick={(e) => e.stopPropagation()}
			>
				<AppDropdownMenuItem icon={Mail} disabled={busy} onSelect={onResend}>
					Resend
				</AppDropdownMenuItem>
				<AppDropdownMenuItem icon={UserX} disabled={busy} onSelect={onRevoke}>
					Revoke
				</AppDropdownMenuItem>
				<DropdownMenuSeparator />
				<AppDropdownMenuItem
					icon={Trash2}
					tone="danger"
					disabled={busy}
					onSelect={onDelete}
				>
					Delete
				</AppDropdownMenuItem>
			</AppDropdownMenuContent>
		</DropdownMenu>
	);
}
