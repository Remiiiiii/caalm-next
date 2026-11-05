"use client";

import { format, parseISO } from "date-fns";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Mail, Phone } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import ActionRail from "@/components/expiry-alert-modal/ActionRail";
import ExpiryAlertFooterCap from "@/components/expiry-alert-modal/ExpiryAlertFooterCap";
import ExpiryAlertSpline, {
	type ExpiryRobotNarration,
	type ExpiryRobotReaction,
} from "@/components/expiry-alert-modal/ExpiryAlertSpline";
import type {
	ExpiryNarration,
	ExpiryQueue,
} from "@/components/expiry-alert-modal/expiry-alert-types";
import NarrationBar from "@/components/expiry-alert-modal/NarrationBar";
import QueueStrip from "@/components/expiry-alert-modal/QueueStrip";
import UrgencyBand from "@/components/expiry-alert-modal/UrgencyBand";
import { EXPIRY_ALERT_SNOOZE_DAYS } from "@/lib/expiry/action-matrix";
import { formatExpiryTypeLabel } from "@/lib/expiry/expiry-format";
import {
	getDaysFact,
	getUrgencyTier,
	getUrgencyTone,
} from "@/lib/expiry/urgency";
import { MODAL_OVERLAY, MODAL_PANEL } from "@/lib/ui/modal-styles";
import { cn } from "@/lib/utils";

export type ExpiryEntityType = "contract" | "license";

export type { ExpiryNarration, ExpiryQueue };

export type ExpiryAlertModalProps = {
	open: boolean;
	entityType: ExpiryEntityType;
	title: string;
	expiryDate: string;
	daysRemaining: number;
	amount?: number | null;
	amountLabel?: string;
	status?: string | null;
	typeLabel?: string | null;
	contactEmail?: string;
	contactPhone?: string;
	snoozeDays?: number;
	renewing?: boolean;
	/** Renewal needs a desktop; show an inline note under Renew instead of hiding it. */
	renewRequiresDesktop?: boolean;
	onRenew: () => void;
	onViewDetails: () => void;
	onSnooze?: () => void;
	onDismiss?: () => void;
	onLetExpire?: () => void;
	onContactProvider?: () => void;
	/** Top-right X — dismiss for this session without a decision. */
	onClose: () => void;
	isBusy?: boolean;
	/** Only the body panel cross-fades when this changes (shell stays mounted). */
	contentKey?: string;
	/** Carousel chrome. */
	queuePosition?: { index: number; total: number };
	onPrev?: () => void;
	onNext?: () => void;
	narration?: ExpiryNarration | null;
	queue?: ExpiryQueue | null;
};

function formatExpiryDisplay(raw: string): string {
	if (!raw) return "—";
	try {
		const date = raw.includes("T")
			? parseISO(raw)
			: parseISO(`${raw}T12:00:00`);
		return format(date, "MMMM d, yyyy");
	} catch {
		return raw.slice(0, 10);
	}
}

const DAYS_TEXT: Record<"danger" | "warning" | "info", string> = {
	danger: "text-red",
	warning: "text-orange",
	info: "text-blue",
};

/**
 * Contained four-zone expiry alert card: urgency band, narration bar, split
 * body (record detail + action rail) and queue strip, centered over a dimmed,
 * blurred backdrop.
 */
export default function ExpiryAlertModal({
	open,
	entityType,
	title,
	expiryDate,
	daysRemaining,
	amount,
	amountLabel,
	status,
	contactEmail,
	contactPhone,
	snoozeDays = EXPIRY_ALERT_SNOOZE_DAYS,
	renewing = false,
	renewRequiresDesktop = false,
	onRenew,
	onViewDetails,
	onSnooze,
	onDismiss,
	onLetExpire,
	onContactProvider,
	onClose,
	isBusy = false,
	contentKey,
	queuePosition,
	onPrev,
	onNext,
	narration,
	queue,
}: ExpiryAlertModalProps) {
	const titleId = useId();
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActive = useRef<HTMLElement | null>(null);
	const panelKey = contentKey ?? `${entityType}-${title}-${expiryDate}`;
	const pointShownRef = useRef(false);
	const reactionTimerRef = useRef<number | null>(null);
	const pointTimerRef = useRef<number | null>(null);
	const [robotReaction, setRobotReaction] = useState<ExpiryRobotReaction>(null);
	/** Immediate queue open — robot holds 1s then trails (handled in Spline). */
	const [queueExpanded, setQueueExpanded] = useState(false);

	const fireRobotReaction = useCallback(
		(reaction: Exclude<ExpiryRobotReaction, null>, durationMs: number) => {
			if (reactionTimerRef.current !== null) {
				window.clearTimeout(reactionTimerRef.current);
			}
			setRobotReaction(reaction);
			reactionTimerRef.current = window.setTimeout(() => {
				setRobotReaction(null);
				reactionTimerRef.current = null;
			}, durationMs);
		},
		[],
	);

	useEffect(() => {
		if (!open) {
			pointShownRef.current = false;
			setQueueExpanded(false);
			setRobotReaction(null);
			if (pointTimerRef.current !== null) {
				window.clearTimeout(pointTimerRef.current);
				pointTimerRef.current = null;
			}
			return;
		}
		return () => {
			if (reactionTimerRef.current !== null) {
				window.clearTimeout(reactionTimerRef.current);
				reactionTimerRef.current = null;
			}
			if (pointTimerRef.current !== null) {
				window.clearTimeout(pointTimerRef.current);
				pointTimerRef.current = null;
			}
		};
	}, [open]);

	const handleQueueExpandedChange = useCallback(
		(expanded: boolean) => {
			setQueueExpanded(expanded);
			if (pointTimerRef.current !== null) {
				window.clearTimeout(pointTimerRef.current);
				pointTimerRef.current = null;
			}
			// Point when the robot starts its catch-up move (after the 1s hold).
			if (expanded && !pointShownRef.current) {
				pointTimerRef.current = window.setTimeout(() => {
					pointTimerRef.current = null;
					pointShownRef.current = true;
					fireRobotReaction("point", 1350);
				}, 1000);
			}
		},
		[fireRobotReaction],
	);

	const handleRenew = useCallback(() => {
		fireRobotReaction("celebrate", 1400);
		onRenew();
	}, [fireRobotReaction, onRenew]);

	const handleSnooze = useCallback(() => {
		fireRobotReaction("sleepy", 1150);
		onSnooze?.();
	}, [fireRobotReaction, onSnooze]);

	const handleDismiss = useCallback(() => {
		fireRobotReaction("sleepy", 1150);
		onDismiss?.();
	}, [fireRobotReaction, onDismiss]);

	const handleDestructiveIntent = useCallback(() => {
		fireRobotReaction("recoil", 1050);
	}, [fireRobotReaction]);

	useEffect(() => {
		if (!open) return;
		previousActive.current = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";

		const focusables = () =>
			modalRef.current?.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			) ?? [];

		focusables()[0]?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			// Escape does not dismiss — only the X or Dismiss all.
			if (event.key === "Escape") {
				event.preventDefault();
				return;
			}
			if (event.key !== "Tab" || !modalRef.current) return;
			const elements = Array.from(focusables());
			if (elements.length === 0) return;
			const firstEl = elements[0];
			const lastEl = elements[elements.length - 1];
			if (event.shiftKey && document.activeElement === firstEl) {
				event.preventDefault();
				lastEl.focus();
			} else if (!event.shiftKey && document.activeElement === lastEl) {
				event.preventDefault();
				firstEl.focus();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.body.style.overflow = "";
			previousActive.current?.focus();
		};
	}, [open, onClose]);

	if (!open) return null;

	const tier = getUrgencyTier(daysRemaining);
	const tone = getUrgencyTone(tier);
	const daysFact = getDaysFact(daysRemaining);
	const showAmount = typeof amount === "number" && Number.isFinite(amount);
	const resolvedAmountLabel =
		amountLabel ?? (entityType === "license" ? "Annual cost" : "Amount");
	const hasContact = !!(contactEmail || contactPhone);
	const statusChip = status?.replace(/[-_]/g, " ").trim();
	const kindChip = entityType === "license" ? "License" : "Contract";
	const dateVerb = renewing ? "Renews" : "Expires";
	const robotNarration: ExpiryRobotNarration = !narration
		? "idle"
		: narration.muted
			? "muted"
			: narration.isPlaying
				? "speaking"
				: "idle";

	return (
		<div
			className="fixed inset-0 z-9999"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
		>
			{/* Dimmed backdrop only — outside click does not close (X / Dismiss all). */}
			<div
				className={`absolute inset-0 z-0 ${MODAL_OVERLAY}`}
				aria-hidden="true"
			/>

			<div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
				{/* Relative shell so the desktop robot can sit left-full of the card. */}
				<motion.div
					className="relative w-full max-w-[840px]"
					initial={{ opacity: 0, y: -48 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.58,
						ease: [0.22, 1, 0.36, 1],
					}}
				>
					<div
						ref={modalRef}
						className={cn(
							MODAL_PANEL,
							"pointer-events-auto flex max-h-[90vh] w-full flex-col overflow-hidden",
						)}
					>
						{/* Zone 1 — urgency band (also holds prev/next + close). */}
						<UrgencyBand
							daysRemaining={daysRemaining}
							dateLabel={formatExpiryDisplay(expiryDate)}
							renewing={renewing}
							position={queuePosition}
							onPrev={onPrev}
							onNext={onNext}
							onClose={onClose}
							isBusy={isBusy}
						/>

						{/* Zone 2 — narration bar (only when TTS is in play this session). */}
						{narration && <NarrationBar narration={narration} />}

						{/* Zone 3 — split body. Only this cross-fades per slide. */}
						<div className="min-h-0 flex-1 overflow-y-auto">
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={panelKey}
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -6 }}
									transition={{ duration: 0.22, ease: "easeInOut" }}
									className="grid grid-cols-1 gap-6 p-6 min-[620px]:grid-cols-[1fr_auto]"
								>
									{/* Left — record detail */}
									<div className="min-w-0 space-y-4">
										<div className="flex flex-wrap items-center gap-2">
											<span className="inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs text-blue">
												{kindChip}
											</span>
											{statusChip && (
												<span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
													{statusChip}
												</span>
											)}
										</div>

										<h2
											id={titleId}
											className="text-2xl font-bold leading-tight text-slate-700 wrap-break-word"
										>
											{title}
										</h2>

										<p className="flex items-center gap-2 text-sm text-slate-600">
											<CalendarClock className="h-4 w-4 shrink-0 text-[#0f5384]" />
											<span className="font-semibold">{dateVerb}</span>{" "}
											{formatExpiryDisplay(expiryDate)}
										</p>

										{/* Fact grid — only cells that carry a value. */}
										<div
											className={cn(
												"grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200",
												showAmount ? "grid-cols-2" : "grid-cols-1",
											)}
										>
											{showAmount && (
												<div className="bg-white p-4">
													<p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
														{resolvedAmountLabel}
													</p>
													<p className="text-2xl font-bold tabular-nums text-slate-700">
														$
														{amount.toLocaleString(undefined, {
															maximumFractionDigits: 0,
														})}
													</p>
												</div>
											)}
											<div className="bg-white p-4">
												<p className="mb-1 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
													{daysFact.label}
												</p>
												<p
													className={cn(
														"text-2xl font-bold tabular-nums",
														DAYS_TEXT[tone],
													)}
												>
													{daysFact.value}
												</p>
											</div>
										</div>

										{/* Contact row — button when we have a contact, else muted copy. */}
										{hasContact ? (
											<button
												type="button"
												onClick={onContactProvider}
												disabled={isBusy}
												className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-700 cursor-pointer disabled:opacity-50"
											>
												{contactEmail ? (
													<Mail className="h-4 w-4" />
												) : (
													<Phone className="h-4 w-4" />
												)}
												Contact provider
												<span className="text-slate-400">
													{contactEmail || contactPhone}
												</span>
											</button>
										) : (
											<p className="text-sm text-slate-400">
												No provider contact on record
											</p>
										)}
									</div>

									{/* Right — action rail */}
									<ActionRail
										kind={entityType}
										daysRemaining={daysRemaining}
										snoozeDays={snoozeDays}
										resetKey={panelKey}
										isBusy={isBusy}
										renewRequiresDesktop={renewRequiresDesktop}
										onRenew={handleRenew}
										onViewDetails={onViewDetails}
										onSnooze={onSnooze ? handleSnooze : undefined}
										onDismiss={onDismiss ? handleDismiss : undefined}
										onLetExpire={onLetExpire}
										onDestructiveIntent={
											onLetExpire ? handleDestructiveIntent : undefined
										}
									/>
								</motion.div>
							</AnimatePresence>
						</div>

						{/* Zone 4 — queue strip (only with more than one item). */}
						{queue && queue.rows.length > 1 && (
							<QueueStrip
								queue={queue}
								onExpandedChange={handleQueueExpandedChange}
							/>
						)}

						{/* Footer cap — audits-style bottom strip (advance / pause / dismiss). */}
						{queue && (
							<ExpiryAlertFooterCap
								nextLabel={
									queue.nextIndex !== null && queue.rows[queue.nextIndex]
										? queue.rows[queue.nextIndex].title
										: null
								}
								countdownSeconds={queue.countdownSeconds}
								paused={queue.paused}
								onPause={queue.onPause}
								onDismissAll={queue.onDismissAll}
							/>
						)}
					</div>
					{/* Desktop robot — enter slides in via motion; gestures via CSS. */}
					<ExpiryAlertSpline
						narration={robotNarration}
						urgencyTier={tier}
						countdownSeconds={
							queue?.countdownSeconds ?? narration?.countdownSeconds ?? null
						}
						paused={queue?.paused ?? narration?.paused ?? false}
						queueExpanded={queueExpanded}
						reaction={robotReaction}
					/>
				</motion.div>
			</div>
		</div>
	);
}

/** Re-exported for callers that still import it from the modal module. */
export { formatExpiryTypeLabel };
