"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
	open: boolean;
	onClose: () => void;
	title: string;
	titleClassName?: string;
	children: ReactNode;
	footer?: ReactNode;
	className?: string;
};

export default function AssistantInPanelOverlay({
	open,
	onClose,
	title,
	titleClassName,
	children,
	footer,
	className,
}: Props) {
	if (!open) return null;

	return (
		<div
			className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-900/25 p-4 backdrop-blur-[2px]"
			role="presentation"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="assistant-in-panel-title"
				className={cn(
					"relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl",
					className,
				)}
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label="Close"
				>
					<X className="h-4 w-4" />
				</button>
				<h2
					id="assistant-in-panel-title"
					className={cn(
						"pr-8 text-center text-lg font-semibold text-slate-900",
						titleClassName,
					)}
				>
					{title}
				</h2>
				<div className="mt-3 text-center text-sm text-slate-600">
					{children}
				</div>
				{footer ? <div className="mt-5">{footer}</div> : null}
			</div>
		</div>
	);
}

export function AssistantInPanelActions({
	cancelLabel = "Cancel",
	confirmLabel,
	onCancel,
	onConfirm,
	confirmDisabled,
}: {
	cancelLabel?: string;
	confirmLabel: string;
	onCancel: () => void;
	onConfirm: () => void;
	confirmDisabled?: boolean;
}) {
	return (
		<div className="flex items-center justify-end gap-3">
			<Button
				type="button"
				variant="ghost"
				className="cursor-pointer text-[#0f5384] hover:bg-transparent hover:text-[#0f5384]"
				onClick={onCancel}
			>
				{cancelLabel}
			</Button>
			<Button
				type="button"
				className="primary-btn cursor-pointer rounded-full px-4"
				onClick={onConfirm}
				disabled={confirmDisabled}
			>
				{confirmLabel}
			</Button>
		</div>
	);
}
