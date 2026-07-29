"use client";

import { Bell, CheckCircle2, Clock, User, XCircle } from "lucide-react";
import { getAvatarColor } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
				className: "bg-green/10 text-green border-green/20",
				Icon: CheckCircle2,
			};
		case "current":
			return {
				label: "In progress",
				className: "bg-blue/10 text-[#0f5384] border-blue/20",
				Icon: Clock,
			};
		case "changes_requested":
			return {
				label: "Changes requested",
				className: "bg-orange/10 text-orange border-orange/20",
				Icon: Clock,
			};
		case "rejected":
			return {
				label: "Rejected",
				className: "bg-red/10 text-red border-red/20",
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

function ParticipantAvatar({ participant }: { participant: ApprovalParticipant }) {
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
				className="h-8 w-8 rounded-full border-2 border-white object-cover shadow-sm"
			/>
		);
	}

	return (
		<div
			className={cn(
				"flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm",
				avatarColor(participant.userId),
			)}
			aria-hidden
		>
			{initials || <User className="h-3.5 w-3.5" />}
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

	return (
		<div
			className={cn(
				"glass-card-frosted relative w-[200px] shrink-0 rounded-sm! text-card-foreground sm:w-[220px]",
				isCurrent && "ring-2 ring-[#0f5384]/35",
			)}
		>
			<div className="relative space-y-3 p-4">
				<div className="flex items-start justify-between gap-2">
					<div>
						<p className="text-sm font-semibold sidebar-gradient-text">
							{step.label}
						</p>
						{deptLine ? (
							<p className="mt-0.5 text-[11px] text-slate-500">{deptLine}</p>
						) : null}
					</div>
					<Badge
						variant="outline"
						className={cn("shrink-0 text-[10px]", meta.className)}
					>
						<StatusIcon className="mr-1 h-3 w-3" />
						{meta.label}
					</Badge>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center">
						{step.participants.length === 0 ? (
							<div className="flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/50 text-slate-400">
								<User className="h-3.5 w-3.5" />
							</div>
						) : (
							step.participants.slice(0, 3).map((p, idx) => (
								<div
									key={p.userId}
									className={cn(idx > 0 && "-ml-2")}
									title={p.fullName}
								>
									<ParticipantAvatar participant={p} />
								</div>
							))
						)}
						{step.participants.length > 3 ? (
							<span className="ml-1 text-[10px] text-slate-500">
								+{step.participants.length - 3}
							</span>
						) : null}
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-xs font-medium text-slate-900">
							{step.participants.length === 0
								? "Unassigned"
								: step.participants
										.map((p) => p.fullName)
										.slice(0, 2)
										.join(", ")}
						</p>
					</div>
				</div>

				{(step.notifications.length > 0 || notifiedLabels.length > 0) && (
					<div className="flex items-start gap-1.5 rounded-lg border border-white/40 bg-white/40 px-2 py-1.5 text-[10px] text-slate-600">
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
