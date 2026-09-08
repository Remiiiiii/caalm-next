"use client";

import { Eye, RotateCw, Send, UserPlus } from "lucide-react";
import { NegotiationInviteeAvatars } from "@/components/contracts/negotiation/NegotiationInviteeAvatars";
import type { NegotiationParticipant } from "@/components/contracts/negotiation/NegotiationInviteeAvatars";
import { Button } from "@/components/ui/button";

interface NegotiationHeaderProps {
	lifecycle: string;
	roleLabel: string;
	canEdit: boolean;
	busy: boolean;
	/** Slow header action in flight (`send` while preview builds / confirms). */
	busyAction?: string | null;
	openCount: number;
	sendGate: { ok: boolean; reason?: string };
	canApprove: boolean;
	participants?: NegotiationParticipant[];
	onInvite: () => void;
	onSend: () => void;
}

/** Title Case from snake_case / kebab-case lifecycle values. */
function lifecycleLabel(lifecycle: string): string {
	return lifecycle
		.split(/[_\s-]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(" ");
}

export function NegotiationHeader({
	lifecycle,
	roleLabel,
	canEdit,
	busy,
	busyAction = null,
	openCount,
	sendGate,
	canApprove,
	participants = [],
	onInvite,
	onSend,
}: NegotiationHeaderProps) {
	const inNegotiation = lifecycle === "negotiation";
	const canSend = canEdit && inNegotiation && sendGate.ok && !busy;
	const sendPending = busyAction === "send" || busyAction === "confirm-send";

	return (
		<div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
			<div className="flex flex-wrap items-center gap-3">
				<h1 className="h1 capitalize sidebar-gradient-text">Negotiate</h1>
				<span className="inline-block rounded-full border border-orange/20 bg-orange/10 px-2 py-0.5 text-xs font-medium text-orange">
					{lifecycleLabel(lifecycle)}
				</span>
				<span className="inline-flex items-center gap-1.5 rounded-full border border-blue/20 bg-blue/10 px-2.5 py-0.5 text-xs font-medium text-blue">
					<Eye className="h-3.5 w-3.5" />
					Viewing as {roleLabel}
				</span>
			</div>
			<div className="flex flex-col items-end gap-1">
				<div className="flex items-center gap-3">
					{participants.length > 0 ? (
						<NegotiationInviteeAvatars
							participants={participants}
							align="end"
						/>
					) : null}
					{canEdit ? (
						<Button
							type="button"
							className="primary-btn px-3 sm:px-4"
							onClick={onInvite}
						>
							<UserPlus className="h-4 w-4" />
							Invite
						</Button>
					) : null}
					{canEdit && inNegotiation ? (
						<div className="relative">
							<Button
								type="button"
								className="primary-btn px-3 sm:px-4"
								disabled={!canSend}
								title={
									!sendGate.ok
										? sendGate.reason
										: openCount > 0 && canApprove
											? "Open comments remain; your approve permission lets you proceed"
											: undefined
								}
								onClick={onSend}
							>
								{sendPending ? (
									<RotateCw className="h-4 w-4 animate-spin" />
								) : (
									<Send className="h-4 w-4" />
								)}
								Send for review
							</Button>
							{!sendGate.ok && openCount > 0 ? (
								<span
									className="absolute -top-2 -right-2 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-orange text-[10px] font-bold text-white"
									aria-hidden="true"
								>
									{openCount}
								</span>
							) : null}
						</div>
					) : null}
				</div>
				{canEdit && inNegotiation && !sendGate.ok ? (
					<p className="max-w-xs text-right text-xs text-orange">
						{sendGate.reason}
						{openCount > 0 ? ` (${openCount} open)` : ""}
					</p>
				) : null}
			</div>
		</div>
	);
}
