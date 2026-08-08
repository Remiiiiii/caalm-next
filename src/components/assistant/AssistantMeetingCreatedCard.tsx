"use client";

import { CalendarCheck2, CheckCircle2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import type { AssistantMeetingCreated } from "@/components/assistant/assistantTypes";
import { getAvatarColor } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, getProfilePictureUrl } from "@/lib/utils";

type DirectoryUser = {
	$id: string;
	fullName: string;
	email: string;
	avatar?: string | null;
};

function ordinalDay(day: number): string {
	const j = day % 10;
	const k = day % 100;
	if (j === 1 && k !== 11) return `${day}st`;
	if (j === 2 && k !== 12) return `${day}nd`;
	if (j === 3 && k !== 13) return `${day}rd`;
	return `${day}th`;
}

function formatMeetingDate(dateStr: string): string {
	const part = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [y, m, d] = part.split("-").map(Number);
	if (!y || !m || !d) return dateStr;
	const date = new Date(y, m - 1, d);
	if (Number.isNaN(date.getTime())) return dateStr;
	const month = date.toLocaleString("en-US", { month: "long" });
	return `${ordinalDay(d)} ${month}`;
}

function emailsFromParticipants(raw?: string): string[] {
	if (!raw?.trim()) return [];
	return raw
		.split(",")
		.map((chunk) => {
			const emailMatch = chunk.match(/<([^>]+)>/);
			if (emailMatch?.[1]) return emailMatch[1].trim().toLowerCase();
			const plain = chunk.trim();
			return plain.includes("@") ? plain.toLowerCase() : "";
		})
		.filter(Boolean);
}

function UserFace({ user, size = 24 }: { user: DirectoryUser; size?: number }) {
	const [failed, setFailed] = useState(false);
	const initials = user.fullName
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const imageUrl =
		user.avatar && !failed ? getProfilePictureUrl(user.avatar) : null;

	return (
		<div
			className="shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm"
			style={{ width: size, height: size }}
			title={user.fullName}
		>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt=""
					className="h-full w-full object-cover"
					onError={() => setFailed(true)}
				/>
			) : (
				<div
					className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-white"
					style={{ backgroundColor: getAvatarColor(user.$id) }}
				>
					{initials || "U"}
				</div>
			)}
		</div>
	);
}

function StackedAvatars({ users }: { users: DirectoryUser[] }) {
	const maxDisplay = users.length > 5 ? 4 : users.length;
	const remaining = users.length > 5 ? users.length - 4 : 0;
	const visible = users.slice(0, maxDisplay);

	return (
		<div className="flex items-center" role="list" aria-label="Invitees">
			{visible.map((user, index) => (
				<TooltipProvider key={user.$id}>
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								className={cn("inline-block", index > 0 && "-ml-2")}
								role="listitem"
							>
								<UserFace user={user} size={24} />
							</span>
						</TooltipTrigger>
						<TooltipContent>
							<p>{user.fullName}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			))}
			{remaining > 0 ? (
				<span
					className="-ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-700 shadow-sm"
					role="listitem"
					title={`${remaining} more`}
				>
					+{remaining}
				</span>
			) : null}
		</div>
	);
}

export default function AssistantMeetingCreatedCard({
	meeting,
	onOpenCalendar,
}: {
	meeting: AssistantMeetingCreated;
	onOpenCalendar?: () => void;
}) {
	const [invitees, setInvitees] = useState<DirectoryUser[]>([]);
	const dateLabel = formatMeetingDate(meeting.date);
	const timeLine =
		meeting.startTime && meeting.endTime
			? `${meeting.startTime} – ${meeting.endTime}`
			: meeting.startTime || "Time TBD";
	const invited =
		meeting.invitedCount ?? emailsFromParticipants(meeting.participants).length;

	useEffect(() => {
		const emails = emailsFromParticipants(meeting.participants);
		if (emails.length === 0) {
			setInvitees([]);
			return;
		}
		let cancelled = false;
		void fetch("/api/users/directory")
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok || !Array.isArray(data) || cancelled) return;
				const emailSet = new Set(emails);
				setInvitees(
					(data as DirectoryUser[]).filter((u) =>
						emailSet.has(u.email.toLowerCase()),
					),
				);
			})
			.catch(() => undefined);
		return () => {
			cancelled = true;
		};
	}, [meeting.participants]);

	return (
		<div className="glass-card mt-2 overflow-hidden text-left">
			<div className="glass-card-cap" />
			<div className="relative z-1 px-4 pb-4 pt-6">
				<div className="flex items-start gap-3">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-green/20 bg-green/10">
						<CheckCircle2 className="h-5 w-5 text-green" />
					</div>
					<div className="min-w-0">
						<p className="text-sm font-semibold text-slate-700">
							Meeting successfully created
						</p>
						<p className="mt-0.5 text-xs text-slate-600">
							It is on your calendar and invitees have been notified.
						</p>
					</div>
				</div>

				<div className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3">
					<p className="text-base font-semibold sidebar-gradient-text leading-snug">
						{meeting.title}
					</p>
					<div className="mt-3 flex items-start gap-3">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-linear-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10">
							<CalendarCheck2 className="h-4 w-4 text-[#0f5384]" />
						</div>
						<div className="min-w-0 pt-0.5">
							<p className="text-sm font-semibold text-slate-700">
								{dateLabel}
							</p>
							<p className="mt-0.5 text-sm text-slate-600">{timeLine}</p>
						</div>
					</div>

					{meeting.description?.trim() ? (
						<p className="mt-3 text-sm leading-relaxed text-slate-600 line-clamp-3">
							{meeting.description.trim()}
						</p>
					) : null}

					<div className="mt-3 flex min-w-0 items-center gap-2">
						<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-linear-to-br from-[#00C1CB]/15 via-[#0E638F]/10 to-[#162768]/10">
							<Users className="h-3.5 w-3.5 text-[#0f5384]" />
						</div>
						<p className="text-sm text-slate-600">
							{invited > 0 ? `${invited} invited` : "No invitees"}
						</p>
						{invitees.length > 0 ? <StackedAvatars users={invitees} /> : null}
					</div>
				</div>

				{onOpenCalendar ? (
					<div className="mt-3 flex justify-end">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="primary-btn rounded-full px-3 cursor-pointer"
							onClick={onOpenCalendar}
						>
							Open calendar
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}
