"use client";

import { Check, ChevronDown, Search, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import Avatar from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FILTER_PILL_TRIGGER } from "@/components/ui/filter-pill";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@/lib/tickets/submitter-avatars";
import { IT_DROPDOWN_PANEL } from "@/lib/ui/it-routes";
import { cn } from "@/lib/utils";

type Staff = {
	$id: string;
	fullName: string;
	imageUrl?: string | null;
};

const fetchStaff = async (url: string): Promise<Staff[]> => {
	const res = await fetch(url);
	if (!res.ok) throw new Error("Could not load staff");
	return res.json();
};

/**
 * Shows a ticket's assignee and, for people who may assign, lets them pick a
 * different IT staff member. Used by the queue table (`cell`) and the ticket
 * sheet (`pill`); a refresh after saving updates every view of the ticket.
 */
export function TicketAssigneePicker({
	ticketId,
	assigneeId,
	assignee,
	canAssign,
	variant,
}: {
	ticketId: string;
	assigneeId?: string | null;
	assignee?: UserProfile;
	canAssign: boolean;
	variant: "cell" | "pill";
}) {
	const router = useRouter();
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [saving, setSaving] = useState(false);
	// Shown straight away; the server refresh then brings the same value back.
	const [chosen, setChosen] = useState<Staff | null>(null);

	const { data: staff, error } = useSWR<Staff[]>(
		canAssign && open ? "/api/it/staff" : null,
		fetchStaff,
	);

	const currentId = chosen?.$id ?? assigneeId ?? null;
	const name = chosen?.fullName ?? assignee?.name ?? "";
	const imageUrl = chosen ? chosen.imageUrl : assignee?.avatarUrl;
	const matches = (staff ?? []).filter((member) =>
		member.fullName.toLowerCase().includes(search.trim().toLowerCase()),
	);

	const assign = async (member: Staff) => {
		if (member.$id === currentId || saving) return;
		setSaving(true);
		try {
			const res = await fetch(`/api/tickets/${ticketId}/assign`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ assigneeId: member.$id }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Could not assign ticket");
			setChosen(member);
			setSearch("");
			router.refresh();
		} catch (err) {
			toast({
				title: "Could not assign ticket",
				description: err instanceof Error ? err.message : undefined,
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const person = currentId ? (
		<Avatar
			name={name || undefined}
			userId={currentId}
			size={variant === "cell" ? "sm" : "xs"}
			imageUrl={imageUrl ?? undefined}
		/>
	) : null;

	if (!canAssign) {
		if (!person) {
			return (
				<span
					className={cn(
						"italic text-slate-400",
						variant === "cell" ? "text-sm" : "text-[13px]",
					)}
				>
					Unassigned
				</span>
			);
		}
		return variant === "cell" ? (
			<Tooltip>
				<TooltipTrigger asChild>
					<span className="inline-flex">{person}</span>
				</TooltipTrigger>
				<TooltipContent>{name || "Assigned"}</TooltipContent>
			</Tooltip>
		) : (
			<span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-700">
				{person}
				{name || "Assigned"}
			</span>
		);
	}

	const trigger =
		variant === "cell" ? (
			<DropdownMenuTrigger
				disabled={saving}
				aria-label={currentId ? `Assigned to ${name}. Change` : "Assign ticket"}
				className="inline-flex cursor-pointer items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:opacity-50"
			>
				{person ?? (
					<span className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 text-xs text-slate-500 transition-colors duration-200 hover:border-[#0f5384] hover:text-[#0f5384]">
						<UserPlus className="h-3.5 w-3.5" aria-hidden />
						Assign
					</span>
				)}
			</DropdownMenuTrigger>
		) : (
			<DropdownMenuTrigger
				disabled={saving}
				className={cn(FILTER_PILL_TRIGGER, "disabled:opacity-50")}
			>
				{person ? (
					<>
						{person}
						<span className="max-w-[10rem] truncate">{name || "Assigned"}</span>
					</>
				) : (
					<span className="text-slate-400">Unassigned</span>
				)}
				<ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden />
			</DropdownMenuTrigger>
		);

	return (
		// Stops row clicks in the queue table; the menu is portaled but React
		// still bubbles its events through this wrapper.
		<span
			className="inline-flex"
			onClick={(event) => event.stopPropagation()}
			onKeyDown={(event) => event.stopPropagation()}
		>
			<DropdownMenu
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setSearch("");
				}}
			>
				{trigger}
				<DropdownMenuContent
					align="end"
					className={`${IT_DROPDOWN_PANEL} w-64 p-0`}
				>
					<div className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2">
						<Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
						<input
							type="text"
							className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
							placeholder="Search staff…"
							aria-label="Search staff"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							onKeyDown={(event) => event.stopPropagation()}
						/>
					</div>
					<div className="max-h-52 overflow-y-auto py-1">
						{matches.map((member) => (
							<DropdownMenuItem
								key={member.$id}
								className="flex items-center gap-2.5 px-3 py-2"
								onSelect={() => void assign(member)}
							>
								<Avatar
									name={member.fullName}
									userId={member.$id}
									size="xs"
									imageUrl={member.imageUrl ?? undefined}
								/>
								<span className="truncate">{member.fullName}</span>
								{member.$id === currentId ? (
									<Check className="ml-auto h-4 w-4 shrink-0 text-green-600" />
								) : null}
							</DropdownMenuItem>
						))}
						{error ? (
							<p className="px-3 py-4 text-center text-sm text-red">
								Could not load staff
							</p>
						) : !staff ? (
							<p className="px-3 py-4 text-center text-sm text-slate-400">
								Loading…
							</p>
						) : matches.length === 0 ? (
							<p className="px-3 py-4 text-center text-sm text-slate-400">
								No matching staff
							</p>
						) : null}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>
		</span>
	);
}
