/**
 * CAALM toast API — wraps Sonner's toast.custom() with the three spec patterns.
 *
 * Usage:
 *   caalmToast.base({ tone: "info", title: "Downloaded", message: "report.pdf" })
 *   caalmToast.attribution({ title: "Analysis complete", message: "...", status: "success" })
 *   const job = caalmToast.working({ title: "Creating task…", message: "Checking permissions" })
 *   job.settle("done", "Task created", "Added to Assign Tasks.", [...actions])
 */

import React from "react";
import { toast } from "sonner";
import type { Action, AttributionToastProps, BaseToastProps, Tone } from "@/components/ui/caalm-toast";
import { AttributionToast, BaseToast, TONE_DURATION, WorkingToast } from "@/components/ui/caalm-toast";

function toneToSonnerDuration(tone: Tone) {
	const d = TONE_DURATION[tone];
	return Number.isFinite(d) ? d : Number.POSITIVE_INFINITY;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const caalmToast = {
	/**
	 * Pattern 0 — system event toast (no robot).
	 */
	base(props: Omit<BaseToastProps, "id" | "onDismiss">) {
		const tone = props.tone ?? "neutral";
		const duration =
			props.duration != null
				? props.duration
				: toneToSonnerDuration(tone);
		const id = toast.custom(
			(toastId) =>
				React.createElement(BaseToast, {
					...props,
					id: toastId,
					onDismiss: () => toast.dismiss(toastId),
				}),
			{
				duration,
				unstyled: true,
				classNames: { toast: "!p-0 !bg-transparent !border-none !shadow-none" },
			},
		);
		return id;
	},

	/**
	 * Pattern 1 — assistant result toast (robot tile with outcome badge).
	 */
	attribution(props: Omit<AttributionToastProps, "id" | "onDismiss">) {
		const tone = props.tone ?? (props.status === "success" ? "success" : "error");
		const id = toast.custom(
			(toastId) =>
				React.createElement(AttributionToast, {
					...props,
					id: toastId,
					onDismiss: () => toast.dismiss(toastId),
				}),
			{
				duration: toneToSonnerDuration(tone),
				unstyled: true,
				classNames: { toast: "!p-0 !bg-transparent !border-none !shadow-none" },
			},
		);
		return id;
	},

	/**
	 * Pattern 4 — working → done/failed ring.
	 * Returns the toast id and a `settle` function to transition state.
	 */
	working(props: { title: string; message?: string }) {
		const id = toast.custom(
			(toastId) =>
				React.createElement(WorkingToast, {
					id: toastId,
					state: "working",
					title: props.title,
					message: props.message,
					onDismiss: () => toast.dismiss(toastId),
				}),
			{
				duration: Number.POSITIVE_INFINITY,
				unstyled: true,
				classNames: { toast: "!p-0 !bg-transparent !border-none !shadow-none" },
			},
		);

		return {
			id,
			/** Transition to done or failed, updating title/message/actions in place. */
			settle(
				state: "done" | "failed",
				title: string,
				message?: string,
				actions: Action[] = [],
			) {
				const duration = state === "done" ? 6000 : Number.POSITIVE_INFINITY;
				toast.custom(
					(toastId) =>
						React.createElement(WorkingToast, {
							id: toastId,
							state,
							title,
							message,
							actions,
							onDismiss: () => toast.dismiss(toastId),
						}),
					{
						id,
						duration,
						unstyled: true,
						classNames: { toast: "!p-0 !bg-transparent !border-none !shadow-none" },
					},
				);
			},
		};
	},
};
