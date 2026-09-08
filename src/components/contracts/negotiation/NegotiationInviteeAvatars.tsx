"use client";

import { useState } from "react";
import { getAvatarColor } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NegotiationInvitee } from "@/lib/contracts/negotiation/access.logic";
import { cn } from "@/lib/utils";

export type NegotiationParticipant = NegotiationInvitee & {
	role: "owner" | "invitee";
	/** Appwrite profile picture URL when the person has one. */
	imageUrl?: string | null;
};

function initialsFromName(name: string, email: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	if (parts.length === 1 && parts[0].length >= 2) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return (email.slice(0, 2) || "?").toUpperCase();
}

/** Owner first, then invitees; de-dupe by email. */
export function buildNegotiationParticipants(
	owner: (NegotiationInvitee & { imageUrl?: string | null }) | null | undefined,
	invitees: Array<NegotiationInvitee & { imageUrl?: string | null }>,
): NegotiationParticipant[] {
	const byEmail = new Map<string, NegotiationParticipant>();
	if (owner?.email) {
		byEmail.set(owner.email.toLowerCase(), {
			email: owner.email.toLowerCase(),
			name: owner.name || owner.email,
			role: "owner",
			imageUrl: owner.imageUrl || null,
		});
	}
	for (const invitee of invitees) {
		const email = invitee.email.toLowerCase();
		if (byEmail.has(email)) continue;
		byEmail.set(email, {
			email,
			name: invitee.name || email,
			role: "invitee",
			imageUrl: invitee.imageUrl || null,
		});
	}
	return [...byEmail.values()];
}

function ParticipantBadge({
	person,
	index,
	stackSize,
}: {
	person: NegotiationParticipant;
	index: number;
	stackSize: number;
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const color = getAvatarColor(person.email);
	const showImage = Boolean(person.imageUrl) && !imageFailed;

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<span
						role="listitem"
						className={cn(
							"relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm",
							index > 0 && "-ml-2",
						)}
						style={{
							backgroundColor: showImage ? undefined : color,
							zIndex: stackSize - index,
						}}
						aria-label={`${person.name} (${person.role})`}
					>
						{showImage ? (
							// eslint-disable-next-line @next/next/no-img-element -- Appwrite storage URL; matches ManagerAvatars
							<img
								src={person.imageUrl || ""}
								alt=""
								className="h-full w-full object-cover"
								onError={() => setImageFailed(true)}
							/>
						) : (
							initialsFromName(person.name, person.email)
						)}
					</span>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="text-xs">
					<p className="font-medium">{person.name}</p>
					<p className="text-slate-400">
						{person.role === "owner" ? "Owner" : person.email}
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

interface NegotiationInviteeAvatarsProps {
	/** Prefer participants (owner + invitees). Falls back to invitees-only. */
	participants?: NegotiationParticipant[];
	invitees?: NegotiationInvitee[];
	className?: string;
	/** Align stack toward the action on its right (header) or comments column. */
	align?: "start" | "end";
}

/**
 * Google Docs-style overlapping avatars for owner + invited reviewers.
 * Uses profile photos when available; otherwise initials.
 */
export function NegotiationInviteeAvatars({
	participants,
	invitees = [],
	className,
	align = "end",
}: NegotiationInviteeAvatarsProps) {
	const rows =
		participants && participants.length > 0
			? participants
			: invitees.map((row) => ({ ...row, role: "invitee" as const }));
	if (rows.length === 0) return null;

	// Cap at 5 faces; when there are more, show "+n" for the hidden count.
	const MAX_VISIBLE = 5;
	const remaining = rows.length > MAX_VISIBLE ? rows.length - MAX_VISIBLE : 0;
	const visible = rows.slice(0, remaining > 0 ? MAX_VISIBLE : rows.length);
	// +n chip sits at the end of the stack (lowest z-index among slots).
	const stackSize = visible.length + (remaining > 0 ? 1 : 0);

	return (
		<div
			className={cn(
				"flex items-center",
				align === "end" && "justify-end",
				className,
			)}
			role="list"
			aria-label="Document participants"
		>
			{visible.map((person, index) => (
				<ParticipantBadge
					key={`${person.role}-${person.email}`}
					person={person}
					index={index}
					stackSize={stackSize}
				/>
			))}
			{remaining > 0 ? (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span
								role="listitem"
								className="relative -ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-500 text-[10px] font-semibold text-white shadow-sm"
								style={{ zIndex: 0 }}
								aria-label={`${remaining} more participants`}
							>
								+{remaining}
							</span>
						</TooltipTrigger>
						<TooltipContent side="bottom" className="text-xs">
							<div className="space-y-1">
								{rows.slice(MAX_VISIBLE).map((person) => (
									<p key={`${person.role}-${person.email}`}>
										{person.name}
										{person.role === "owner" ? " · Owner" : ` · ${person.email}`}
									</p>
								))}
							</div>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			) : null}
		</div>
	);
}
