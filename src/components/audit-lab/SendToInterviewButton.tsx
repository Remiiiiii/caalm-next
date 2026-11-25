"use client";

import { Check, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { useAuditLabCall } from "@/contexts/AuditLabCallContext";
import { cn } from "@/lib/utils";
import type { UIFileDoc } from "@/types/files";

/**
 * Per-row "send to interview" action for the document repository
 * (/documents, /images, etc.). Only renders while a voice interview is live
 * or connecting — reads the same `AuditLabCallContext` the floating call
 * widget and rubric panel do, so there is exactly one call/transcript
 * regardless of which UI triggers the attach.
 *
 * Attaches to whichever rubric item is currently active in the interview,
 * if any; otherwise it's logged as general evidence (no `questionId`), same
 * as dropping a file on the floating widget with nothing active. Choosing
 * between several open rubric items is a follow-up — this covers the common
 * case first.
 */
export function SendToInterviewButton({ file }: { file: UIFileDoc }) {
	const call = useAuditLabCall();
	const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

	const isCallActive = call.phase === "live" || call.phase === "connecting";
	if (!isCallActive) return null;

	async function handleClick() {
		if (state === "sending") return;
		setState("sending");
		await call.attachExistingFile(
			file.$id,
			call.coverage?.currentQuestionId ?? undefined,
		);
		setState("sent");
		setTimeout(() => setState("idle"), 1500);
	}

	return (
		<button
			type="button"
			title="Send to interview"
			aria-label={`Send ${file.name || "file"} to the live interview`}
			disabled={state === "sending"}
			onClick={handleClick}
			className={cn(
				"inline-flex size-8 items-center justify-center rounded-full text-[#078fab] transition-colors hover:bg-[#078fab]/10 disabled:cursor-not-allowed disabled:opacity-60",
			)}
		>
			{state === "sending" ? (
				<Loader2 className="h-4 w-4 animate-spin" aria-hidden />
			) : state === "sent" ? (
				<Check className="h-4 w-4 text-[#22c55e]" aria-hidden />
			) : (
				<Send className="h-4 w-4" aria-hidden />
			)}
		</button>
	);
}
