"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import type { AnchoredPlacement } from "@/hooks/useAnchoredPosition";
import type { DemoTip } from "@/lib/demo/tour/tips";
import { cn } from "@/lib/utils";

type DemoTipCardProps = {
	tip: DemoTip;
	top: number;
	left: number;
	placement: AnchoredPlacement;
	stepCurrent: number;
	stepTotal: number;
	hasPrevious: boolean;
	hasNext: boolean;
	onPrevious: () => void;
	onNext: () => void;
	onDismiss: () => void;
};

const HIGHLIGHT_CLASS = "ring-2";
const HIGHLIGHT_RING = "ring-[#0f5384]/40";

const chevronClassName =
	"inline-flex items-center justify-center rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:opacity-0 disabled:pointer-events-none";

export function DemoTipCard({
	tip,
	top,
	left,
	placement,
	stepCurrent,
	stepTotal,
	hasPrevious,
	hasNext,
	onPrevious,
	onNext,
	onDismiss,
}: DemoTipCardProps) {
	const titleId = useId();
	const navRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		navRef.current?.focus();
	}, []);

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onDismiss();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [onDismiss]);

	useEffect(() => {
		if (placement === "center") return;
		const el = document.querySelector(tip.targetSelector);
		if (!el) return;
		el.classList.add(HIGHLIGHT_CLASS, HIGHLIGHT_RING, "rounded-md");
		return () => {
			el.classList.remove(HIGHLIGHT_CLASS, HIGHLIGHT_RING, "rounded-md");
		};
	}, [tip.targetSelector, placement]);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			className={cn(
				"fixed z-[101] w-[min(340px,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-xl border border-slate-200",
				placement === "center" &&
					"left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
				placement === "right" && "-translate-y-1/2",
			)}
			style={placement === "center" ? undefined : { top, left }}
			onClick={(e) => e.stopPropagation()}
		>
			<div className="flex items-start justify-between gap-3 mb-3">
				<h2
					id={titleId}
					className="text-base font-semibold sidebar-gradient-text leading-snug"
				>
					{tip.title}
				</h2>
				<button
					type="button"
					onClick={onDismiss}
					aria-label="Dismiss tip"
					className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{tip.image ? (
				<div className="relative mb-3 h-36 w-full overflow-hidden rounded-xl bg-slate-100">
					<Image
						src={tip.image}
						alt=""
						fill
						className="object-cover"
						sizes="340px"
					/>
				</div>
			) : null}

			<p className="text-sm text-slate-600 leading-relaxed mb-4">{tip.body}</p>

			<div className="flex items-center justify-between gap-3">
				<button
					type="button"
					onClick={onPrevious}
					disabled={!hasPrevious}
					aria-label="Previous tip"
					className={chevronClassName}
				>
					<ChevronLeft className="h-5 w-5" aria-hidden="true" />
				</button>

				<span className="text-xs font-medium text-slate-500 tabular-nums">
					{stepCurrent} of {stepTotal}
				</span>

				<button
					ref={navRef}
					type="button"
					onClick={onNext}
					disabled={!hasNext}
					aria-label="Next tip"
					className={chevronClassName}
				>
					<ChevronRight className="h-5 w-5" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
