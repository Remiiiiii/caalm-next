"use client";

/**
 * Drop-in replacement for the old shadcn use-toast hook.
 * All calls are now routed through caalmToast.base() (Sonner under the hood),
 * giving them the CAALM toast UI automatically.
 *
 * API surface is preserved:
 *   const { toast, dismiss } = useToast()
 *   toast({ title, description, variant, action })
 */

import type React from "react";
import { toast as sonnerDismiss } from "sonner";
import type { Tone } from "@/components/ui/caalm-toast";
import { caalmToast } from "@/lib/ui/caalm-toast";

// ─── Types (kept for call-site compatibility) ─────────────────────────────────

export interface ToastProps {
	variant?: "default" | "destructive";
}

export type ToastActionElement = React.ReactElement;

type ToastInput = {
	title?: React.ReactNode;
	description?: React.ReactNode;
	variant?: "default" | "destructive";
	/** Legacy React-element action (e.g. <ToastAction altText="Undo">…</ToastAction>). Rendered as-is. */
	action?: ToastActionElement;
	/** Structured action list for new call sites. */
	actions?: Array<{ label: string; onClick: () => void }>;
	/** Explicit tone override; inferred from variant when absent. */
	tone?: Tone;
	/** Override auto-dismiss duration in ms (Infinity = persist). */
	duration?: number;
	/** Accepted but ignored — CAALM toast does not support arbitrary className. */
	className?: string;
};

// ─── Core function ────────────────────────────────────────────────────────────

function toast(props: ToastInput) {
	const tone: Tone =
		props.tone ?? (props.variant === "destructive" ? "error" : "neutral");

	const message =
		props.description != null ? String(props.description) : undefined;

	const id = caalmToast.base({
		tone,
		title: props.title != null ? String(props.title) : "",
		message,
		actions: props.actions,
		renderAction: props.action,
		duration: props.duration,
	});

	return {
		id,
		dismiss: () => sonnerDismiss.dismiss(id),
		// update is a no-op: use caalmToast directly for live updates
		update: (_: ToastInput) => {},
	};
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useToast() {
	return {
		toast,
		dismiss: (toastId?: string | number) => sonnerDismiss.dismiss(toastId),
		// toasts array kept for type compat; always empty since Sonner owns the state
		toasts: [] as never[],
	};
}

export { toast, useToast };
