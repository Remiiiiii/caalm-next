"use client";

import { ArrowRight, Bot, CalendarClock, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import EntityPreviewSheetShell from "@/components/preview/EntityPreviewSheetShell";
import { CAALM_BADGE_BASE } from "@/components/tasks/task-ui";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	parseParticipants,
	type ReviewSession,
	type SessionParticipant,
	type SessionRole,
} from "@/lib/audit-lab/types";
import { cn, resolveAvatarDisplayUrl } from "@/lib/utils";

export type SimulationSheetProfile = {
	name: string;
	imageUrl: string | null;
	department?: string;
	division?: string;
};

const ROLE_SECTION: Array<{
	role: SessionRole;
	label: string;
}> = [
	{ role: "facilitator", label: "Facilitator" },
	{ role: "mock_auditor", label: "Mock auditor" },
	{ role: "interviewee", label: "Interviewees" },
	{ role: "observer", label: "Observers" },
];

const PERSONA_LABEL: Record<string, string> = {
	friendly_collegiate: "Friendly collegiate",
	by_the_book: "By the book",
	forensic: "Forensic",
	regulator_style: "Regulator style",
};

function parseLinkedDocIds(json: string | undefined): string[] {
	if (!json?.trim()) return [];
	try {
		const parsed = JSON.parse(json) as unknown;
		if (Array.isArray(parsed)) {
			return parsed.map((id) => String(id)).filter(Boolean);
		}
		if (typeof parsed === "string" && parsed.trim()) return [parsed.trim()];
	} catch {
		return json
			.split(/[,\s]+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

function SectionBlock({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<section className="border-t border-slate-200/70 pt-4">
			<p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			{children}
		</section>
	);
}

function PersonRow({
	participant,
	profile,
}: {
	participant: SessionParticipant;
	profile?: SimulationSheetProfile;
}) {
	const fullName = profile?.name || participant.name?.trim() || "Participant";
	const department = profile?.department?.trim();
	const division = profile?.division?.trim();
	const meta = [department, division].filter(Boolean).join(" · ");

	return (
		<div className="flex items-start gap-3 py-2">
			<Avatar
				userId={participant.userId}
				name={fullName}
				size="sm"
				imageUrl={profile?.imageUrl}
			/>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold text-slate-800">
					{fullName}
				</p>
				{meta ? (
					<p className="truncate text-xs text-slate-500">{meta}</p>
				) : null}
			</div>
		</div>
	);
}

function MockAuditorRow({ participant }: { participant: SessionParticipant }) {
	const raw =
		participant.name?.trim() || participant.email?.trim() || "by_the_book";
	const persona =
		PERSONA_LABEL[raw] ||
		PERSONA_LABEL[raw.toLowerCase().replace(/\s+/g, "_")] ||
		raw;
	return (
		<div className="flex items-start gap-3 py-2">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-blue/20 bg-blue/10 text-[#0f5384]">
				<Bot className="h-4 w-4" aria-hidden />
			</span>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold text-slate-800">
					AI Auditor — {persona} persona
				</p>
			</div>
		</div>
	);
}

export function SimulationDetailSheet({
	session,
	open,
	onOpenChange,
	profilesByUserId,
	onReschedule,
	canManage,
}: {
	session: ReviewSession | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	profilesByUserId: Map<string, SimulationSheetProfile>;
	onReschedule: () => void;
	canManage: boolean;
}) {
	const participants = useMemo(
		() => (session ? parseParticipants(session.participantsJson) : []),
		[session],
	);
	const linkedIds = useMemo(
		() => (session ? parseLinkedDocIds(session.linkedAuditDocIds) : []),
		[session],
	);
	if (!session) return null;

	const subtitleParts = [
		session.department,
		session.framework?.trim() || null,
	].filter(Boolean);

	return (
		<EntityPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			icon={ClipboardList}
			maxWidth="lg"
			bodyClassName="review-hover-scroll overflow-x-hidden"
			title={session.title}
			description={
				<div className="flex flex-wrap items-center gap-2">
					{subtitleParts.length > 0 ? (
						<span className="text-sm text-slate-600">
							{subtitleParts.join(" · ")}
						</span>
					) : null}
					{session.prepDeadlineAt ? (
						<span
							className={cn(
								CAALM_BADGE_BASE,
								"bg-blue/10 text-[#0f5384] border-blue/20",
							)}
						>
							Prep {session.prepDeadlineAt}
						</span>
					) : null}
				</div>
			}
			footer={
				<div className="flex w-full gap-3">
					{canManage ? (
						<Button
							type="button"
							className="btn-primary flex-1 cursor-pointer gap-1.5"
							onClick={() => {
								onReschedule();
							}}
						>
							<CalendarClock className="h-4 w-4" aria-hidden />
							Reschedule
						</Button>
					) : null}
					<Button
						type="button"
						className="btn-primary flex-1 cursor-pointer gap-1.5"
						asChild
					>
						<Link
							href={`/audit-lab/interview?sessionId=${session.$id}`}
							onClick={() => onOpenChange(false)}
						>
							<ArrowRight className="h-4 w-4" aria-hidden />
							Open builder
						</Link>
					</Button>
				</div>
			}
		>
			{ROLE_SECTION.map(({ role, label }) => {
				const rows = participants.filter((p) => p.role === role);
				if (rows.length === 0) return null;
				return (
					<SectionBlock key={role} label={label}>
						<div className="space-y-1">
							{rows.map((p, index) =>
								role === "mock_auditor" ? (
									<MockAuditorRow
										key={`${p.userId}-${index}`}
										participant={p}
									/>
								) : (
									<PersonRow
										key={`${p.userId}-${index}`}
										participant={p}
										profile={profilesByUserId.get(p.userId)}
									/>
								),
							)}
						</div>
					</SectionBlock>
				);
			})}

			<SectionBlock label="Linked documents">
				{linkedIds.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{linkedIds.map((id) => (
							<span
								key={id}
								className={cn(
									CAALM_BADGE_BASE,
									"max-w-full truncate bg-blue/10 text-[#0f5384] border-blue/20",
								)}
								title={id}
							>
								{id.length > 18 ? `${id.slice(0, 16)}…` : id}
							</span>
						))}
					</div>
				) : (
					<p className="text-sm text-slate-500">No linked documents yet.</p>
				)}
			</SectionBlock>
		</EntityPreviewSheetShell>
	);
}

/** Build profiles map from /api/users/get-by-ids payloads. */
export function profilesFromUsers(
	users: Array<{
		$id?: string;
		accountId?: string;
		fullName?: string;
		avatar?: string | null;
		profileImageId?: string | null;
		department?: string | null;
		division?: string | null;
	}>,
): Map<string, SimulationSheetProfile> {
	const map = new Map<string, SimulationSheetProfile>();
	for (const user of users) {
		if (!user?.$id) continue;
		const entry: SimulationSheetProfile = {
			name: user.fullName?.trim() || "",
			imageUrl: resolveAvatarDisplayUrl(user),
			department: user.department?.trim() || undefined,
			division: user.division?.trim() || undefined,
		};
		map.set(user.$id, entry);
		if (user.accountId) map.set(user.accountId, entry);
	}
	return map;
}
