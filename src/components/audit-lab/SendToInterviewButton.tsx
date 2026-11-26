"use client";

import { Check, Loader2, Send } from "lucide-react";
import { useState } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAuditLabCall } from "@/contexts/AuditLabCallContext";
import type { RepositoryRecordKind } from "@/lib/audit-lab/voice/attachments-client";
import { cn } from "@/lib/utils";

/**
 * Per-row "send to interview" action for the document repository —
 * /documents (and friends) for generic uploads, /contracts and /licenses
 * for those record kinds. Only renders while a voice interview is actually
 * live — not "connecting" (the room hasn't been joined yet, so there's
 * nothing to attach evidence to) and not idle/ended. Reads the same
 * `AuditLabCallContext` the floating call widget and rubric panel do, so
 * there is exactly one call/transcript regardless of which UI triggers the
 * attach.
 *
 * - Zero open rubric items that call for evidence: sends immediately as
 *   general evidence (no `questionId`).
 * - Exactly one: sends straight to it, same as before.
 * - More than one: opens a small picker so the user says which item this
 *   file answers, instead of guessing from whichever question happens to
 *   be "current".
 */
export function SendToInterviewButton({
	fileId,
	fileName,
	recordKind = "file",
}: {
	fileId: string;
	fileName: string;
	recordKind?: RepositoryRecordKind;
}) {
	const call = useAuditLabCall();
	const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
	const [pickerOpen, setPickerOpen] = useState(false);

	if (call.phase !== "live") return null;

	const openItems = (call.coverage?.items ?? []).filter(
		(item) => item.status !== "covered" && item.requiresEvidence,
	);

	async function sendTo(questionId?: string) {
		setPickerOpen(false);
		if (state === "sending") return;
		setState("sending");
		await call.attachExistingFile(fileId, recordKind, questionId);
		setState("sent");
		setTimeout(() => setState("idle"), 1500);
	}

	const icon =
		state === "sending" ? (
			<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
		) : state === "sent" ? (
			<Check className="h-4 w-4 text-[#22c55e]" aria-hidden />
		) : (
			<Send className="h-4 w-4" aria-hidden />
		);

	const triggerButtonClass = cn(
		"inline-flex size-8 items-center justify-center rounded-full text-[#078fab] transition-colors hover:bg-[#078fab]/10 disabled:cursor-not-allowed disabled:opacity-60",
	);

	if (openItems.length <= 1) {
		return (
			<button
				type="button"
				title="Send to interview"
				aria-label={`Send ${fileName || "file"} to the live interview`}
				disabled={state === "sending"}
				onClick={() => void sendTo(openItems[0]?.questionId)}
				className={triggerButtonClass}
			>
				{icon}
			</button>
		);
	}

	return (
		<Popover open={pickerOpen} onOpenChange={setPickerOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					title="Send to interview"
					aria-label={`Send ${fileName || "file"} to the live interview`}
					disabled={state === "sending"}
					className={triggerButtonClass}
				>
					{icon}
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 bg-white/95 p-2">
				<p className="mb-1.5 px-2 pt-1 text-xs font-semibold text-slate-500">
					Which rubric item is this evidence for?
				</p>
				<div className="max-h-64 space-y-0.5 overflow-y-auto">
					{openItems.map((item) => (
						<button
							key={item.questionId}
							type="button"
							onClick={() => void sendTo(item.questionId)}
							className={cn(
								"w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100",
								item.status === "current" && "font-medium text-[#078fab]",
							)}
						>
							{item.prompt}
						</button>
					))}
					<button
						type="button"
						onClick={() => void sendTo(undefined)}
						className="w-full rounded px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100"
					>
						General evidence (no specific item)
					</button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
