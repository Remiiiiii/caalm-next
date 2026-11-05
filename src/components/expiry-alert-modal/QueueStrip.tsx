"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { ExpiryQueue } from "@/components/expiry-alert-modal/expiry-alert-types";
import { formatQueueSummaryLine } from "@/lib/expiry/queue-summary";
import { getUrgencyTier, getUrgencyTone } from "@/lib/expiry/urgency";
import { cn } from "@/lib/utils";

/** Time for the list to finish opening/closing before the robot relocates. */
export const QUEUE_EXPAND_MS = 420;
export const QUEUE_COLLAPSE_MS = 320;

const MAX_ROWS = 4;

const DAYS_TEXT: Record<"danger" | "warning" | "info", string> = {
	danger: "text-red",
	warning: "text-orange",
	info: "text-blue",
};

function ProgressRing({ fraction }: { fraction: number }) {
	const r = 8;
	const c = 2 * Math.PI * r;
	const clamped = Math.max(0, Math.min(1, fraction));
	return (
		<svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20" aria-hidden="true">
			<circle
				cx="10"
				cy="10"
				r={r}
				fill="none"
				stroke="#e2e8f0"
				strokeWidth="2"
			/>
			<circle
				cx="10"
				cy="10"
				r={r}
				fill="none"
				stroke="#078FAB"
				strokeWidth="2"
				strokeLinecap="round"
				strokeDasharray={c}
				strokeDashoffset={c * (1 - clamped)}
			/>
		</svg>
	);
}

export default function QueueStrip({
	queue,
	onExpandedChange,
}: {
	queue: ExpiryQueue;
	/** Fires when the queue list opens/closes (robot Point / step-aside). */
	onExpandedChange?: (expanded: boolean) => void;
}) {
	const {
		rows,
		currentIndex,
		nextIndex,
		countdownSeconds,
		countdownTotal,
		onJump,
		defaultExpanded,
		overdue,
		within30,
		amountSum,
	} = queue;

	const [expanded, setExpanded] = useState(defaultExpanded);
	useEffect(() => {
		setExpanded(defaultExpanded);
	}, [defaultExpanded]);

	useEffect(() => {
		onExpandedChange?.(expanded);
	}, [expanded, onExpandedChange]);

	const summaryLine = formatQueueSummaryLine({
		total: rows.length,
		overdue,
		within30,
		amountSum,
	});
	const visibleRows = rows.slice(0, MAX_ROWS);
	const hiddenCount = rows.length - visibleRows.length;
	const ringFraction =
		countdownSeconds !== null && countdownTotal > 0
			? countdownSeconds / countdownTotal
			: 0;

	return (
		<div className="border-t border-slate-200/70 bg-slate-50/50">
			<button
				type="button"
				onClick={() => setExpanded((v) => !v)}
				aria-expanded={expanded}
				className="flex w-full cursor-pointer items-center gap-3 px-5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
			>
				<span className="text-sm font-semibold text-slate-700">
					Queue · {rows.length} items
				</span>
				{summaryLine && (
					<span className="min-w-0 flex-1 truncate text-xs text-slate-500">
						{summaryLine}
					</span>
				)}
				<ChevronDown
					className={cn(
						"h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
						expanded && "rotate-180",
					)}
					aria-hidden="true"
				/>
			</button>

			<AnimatePresence initial={false}>
				{expanded && (
					<motion.div
						key="queue-list"
						initial={{ height: 0, opacity: 0 }}
						animate={{
							height: "auto",
							opacity: 1,
							transition: {
								height: {
									duration: QUEUE_EXPAND_MS / 1000,
									ease: [0.22, 1, 0.36, 1],
								},
								opacity: { duration: 0.22, ease: "easeOut" },
							},
						}}
						exit={{
							height: 0,
							opacity: 0,
							transition: {
								height: {
									duration: QUEUE_COLLAPSE_MS / 1000,
									ease: [0.22, 1, 0.36, 1],
								},
								opacity: { duration: 0.18, ease: "easeIn" },
							},
						}}
						className="overflow-hidden"
					>
						<div className="px-2 pb-2">
							{visibleRows.map((row, index) => {
								const tier = getUrgencyTier(row.days);
								const tone = getUrgencyTone(tier);
								const isCurrent = index === currentIndex;
								const isNext = index === nextIndex;
								const dayValue = row.days < 0 ? Math.abs(row.days) : row.days;
								return (
									<button
										key={row.id}
										type="button"
										onClick={() => onJump(index)}
										aria-label={`${row.title}, ${row.kind}, ${
											row.days < 0
												? `${dayValue} days overdue`
												: `${dayValue} days`
										}${row.amount !== null ? `, $${row.amount.toLocaleString()}` : ""}`}
										className={cn(
											"flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
											isCurrent && "bg-blue/10",
											row.done && "opacity-50",
										)}
									>
										<span
											aria-hidden="true"
											className={cn(
												"h-2.5 w-2.5 shrink-0 rounded-full",
												row.done
													? "bg-green"
													: isCurrent
														? "bg-[#0f5384] ring-2 ring-[#0f5384]/30"
														: "bg-slate-300",
											)}
										/>
										<span
											className={cn(
												"w-10 shrink-0 text-right text-sm font-semibold tabular-nums",
												DAYS_TEXT[tone],
											)}
										>
											{dayValue}
											<span className="block text-[10px] font-normal text-slate-400">
												{row.days < 0 ? "Over" : "Days"}
											</span>
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-medium text-slate-700">
												{row.title}
											</span>
											<span className="block truncate text-xs text-slate-400 capitalize">
												{row.kind} · {row.dateLabel}
											</span>
										</span>
										{row.amount !== null && (
											<span className="shrink-0 text-sm tabular-nums text-slate-600">
												$
												{row.amount.toLocaleString(undefined, {
													maximumFractionDigits: 0,
												})}
											</span>
										)}
										<span className="flex h-5 w-5 shrink-0 items-center justify-center">
											{isNext && countdownSeconds !== null ? (
												<ProgressRing fraction={ringFraction} />
											) : (
												<ChevronDown className="h-4 w-4 -rotate-90 text-slate-300" />
											)}
										</span>
									</button>
								);
							})}

							{hiddenCount > 0 && (
								<p className="px-3 py-2 text-xs text-slate-400">
									{hiddenCount} more {hiddenCount === 1 ? "item" : "items"}
								</p>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
