"use client";

import {
	Archive,
	FileText,
	Inbox,
	Loader2,
	Mail,
	MailOpen,
	Trash2,
} from "lucide-react";
import { GmailActionTooltip } from "@/components/gmail/GmailActionTooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export interface GmailListItem {
	id: string;
	subject: string;
	from: string;
	snippet: string;
	date: string;
	unread?: boolean;
}

interface GmailMessageListProps {
	items: GmailListItem[];
	loading?: boolean;
	selectedId?: string | null;
	onSelect: (id: string) => void;
	emptyLabel?: string;
	variant?: "inbox" | "drafts";
	busyId?: string | null;
	onArchive?: (id: string) => void;
	onTrash?: (id: string) => void;
	onToggleRead?: (id: string, unread: boolean) => void;
	/** Multi-select (inbox only) */
	checkedIds?: Set<string>;
	onToggleChecked?: (id: string) => void;
	onToggleAllChecked?: (checked: boolean) => void;
}

function parseSender(from: string): { name: string; email: string } {
	const match = from.match(/^(.*?)\s*<([^>]+)>$/);
	if (match) {
		return {
			name: match[1].replace(/^"|"$/g, "").trim() || match[2],
			email: match[2],
		};
	}
	return { name: from || "Unknown", email: from };
}

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatListDate(raw: string): string {
	if (!raw) return "";
	const asNum = Number(raw);
	const date =
		Number.isFinite(asNum) && asNum > 1e11
			? new Date(asNum)
			: new Date(raw);
	if (Number.isNaN(date.getTime())) return raw;

	const now = new Date();
	const sameDay =
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate();

	if (sameDay) {
		return date.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});
	}

	const sameYear = date.getFullYear() === now.getFullYear();
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		...(sameYear ? {} : { year: "numeric" }),
	});
}

const AVATAR_TONES = [
	"bg-[#0f5384]/15 text-[#0f5384]",
	"bg-green/15 text-green",
	"bg-orange/15 text-orange",
	"bg-blue/15 text-blue",
	"bg-coral/15 text-coral-500",
];

function avatarTone(seed: string): string {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		hash = (hash + seed.charCodeAt(i) * (i + 1)) % AVATAR_TONES.length;
	}
	return AVATAR_TONES[hash];
}

export default function GmailMessageList({
	items,
	loading,
	selectedId,
	onSelect,
	emptyLabel = "No messages",
	variant = "inbox",
	busyId,
	onArchive,
	onTrash,
	onToggleRead,
	checkedIds,
	onToggleChecked,
	onToggleAllChecked,
}: GmailMessageListProps) {
	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
				<Loader2 className="h-5 w-5 animate-spin" />
				<p className="text-sm">Loading messages…</p>
			</div>
		);
	}

	if (items.length === 0) {
		const EmptyIcon = variant === "drafts" ? FileText : Inbox;
		return (
			<div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
					<EmptyIcon className="h-5 w-5 text-slate-500" />
				</div>
				<p className="text-sm font-medium text-slate-700">{emptyLabel}</p>
				<p className="text-xs text-slate-500 max-w-[220px]">
					{variant === "drafts"
						? "Saved drafts will show up here."
						: "New mail will appear in this list."}
				</p>
			</div>
		);
	}

	const showActions =
		variant === "inbox" && (onArchive || onTrash || onToggleRead);
	const multiSelect =
		variant === "inbox" && Boolean(onToggleChecked && checkedIds);
	const allChecked =
		multiSelect && items.length > 0 && items.every((i) => checkedIds!.has(i.id));
	const someChecked =
		multiSelect && items.some((i) => checkedIds!.has(i.id)) && !allChecked;

	return (
		<div className="flex min-w-0 flex-col">
			{multiSelect ? (
				<div className="mb-1 flex items-center gap-2 px-3 py-1.5">
					<Checkbox
						checked={allChecked ? true : someChecked ? "indeterminate" : false}
						onCheckedChange={(value) =>
							onToggleAllChecked?.(value === true)
						}
						aria-label={allChecked ? "Deselect all" : "Select all"}
						className="cursor-pointer border-[0.25px] border-slate-300"
					/>
					<span className="text-xs text-slate-500">
						{checkedIds!.size > 0
							? `${checkedIds!.size} selected`
							: "Select"}
					</span>
				</div>
			) : null}

			<ul className="-mx-1 divide-y divide-slate-200">
				{items.map((item) => {
					const sender = parseSender(item.from);
					const selected = selectedId === item.id;
					const rowBusy = busyId === item.id;
					const isChecked = checkedIds?.has(item.id) ?? false;
					return (
						<li key={item.id}>
							<div
								className={cn(
									"group relative z-0 w-full min-w-0 transition-all duration-200",
									"hover:z-10 hover:bg-blue-50 hover:shadow-[0_6px_14px_-4px_rgba(15,83,132,0.18),0_2px_4px_-1px_rgba(15,23,42,0.06)]",
									(selected || isChecked) && "bg-blue/10",
								)}
							>
								<div className="flex w-full min-w-0 items-start gap-1 px-2 py-3">
									{multiSelect ? (
										<div
											className="mt-2 flex shrink-0 items-center pl-1"
											onClick={(e) => e.stopPropagation()}
											onKeyDown={(e) => e.stopPropagation()}
										>
											<Checkbox
												checked={isChecked}
												onCheckedChange={() => onToggleChecked?.(item.id)}
												aria-label={`Select ${item.subject || "message"}`}
												className="cursor-pointer border-[0.25px] border-slate-300"
											/>
										</div>
									) : null}

									<button
										type="button"
										onClick={() => onSelect(item.id)}
										disabled={rowBusy}
										className={cn(
											"relative flex min-w-0 flex-1 gap-3 px-1 text-left cursor-pointer",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5384]/30",
											rowBusy && "opacity-60",
										)}
									>
										{!multiSelect ? (
											<span
												className={cn(
													"absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full",
													item.unread ? "bg-[#0f5384]" : "bg-transparent",
												)}
												aria-hidden
											/>
										) : null}

										<div
											className={cn(
												"relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
												variant === "drafts"
													? "bg-slate-100 text-slate-600"
													: avatarTone(sender.email || sender.name),
											)}
										>
											{multiSelect && item.unread ? (
												<span
													className="absolute -left-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#0f5384]"
													aria-hidden
												/>
											) : null}
											{variant === "drafts" ? (
												<Mail className="h-4 w-4" />
											) : (
												initials(sender.name)
											)}
										</div>

										<div className="min-w-0 flex-1 overflow-hidden">
											<div className="flex items-baseline justify-between gap-2">
												<p
													className={cn(
														"min-w-0 truncate text-sm text-slate-800",
														item.unread ? "font-semibold" : "font-medium",
													)}
												>
													{variant === "drafts"
														? item.subject || "(No subject)"
														: sender.name}
												</p>
												<span
													className={cn(
														"shrink-0 text-[11px] tabular-nums text-slate-500 transition-opacity duration-150",
														showActions &&
															"group-hover:opacity-0 group-focus-within:opacity-0",
													)}
												>
													{formatListDate(item.date)}
												</span>
											</div>
											{variant === "inbox" ? (
												<p
													className={cn(
														"mt-0.5 truncate text-sm text-slate-700",
														item.unread ? "font-medium" : "font-normal",
													)}
												>
													{item.subject || "(No subject)"}
												</p>
											) : null}
											<p className="mt-0.5 truncate text-xs text-slate-500">
												{item.snippet || "No preview"}
											</p>
										</div>
									</button>
								</div>

								{showActions ? (
									<div
										className={cn(
											"pointer-events-none absolute top-2 right-2 z-20 flex items-center gap-0.5 rounded-lg bg-blue-50/95 p-0.5 opacity-0 shadow-sm",
											"transition-opacity duration-150",
											"group-hover:pointer-events-auto group-hover:opacity-100",
											"group-focus-within:pointer-events-auto group-focus-within:opacity-100",
											(selected || isChecked) && "bg-blue/10",
										)}
									>
										{onArchive ? (
											<GmailActionTooltip label="Archive">
												<button
													type="button"
													className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label="Archive"
													disabled={rowBusy}
													onClick={(e) => {
														e.stopPropagation();
														onArchive(item.id);
													}}
												>
													{rowBusy ? (
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
													) : (
														<Archive className="h-3.5 w-3.5" />
													)}
												</button>
											</GmailActionTooltip>
										) : null}
										{onToggleRead ? (
											<GmailActionTooltip
												label={item.unread ? "Mark as read" : "Mark as unread"}
											>
												<button
													type="button"
													className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label={
														item.unread ? "Mark as read" : "Mark as unread"
													}
													disabled={rowBusy}
													onClick={(e) => {
														e.stopPropagation();
														onToggleRead(item.id, Boolean(item.unread));
													}}
												>
													{item.unread ? (
														<MailOpen className="h-3.5 w-3.5" />
													) : (
														<Mail className="h-3.5 w-3.5" />
													)}
												</button>
											</GmailActionTooltip>
										) : null}
										{onTrash ? (
											<GmailActionTooltip label="Delete">
												<button
													type="button"
													className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-red/10 hover:text-red"
													aria-label="Delete"
													disabled={rowBusy}
													onClick={(e) => {
														e.stopPropagation();
														onTrash(item.id);
													}}
												>
													<Trash2 className="h-3.5 w-3.5" />
												</button>
											</GmailActionTooltip>
										) : null}
									</div>
								) : null}
							</div>
						</li>
					);
				})}
			</ul>
		</div>
	);
}
