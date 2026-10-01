"use client";

import { FileText, Inbox, Loader2, Mail } from "lucide-react";
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
	const date = Number.isFinite(asNum) && asNum > 1e11
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

	return (
		<ul className="-mx-1 divide-y divide-slate-200">
			{items.map((item) => {
				const sender = parseSender(item.from);
				const selected = selectedId === item.id;
				return (
					<li key={item.id}>
					<button
						type="button"
						onClick={() => onSelect(item.id)}
						className={cn(
							"group relative z-0 flex w-full min-w-0 gap-3 px-3 py-3 text-left transition-all duration-200 cursor-pointer",
							"hover:z-10 hover:bg-blue-50 hover:shadow-[0_6px_14px_-4px_rgba(15,83,132,0.18),0_2px_4px_-1px_rgba(15,23,42,0.06)]",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5384]/30",
							selected && "bg-blue/10",
						)}
					>
							{/* Unread indicator (Apple Mail / Spark pattern) */}
							<span
								className={cn(
									"absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full",
									item.unread ? "bg-[#0f5384]" : "bg-transparent",
								)}
								aria-hidden
							/>

							<div
								className={cn(
									"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
									variant === "drafts"
										? "bg-slate-100 text-slate-600"
										: avatarTone(sender.email || sender.name),
								)}
							>
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
											"truncate text-sm text-slate-800",
											item.unread ? "font-semibold" : "font-medium",
										)}
									>
										{variant === "drafts" ? item.subject || "(No subject)" : sender.name}
									</p>
									<span className="shrink-0 text-[11px] tabular-nums text-slate-500">
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
					</li>
				);
			})}
		</ul>
	);
}
