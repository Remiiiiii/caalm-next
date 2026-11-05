"use client";

import {
	AlertTriangle,
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
import { cn } from "@/lib/utils";

type UrgencyBandProps = {
	daysRemaining: number;
	dateLabel: string;
	renewing: boolean;
	position?: { index: number; total: number };
	onPrev?: () => void;
	onNext?: () => void;
	onClose: () => void;
	isBusy?: boolean;
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
	position,
	onPrev,
	onNext,
	onClose,
	isBusy,
}: UrgencyBandProps) {
	const tier = getUrgencyTier(daysRemaining);
	const tone = getUrgencyTone(tier);
	const copy = formatUrgencyBandCopy({ daysRemaining, dateLabel, renewing });
	const Icon = tone === "danger" ? AlertTriangle : Clock;
	const showNav = !!position && position.total > 1;

	return (
		<div
			className={cn(
				"flex items-center gap-3 border-b px-5 py-3",
				TONE_BAND[tone],
			)}
		>
			<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
			{/* Text carries the urgency meaning (never color alone). */}
			<p className="min-w-0 flex-1 truncate text-sm font-semibold">{copy}</p>

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
