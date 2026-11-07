"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Clock,
	X,
} from "lucide-react";
import {
	formatUrgencyBandCopy,
	getUrgencyTier,
	getUrgencyTone,
} from "@/lib/expiry/urgency";
import {
	CONTENT_CROSSFADE_PRESENCE_MODE,
	contentCrossfadeAnimate,
	contentCrossfadeExit,
	contentCrossfadeInitial,
	contentCrossfadeTransition,
} from "@/lib/ui/content-crossfade";
import { cn } from "@/lib/utils";

type UrgencyBandProps = {
	daysRemaining: number;
	dateLabel: string;
	renewing: boolean;
	/** Same key as the body panel so header + body fade together on slide change. */
	contentKey?: string;
	position?: { index: number; total: number };
	onPrev?: () => void;
	onNext?: () => void;
	onClose: () => void;
	isBusy?: boolean;
	/** Shown to the left of the message, only while the file view is open. */
	onBack?: () => void;
};

// Band tone comes from the tier so it tracks time, not a fixed accent color.
const TONE_BAND: Record<"danger" | "warning" | "info", string> = {
	danger: "bg-red/10 text-red border-red/20",
	warning: "bg-orange/10 text-orange border-orange/20",
	info: "bg-blue/10 text-blue border-blue/20",
};

export default function UrgencyBand({
	daysRemaining,
	dateLabel,
	renewing,
	contentKey,
	position,
	onPrev,
	onNext,
	onClose,
	isBusy,
	onBack,
}: UrgencyBandProps) {
	const tier = getUrgencyTier(daysRemaining);
	const tone = getUrgencyTone(tier);
	const copy = formatUrgencyBandCopy({ daysRemaining, dateLabel, renewing });
	const Icon = tone === "danger" ? AlertTriangle : Clock;
	const showNav = !!position && position.total > 1;
	const fadeKey = contentKey ?? copy;

	return (
		<div
			className={cn(
				"flex items-center gap-3 border-b px-5 py-3 transition-colors duration-500",
				TONE_BAND[tone],
			)}
		>
			{onBack && (
				<button
					type="button"
					onClick={onBack}
					className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
				>
					<ArrowLeft className="h-4 w-4" aria-hidden />
					Back to alert
				</button>
			)}
			{/* Message fades with the slide; nav/X stay put so they don't jump. */}
			<div className="relative min-h-5 min-w-0 flex-1">
				<AnimatePresence
					mode={CONTENT_CROSSFADE_PRESENCE_MODE}
					initial={false}
				>
					<motion.div
						key={fadeKey}
						initial={contentCrossfadeInitial}
						animate={contentCrossfadeAnimate}
						exit={contentCrossfadeExit}
						transition={contentCrossfadeTransition}
						className="flex items-center gap-3"
					>
						<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
						{/* Text carries the urgency meaning (never color alone). */}
						<p className="min-w-0 flex-1 truncate text-sm font-semibold">
							{copy}
						</p>
					</motion.div>
				</AnimatePresence>
			</div>

			<div className="flex shrink-0 items-center gap-1.5">
				{showNav && position && (
					<span className="mr-1 text-sm font-semibold tabular-nums opacity-90">
						{position.index + 1} / {position.total}
					</span>
				)}
				{showNav && (
					<>
						<button
							type="button"
							onClick={onPrev}
							aria-label="Previous alert"
							className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={onNext}
							aria-label="Next alert"
							className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
						<span className="mx-1 h-5 w-px bg-current/20" aria-hidden="true" />
					</>
				)}
				<button
					type="button"
					onClick={onClose}
					disabled={isBusy}
					aria-label="Dismiss for this session"
					className="inline-flex cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:opacity-50"
				>
					<X className="h-4 w-4" />
				</button>
			</div>
		</div>
	);
}
