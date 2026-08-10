"use client";

import { Bell, CheckCircle2, Clock, User, XCircle } from "lucide-react";
import { getAvatarColor } from "@/components/ui/avatar";
import type {
	ApprovalParticipant,
	ApprovalWorkflowNotification,
	ApprovalWorkflowStep,
} from "@/lib/approvals/contractApprovalWorkflow.types";
import { cn } from "@/lib/utils";

function avatarColor(id: string): string {
	try {
		return getAvatarColor(id) || "bg-slate-400";
	} catch {
		return "bg-slate-400";
	}
}

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

function ParticipantAvatar({
	participant,
}: {
	participant: ApprovalParticipant;
}) {
	const initials = (participant.fullName || "U")
		.split(" ")
		.map((n) => n.charAt(0))
		.join("")
		.toUpperCase()
		.slice(0, 2);

	if (participant.profileImageUrl) {
		return (
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={participant.profileImageUrl}
				alt={participant.fullName || "Profile"}
				className="h-6 w-6 rounded-full border border-slate-200 object-cover"
			/>
		);
	}

	return (
		<div
			className={cn(
				"flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold text-white",
				avatarColor(participant.userId),
			)}
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
}: ApprovalFlowNodeProps) {
	const meta = statusMeta(step.status);
	const StatusIcon = meta.Icon;
	const primary = step.participants[0];
	const deptLine = [
		primary?.department || department,
		primary?.subDepartment || subDepartment,
	]
		.filter(Boolean)
		.join(" · ");

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

	// Keep "Awaiting executive" on one line (non-breaking space)
	const titleLabel = step.label.replace(
		/Awaiting\s+executive/gi,
		"Awaiting\u00A0executive",
	);

	return (
		<div
			className={cn(
				"relative w-[300px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm sm:w-[320px]",
				"transition-all duration-200",
				isCurrent &&
					"border-[#0f5384]/20 shadow-md ring-2 ring-[#0f5384]/30",
			)}
		>
			<div className="glass-card-cap" />
			<div className="px-5 pt-6 pb-[18px]">
				<div className="mb-3 flex items-start justify-between gap-3">
					<p className="min-w-0 flex-1 text-[15px] font-bold leading-snug sidebar-gradient-text">
						{titleLabel}
					</p>
					<span
						className={cn(
							"inline-flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[10px] font-medium uppercase tracking-wide",
							meta.className,
						)}
					>
						<StatusIcon className="h-2.5 w-2.5" />
						{meta.label}
					</span>
				</div>

				{/* Department / category */}
				{deptLine ? (
					<div className="mb-3.5 flex items-center gap-1.5">
						<span
							className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
							aria-hidden
						/>
						<p className="text-[11.5px] leading-snug text-slate-600">
							{deptLine}
						</p>
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
							<p className="truncate text-[10px] text-slate-500">
								{step.assigneeHint}
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
	);
}
