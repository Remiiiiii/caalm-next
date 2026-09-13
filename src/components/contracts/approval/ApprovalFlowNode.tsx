"use client";

import { Bell, CheckCircle2, Clock, Info, User, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getAvatarColor } from "@/components/ui/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { slaCountdownLabel } from "@/lib/approvals/approvalSlaDisplay";
import type {
	ApprovalParticipant,
	ApprovalWorkflowNotification,
	ApprovalWorkflowStep,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { fireCaalmConfettiFromElement } from "@/lib/ui/confetti";
import { cn } from "@/lib/utils";

type StepWithExtras = ApprovalWorkflowStep & {
	participants: ApprovalParticipant[];
	notifications: ApprovalWorkflowNotification[];
	assigneeHint?: string;
};

interface ApprovalFlowNodeProps {
	step: StepWithExtras;
	isCurrent: boolean;
	department?: string;
	subDepartment?: string;
	frozen?: boolean;
}

function statusMeta(status: string) {
	switch (status) {
		case "complete":
			return {
				label: "Complete",
				className: "bg-green/10 text-green border-green/25",
				Icon: CheckCircle2,
			};
		case "current":
			return {
				label: "In progress",
				className: "bg-orange/10 text-orange border-orange/30",
				Icon: Clock,
			};
		case "changes_requested":
			return {
				label: "Changes requested",
				className: "bg-orange/10 text-orange border-orange/30",
				Icon: Clock,
			};
		case "rejected":
			return {
				label: "Rejected",
				className: "bg-red/10 text-red border-red/25",
				Icon: XCircle,
			};
		default:
			return {
				label: "Pending",
				className: "bg-slate-100 text-slate-600 border-slate-200",
				Icon: Clock,
			};
	}
}

function InfoHint({ label }: { label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					className="inline-flex shrink-0 cursor-help rounded-full text-slate-400 transition-colors hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label={label}
				>
					<Info className="h-3 w-3" />
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				className="max-w-[220px] border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-md"
			>
				{label}
			</TooltipContent>
		</Tooltip>
	);
}

function ParticipantAvatar({
	participant,
}: {
	participant: ApprovalParticipant;
}) {
	const [imageFailed, setImageFailed] = useState(false);
	const initials = (participant.fullName || "U")
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);
	const showImage = Boolean(participant.profileImageUrl) && !imageFailed;

	useEffect(() => {
		setImageFailed(false);
	}, [participant.profileImageUrl]);

	if (showImage) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={participant.profileImageUrl || ""}
				alt={participant.fullName || "Profile"}
				className="h-6 w-6 rounded-full border border-slate-200 object-cover"
				onError={() => setImageFailed(true)}
			/>
		);
	}

	return (
		<div
			className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white"
			style={{ backgroundColor: getAvatarColor(participant.userId) }}
			aria-hidden
		>
			{initials || <User className="h-3 w-3" />}
		</div>
	);
}

export default function ApprovalFlowNode({
	step,
	isCurrent,
	department,
	subDepartment,
	frozen = false,
}: ApprovalFlowNodeProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	/** Track prior status so we only celebrate the pending → complete transition. */
	const prevStatusRef = useRef<string | null>(null);
	const hasCelebratedRef = useRef(false);

	const meta = statusMeta(step.status);
	const StatusIcon = meta.Icon;
	// Always use the contract's org unit so every step card matches.
	const deptLabel = department;
	const divisionLabel = subDepartment;

	useEffect(() => {
		if (step.kind !== "activated") return;

		const prev = prevStatusRef.current;
		prevStatusRef.current = step.status;

		// First paint: remember status only (skip already-activated reopen).
		if (prev === null) return;
		if (step.status !== "complete" || prev === "complete") return;
		if (hasCelebratedRef.current) return;

		hasCelebratedRef.current = true;
		const el = cardRef.current;
		// Bring Activated into view so the burst reads as coming from the card.
		el?.scrollIntoView({
			behavior: "smooth",
			inline: "center",
			block: "nearest",
		});
		window.setTimeout(() => {
			fireCaalmConfettiFromElement(el, { count: 110 });
		}, 180);
	}, [step.kind, step.status]);

	const notifiedNames = step.notifications
		.flatMap((n) => n.recipientUserIds)
		.filter(Boolean);
	const uniqueNotified = [...new Set(notifiedNames)];
	const notifiedLabels = uniqueNotified
		.map((id) => {
			const p = step.participants.find((x) => x.userId === id);
			return p?.fullName || null;
		})
		.filter(Boolean) as string[];

	const assigneeLabel = (() => {
		if (step.kind === "activated") {
			if (step.status === "complete") {
				const name = step.participants[0]?.fullName;
				return name ? `Live — approved by ${name}` : "Live";
			}
			return "Waiting for executive approval";
		}
		if (step.participants.length === 0) {
			return step.kind === "awaiting_executive"
				? "No executive assigned"
				: "No one assigned";
		}
		return step.participants
			.map((p) => p.fullName)
			.slice(0, 2)
			.join(", ");
	})();

	const showAssigneeApproverHint =
		Boolean(step.assigneeHint) &&
		(step.kind === "department_review" ||
			step.kind === "internal_approval" ||
			step.kind === "executive_approval" ||
			step.kind === "awaiting_executive");

	// Keep "Awaiting executive" on one line (non-breaking space)
	const titleLabel = step.label.replace(
		/Awaiting\s+executive/gi,
		"Awaiting\u00A0executive",
	);
	const countdown = isCurrent && !frozen ? slaCountdownLabel(step.dueAt) : "";
	const slaPill = frozen
		? null
		: isCurrent && step.slaStatus === "breached"
			? {
					label: countdown || "SLA breached",
					className: "bg-red/10 text-red border-red/20",
				}
			: isCurrent && step.slaStatus === "at_risk"
				? {
						label: countdown || "At risk",
						className: "bg-orange/10 text-orange border-orange/20",
					}
				: countdown
					? {
							label: countdown,
							className: "bg-green/10 text-green border-green/20",
						}
					: null;

	const orgUnitHint =
		"This contract or license is associated with this department and division.";
	const approverHint =
		"This person is an approving official and must approve before the workflow can move to the next step.";

	return (
		<TooltipProvider delayDuration={200}>
			<div
				ref={cardRef}
				className={cn(
					"relative w-[300px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm sm:w-[320px]",
					"transition-all duration-200",
					isCurrent && "approval-step-current-pulse",
				)}
			>
				<div className="glass-card-cap" />
				<div className="px-5 pt-6 pb-[18px]">
					<div className="mb-3 flex items-start justify-between gap-3">
						<p className="min-w-0 flex-1 text-[15px] font-bold leading-snug sidebar-gradient-text">
							{titleLabel}
						</p>
						<div className="flex shrink-0 flex-col items-end gap-1">
							<span
								className={cn(
									"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
									meta.className,
								)}
							>
								<StatusIcon className="h-2.5 w-2.5" />
								{meta.label}
							</span>
							{slaPill ? (
								<a
									href="#approval-activity"
									className={cn(
										"inline-block px-2 py-0.5 text-xs rounded-full font-medium border",
										slaPill.className,
									)}
								>
									{slaPill.label}
								</a>
							) : null}
						</div>
					</div>

					{deptLabel || divisionLabel ? (
						<div className="mb-3.5 space-y-2">
							{deptLabel ? (
								<p className="text-[11.5px] leading-snug text-slate-600">
									Department - {deptLabel}
								</p>
							) : null}
							{divisionLabel ? (
								<p className="flex items-center gap-1 text-[11.5px] leading-snug text-slate-600">
									<span>Division - {divisionLabel}</span>
									<InfoHint label={orgUnitHint} />
								</p>
							) : null}
						</div>
					) : (
						<div className="mb-3.5" />
					)}

					<div className="mb-3 h-px bg-slate-200" />

					{/* Assignee */}
					<div className="flex items-center gap-2">
						{step.participants.length === 0 ? (
							<div
								className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] border-dashed border-slate-300"
								aria-hidden
							>
								<User className="h-3 w-3 text-slate-400" />
							</div>
						) : (
							<div className="flex items-center">
								{step.participants.slice(0, 3).map((p, idx) => (
									<div
										key={p.userId}
										className={cn(idx > 0 && "-ml-1.5")}
										title={p.fullName}
									>
										<ParticipantAvatar participant={p} />
									</div>
								))}
								{step.participants.length > 3 ? (
									<span className="ml-1 text-[10px] text-slate-500">
										+{step.participants.length - 3}
									</span>
								) : null}
							</div>
						)}
						<div className="min-w-0">
							<p className="truncate text-xs font-semibold text-slate-600">
								{assigneeLabel}
							</p>
							{step.assigneeHint ? (
								<p className="flex items-center gap-1 text-[10px] text-slate-500">
									<span className="truncate">{step.assigneeHint}</span>
									{showAssigneeApproverHint ? (
										<InfoHint label={approverHint} />
									) : null}
								</p>
							) : null}
						</div>
					</div>

					{(step.notifications.length > 0 || notifiedLabels.length > 0) && (
						<div className="mt-3 flex items-start gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600">
							<Bell className="mt-0.5 h-3 w-3 shrink-0 text-[#0f5384]" />
							<span className="leading-snug">
								Notified:{" "}
								{notifiedLabels.length > 0
									? notifiedLabels.slice(0, 3).join(", ")
									: `${uniqueNotified.length} recipient${uniqueNotified.length === 1 ? "" : "s"}`}
							</span>
						</div>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
}
