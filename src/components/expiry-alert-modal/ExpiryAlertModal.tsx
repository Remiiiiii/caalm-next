"use client";

import { format, parseISO } from "date-fns";
import {
	CalendarClock,
	ChevronDown,
	Clock,
	Eye,
	FileWarning,
	Mail,
	RotateCcw,
	X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import SplineExpiryScene from "@/components/contract-expiry-modal/SplineExpiryScene";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type ExpiryEntityType = "contract" | "license" | "audit";
export type ExpirySnoozeDuration = "24h" | "3d" | "1w";

export type ExpiryAlertModalProps = {
	open: boolean;
	entityType: ExpiryEntityType;
	title: string;
	expiryDate: string;
	daysRemaining: number;
	amount?: number;
	status: string;
	/** Pre-formatted human label (e.g. "Government Contract") */
	typeLabel: string;
	vendor: string;
	onRenew: () => void;
	onViewDetails: () => void;
	onSnooze: (duration: ExpirySnoozeDuration) => void;
	onLetExpire: () => void;
	onContactProvider?: () => void;
	/**
	 * Top-right X only. Closes without a decision and suppresses
	 * re-showing this entity for the rest of the browser session.
	 * Does not mark the record inactive or write a snooze.
	 */
	onClose: () => void;
	/** Optional: busy state for destructive / snooze */
	isBusy?: boolean;
};

function urgencyPillClass(days: number): string {
	if (days <= 3) return "bg-red text-white border-red shadow-lg";
	if (days <= 14) return "bg-orange text-white border-orange shadow-lg";
	return "bg-green text-white border-green shadow-lg";
}

function formatExpiryDisplay(raw: string): string {
	try {
		const date = raw.includes("T")
			? parseISO(raw)
			: parseISO(`${raw}T12:00:00`);
		return format(date, "MMMM d, yyyy");
	} catch {
		return raw.slice(0, 10);
	}
}

function primaryLabel(entityType: ExpiryEntityType): string {
	if (entityType === "license") return "Renew License";
	if (entityType === "audit") return "Schedule Audit Prep";
	return "Renew Contract";
}

function typeFieldLabel(entityType: ExpiryEntityType): string {
	if (entityType === "license") return "License Type";
	if (entityType === "audit") return "Audit Type";
	return "Contract Type";
}

function vendorFieldLabel(entityType: ExpiryEntityType): string {
	if (entityType === "license") return "Issuer";
	if (entityType === "audit") return "Owner";
	return "Vendor";
}

function dueVerb(entityType: ExpiryEntityType): string {
	if (entityType === "audit") return "Due";
	return "Expires";
}

const SNOOZE_OPTIONS: { value: ExpirySnoozeDuration; label: string }[] = [
	{ value: "24h", label: "24 hours" },
	{ value: "3d", label: "3 days" },
	{ value: "1w", label: "Next week" },
];

/**
 * Full-viewport expiry alert: bright frosted backdrop + Spline robot (top-left),
 * content offset so it never sits under the robot. Not a single white card shell.
 */
export default function ExpiryAlertModal({
	open,
	entityType,
	title,
	expiryDate,
	daysRemaining,
	amount,
	status,
	typeLabel,
	vendor,
	onRenew,
	onViewDetails,
	onSnooze,
	onLetExpire,
	onContactProvider,
	onClose,
	isBusy = false,
}: ExpiryAlertModalProps) {
	const titleId = useId();
	const descId = useId();
	const modalRef = useRef<HTMLDivElement>(null);
	const previousActive = useRef<HTMLElement | null>(null);
	const [confirmLetExpire, setConfirmLetExpire] = useState(false);

	useEffect(() => {
		if (!open) {
			setConfirmLetExpire(false);
			return;
		}
		previousActive.current = document.activeElement as HTMLElement | null;
		document.body.style.overflow = "hidden";

		const focusables = () =>
			modalRef.current?.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			) ?? [];

		const first = focusables()[0];
		first?.focus();

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				onClose();
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

	const daysLabel =
		daysRemaining <= 0
			? daysRemaining === 0
				? "Due today"
				: "Past due"
			: `day${daysRemaining === 1 ? "" : "s"} until ${
					entityType === "audit" ? "due date" : "expiry"
				}`;

	const showAmount = typeof amount === "number" && Number.isFinite(amount);

	return (
		<div
			className="fixed inset-0 z-9999"
			role="dialog"
			aria-modal="true"
			aria-labelledby={titleId}
			aria-describedby={descId}
		>
			{/* Bright frosted backdrop — dashboard shows through */}
			<button
				type="button"
				className="absolute inset-0 z-0 border-0 cursor-pointer bg-white/40 backdrop-blur-sm"
				aria-label="Dismiss expiry alert for this session"
				onClick={onClose}
			/>

			{/* Spline robot — full scene, above blur, below content chrome */}
			<div className="pointer-events-none absolute inset-0 z-10">
				<SplineExpiryScene className="z-10" />
			</div>

			{/* Top-right dismiss only */}
			<div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex justify-end p-6 md:p-8">
				<Button
					type="button"
					variant="outline"
					size="icon"
					onClick={onClose}
					className="pointer-events-auto glass-card text-slate-800 shadow-lg cursor-pointer"
					aria-label="Dismiss for this session"
				>
					<X className="h-5 w-5" />
				</Button>
			</div>

			{/* Content — shifted right so it clears the Spline robot on the left */}
			<div
				ref={modalRef}
				className="pointer-events-none absolute inset-0 z-40 flex flex-col items-stretch justify-center py-8 pr-6 pl-[min(42vw,22rem)] md:pr-12 md:pl-[min(38vw,26rem)] lg:pl-[28rem]"
			>
				<div className="pointer-events-auto relative z-40 isolate w-full max-w-4xl -mt-6">
					<div className="flex flex-col items-start space-y-5 w-full">
						{/* Title block */}
						<div className="space-y-3 w-full">
							<h2
								id={titleId}
								className="text-3xl md:text-4xl font-bold text-slate-800 drop-shadow-lg wrap-break-word"
							>
								{title}
							</h2>
							<p
								id={descId}
								className="text-lg md:text-xl text-slate-700 drop-shadow-md flex items-center gap-2"
							>
								<CalendarClock className="h-5 w-5 shrink-0 text-[#0f5384]" />
								<span className="font-semibold">{dueVerb(entityType)}:</span>{" "}
								{formatExpiryDisplay(expiryDate)}
							</p>
							<span
								className={cn(
									"inline-flex items-center gap-2 rounded-full border-2 px-5 py-2.5",
									urgencyPillClass(daysRemaining),
								)}
							>
								{daysRemaining <= 0 ? (
									<span className="text-xl md:text-2xl font-bold">!</span>
								) : (
									<span className="text-xl md:text-2xl font-bold">
										{daysRemaining}
									</span>
								)}
								<span className="text-base md:text-lg opacity-95">
									{daysLabel}
								</span>
							</span>
						</div>

						{/*
						  Stat grid — 2×2 with vertical + horizontal cross dividers
						*/}
						<div className="relative grid grid-cols-2 w-full overflow-visible">
							{/* Cross: vertical + horizontal */}
							<div
								aria-hidden
								className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-slate-300"
							/>
							<div
								aria-hidden
								className="pointer-events-none absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-slate-300"
							/>

							<div className="relative p-5 min-h-[108px]">
								<p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
									Amount
								</p>
								<p className="text-[32px] leading-none font-bold text-slate-900 tracking-tight">
									{showAmount
										? `$${amount.toLocaleString(undefined, {
												maximumFractionDigits: 0,
											})}`
										: "—"}
								</p>
							</div>

							<div className="relative p-5 min-h-[108px]">
								<p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
									Status
								</p>
								<p className="text-lg font-medium text-slate-900 capitalize leading-snug">
									{status.replace(/[-_]/g, " ") || "—"}
								</p>
							</div>

							<div className="relative p-5 min-h-[108px]">
								<p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
									{typeFieldLabel(entityType)}
								</p>
								<p className="text-lg font-medium text-slate-900 leading-snug">
									{typeLabel || "—"}
								</p>
							</div>

							<div className="relative p-5 min-h-[108px]">
								<p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-400 mb-2">
									{vendorFieldLabel(entityType)}
								</p>
								<p className="text-lg font-medium text-slate-900 leading-snug">
									{vendor || "—"}
								</p>
							</div>
						</div>

						{/* Action bar — primary row + muted secondary links */}
						<div className="relative z-50 mt-1 flex flex-col gap-4 w-full">
							<div className="relative z-50 flex flex-nowrap items-center gap-3">
								<Button
									type="button"
									className="primary-btn px-3 sm:px-4 shrink-0"
									onClick={onRenew}
									disabled={isBusy}
								>
									{entityType === "audit" ? (
										<FileWarning className="h-4 w-4" />
									) : (
										<RotateCcw className="h-4 w-4" />
									)}
									{primaryLabel(entityType)}
								</Button>

								<Button
									type="button"
									variant="outline"
									className="primary-btn px-3 sm:px-4 shrink-0"
									onClick={onViewDetails}
									disabled={isBusy}
								>
									<Eye className="h-4 w-4" />
									View Details
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											disabled={isBusy}
											className="relative z-50 inline-flex h-10 items-center gap-1.5 px-1 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer disabled:opacity-50 bg-transparent border-0 shrink-0"
										>
											<Clock className="h-4 w-4" />
											Snooze
											<ChevronDown className="h-3.5 w-3.5 opacity-70" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="start"
										className="z-[10050] w-44"
									>
										{SNOOZE_OPTIONS.map((opt) => (
											<DropdownMenuItem
												key={opt.value}
												onClick={() => onSnooze(opt.value)}
												className="cursor-pointer"
											>
												{opt.label}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							<div className="border-t border-slate-200/80 pt-4 flex flex-wrap items-center gap-6 min-h-6">
								{onContactProvider && (
									<button
										type="button"
										onClick={onContactProvider}
										disabled={isBusy}
										className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 cursor-pointer disabled:opacity-50 bg-transparent border-0 p-0"
									>
										<Mail className="h-3.5 w-3.5" />
										Contact Provider
									</button>
								)}

								{!confirmLetExpire ? (
									<button
										type="button"
										className="text-sm text-red hover:text-red/80 cursor-pointer disabled:opacity-50 bg-transparent border-0 p-0"
										onClick={() => setConfirmLetExpire(true)}
										disabled={isBusy || entityType === "audit"}
									>
										{entityType === "audit" ? "Mark as skipped" : "Let Expire"}
									</button>
								) : (
									<span className="inline-flex flex-wrap items-center gap-2 text-sm text-slate-500">
										<span>
											{showAmount
												? `Confirm ($${amount.toLocaleString()})?`
												: "Confirm?"}
										</span>
										<button
											type="button"
											className="font-semibold text-red hover:underline cursor-pointer disabled:opacity-50 bg-transparent border-0 p-0"
											onClick={() => {
												onLetExpire();
												setConfirmLetExpire(false);
											}}
											disabled={isBusy}
										>
											Confirm
										</button>
										<button
											type="button"
											className="text-slate-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
											onClick={() => setConfirmLetExpire(false)}
											disabled={isBusy}
										>
											Cancel
										</button>
									</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

/** Map raw enum-ish values to title case labels. */
export function formatExpiryTypeLabel(raw?: string | null): string {
	if (!raw) return "—";
	return raw
		.replace(/[_-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function snoozeDurationToDays(duration: ExpirySnoozeDuration): number {
	if (duration === "24h") return 1;
	if (duration === "3d") return 3;
	return 7;
}
