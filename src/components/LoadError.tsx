"use client";

import {
	AlertCircle,
	Lock,
	RefreshCw,
	WifiOff,
	X as XIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type LoadErrorScale = "page" | "section" | "table" | "banner";

interface LoadErrorProps {
	scale: LoadErrorScale;
	/** What failed, e.g. "We couldn't load Audit Readiness". */
	title: string;
	/** What happens to the user's data — only pass when true. */
	description?: string;
	/** Identifies which part of the page failed, e.g. "page", "score-trend". */
	elementKey: string;
	error?: {
		status?: number;
		code?: string;
		requestPath?: string;
		traceId?: string;
	};
	onRetry: () => unknown;
	/** Banner scale only: when the currently-shown (stale) data was fetched. */
	staleSince?: Date | string;
	/** Banner scale only: called when the user dismisses the notice. */
	onDismiss?: () => void;
	/** Doesn't report an incident or show a reference — handled by its own copy. */
	variant?: "error" | "offline" | "no-access";
	/** no-access variant only. */
	requiredPermission?: string;
	className?: string;
}

const REPORT_THROTTLE_MS = 60_000;

type ReportOutcome = { reference: string | null; failed: boolean };
/** Shared across remounts so a throttled instance can adopt the in-flight/settled outcome instead of sitting blank. */
const reportedFingerprints = new Map<
	string,
	{ timestamp: number; promise: Promise<ReportOutcome> }
>();

function throttleKey(elementKey: string, error?: LoadErrorProps["error"]) {
	return `${elementKey}:${error?.status ?? ""}:${error?.code ?? ""}`;
}

/**
 * Resolves after the browser has painted the current frame, so layout (scrollWidth etc.) is
 * settled. Races a timeout too — rAF can stall indefinitely on a backgrounded/unfocused tab,
 * and the report must never hang waiting for a screenshot.
 */
function waitForPaint(): Promise<void> {
	return new Promise((resolve) => {
		let settled = false;
		const done = () => {
			if (settled) return;
			settled = true;
			resolve();
		};
		requestAnimationFrame(() => requestAnimationFrame(done));
		setTimeout(done, 250);
	});
}

/** Swaps data-capture-mask elements for a neutral block, captures, restores. */
async function captureRegion(node: HTMLElement): Promise<string | null> {
	// Load the lib and wait for layout to settle in parallel — importing this lazily (only on an
	// actual error) can take long enough on a cold cache that the node unmounts before a serial
	// `await import(...)` resolves, since SWR may retry and swap the error UI out from under it.
	const [{ toJpeg }] = await Promise.all([
		import("html-to-image"),
		waitForPaint(),
	]);
	if (!node.isConnected || node.scrollWidth === 0 || node.scrollHeight === 0)
		return null;
	const masked = Array.from(
		node.querySelectorAll<HTMLElement>("[data-capture-mask]"),
	);
	const restore = masked.map((el) => ({
		el,
		style: el.getAttribute("style"),
	}));
	try {
		for (const el of masked) {
			el.style.color = "transparent";
			el.style.background = "#e2e8f0";
			el.style.borderRadius = "4px";
		}
		const dataUrl = await toJpeg(node, {
			quality: 0.85,
			width: Math.min(node.scrollWidth, 1280),
			pixelRatio: 1,
			// JPEG has no alpha channel; without this, html-to-image leaves the canvas
			// transparent and the export flattens that to black instead of white.
			backgroundColor: "#ffffff",
			// html-to-image clones the node's full computed style (cloneCSSStyle), which bakes
			// in `margin-left`/`margin-right` as the absolute px offset `mx-auto` resolved to
			// in the page's full-width viewport. It then forces `width` on the clone but never
			// clears that stale margin, so the content renders shoved off the narrow capture
			// canvas instead of centered. Reset it explicitly.
			style: { margin: "0" },
		});
		return /^data:image\//.test(dataUrl) ? dataUrl : null;
	} catch {
		return null;
	} finally {
		for (const { el, style } of restore) {
			if (style === null) el.removeAttribute("style");
			else el.setAttribute("style", style);
		}
	}
}

function useIncidentReport(
	active: boolean,
	scale: LoadErrorScale,
	route: string,
	elementKey: string,
	error: LoadErrorProps["error"],
	containerRef: React.RefObject<HTMLDivElement | null>,
) {
	const [reference, setReference] = useState<string | null>(null);
	const [reportFailed, setReportFailed] = useState(false);

	useEffect(() => {
		if (!active) return;
		const key = throttleKey(elementKey, error);
		const cached = reportedFingerprints.get(key);
		const fresh = cached && Date.now() - cached.timestamp < REPORT_THROTTLE_MS;

		const promise = fresh
			? cached.promise
			: (() => {
					const p = (async (): Promise<ReportOutcome> => {
						const screenshotDataUrl = containerRef.current
							? ((await captureRegion(containerRef.current)) ?? undefined)
							: undefined;
						try {
							const res = await fetch("/api/incidents/load-error", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									scale,
									route,
									elementKey,
									errorStatus: error?.status,
									errorCode: error?.code,
									requestPath: error?.requestPath,
									traceId: error?.traceId,
									userAgent: navigator.userAgent,
									viewport: `${window.innerWidth}x${window.innerHeight}`,
									screenshotDataUrl,
								}),
							});
							const body = await res.json().catch(() => null);
							return res.ok
								? { reference: body?.data?.reference ?? null, failed: false }
								: { reference: null, failed: true };
						} catch {
							return { reference: null, failed: true };
						}
					})();
					reportedFingerprints.set(key, { timestamp: Date.now(), promise: p });
					return p;
				})();

		let cancelled = false;
		promise.then((outcome) => {
			if (cancelled) return;
			setReference(outcome.reference);
			setReportFailed(outcome.failed);
		});

		return () => {
			cancelled = true;
		};
	}, [active, scale, route, elementKey, error?.status, error?.code]);

	return { reference, reportFailed };
}

function RetryButton({
	onRetry,
	size = "sm",
}: {
	onRetry: () => unknown;
	size?: "sm" | "md";
}) {
	const [retrying, setRetrying] = useState(false);
	const handleClick = async () => {
		setRetrying(true);
		try {
			await onRetry();
		} finally {
			setRetrying(false);
		}
	};
	return (
		<button
			type="button"
			onClick={() => void handleClick()}
			disabled={retrying}
			className={cn(
				"inline-flex items-center gap-1.5 font-medium text-[#078FAB] hover:underline disabled:opacity-60",
				size === "md" ? "text-sm" : "text-sm",
			)}
		>
			<RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
			<span role={retrying ? "status" : undefined}>
				{retrying ? "Retrying…" : "Retry"}
			</span>
		</button>
	);
}

function ReferenceCaption({
	reference,
	reportFailed,
}: {
	reference: string | null;
	reportFailed: boolean;
}) {
	const [copied, setCopied] = useState(false);
	if (!reference) {
		return (
			<p className="text-xs text-slate-400">
				{reportFailed ? "Reference unavailable" : "Reporting…"}
			</p>
		);
	}
	return (
		<p className="text-xs text-slate-400">
			Reference ID {reference} · Attempted{" "}
			{new Date().toLocaleTimeString([], {
				hour: "numeric",
				minute: "2-digit",
			})}{" "}
			·{" "}
			<button
				type="button"
				className="text-[#078FAB] hover:underline"
				onClick={() => {
					void navigator.clipboard.writeText(reference);
					setCopied(true);
					setTimeout(() => setCopied(false), 1500);
				}}
			>
				{copied ? "Copied" : "Copy"}
			</button>
		</p>
	);
}

export function LoadError({
	scale,
	title,
	description,
	elementKey,
	error,
	onRetry,
	staleSince,
	onDismiss,
	variant = "error",
	requiredPermission,
	className,
}: LoadErrorProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const route = usePathname() || "";
	const { reference, reportFailed } = useIncidentReport(
		variant === "error",
		scale,
		route,
		elementKey,
		error,
		containerRef,
	);

	if (variant === "offline") {
		return (
			<OfflineOrNoAccess
				scale={scale}
				icon={<WifiOff className="text-slate-400" aria-hidden />}
				title="You're offline"
				description="Check your connection. We'll try again when you're back online."
			/>
		);
	}

	if (variant === "no-access") {
		return (
			<OfflineOrNoAccess
				scale={scale}
				icon={<Lock className="text-slate-400" aria-hidden />}
				title="You don't have access"
				description={
					requiredPermission
						? `Ask an administrator for ${requiredPermission}.`
						: "Ask an administrator for access."
				}
			/>
		);
	}

	if (scale === "banner") {
		return (
			<div
				ref={containerRef}
				role="alert"
				className={cn(
					"flex w-full max-w-[760px] items-center justify-between gap-3 rounded-lg border border-orange/30 bg-orange/5 px-4 py-2.5 text-sm",
					className,
				)}
			>
				<span className="flex items-center gap-2 text-slate-700">
					<AlertCircle className="h-4 w-4 shrink-0 text-orange" aria-hidden />
					<span>
						<strong className="font-semibold">Couldn't refresh.</strong> Showing
						data from{" "}
						{staleSince
							? new Date(staleSince).toLocaleTimeString([], {
									hour: "numeric",
									minute: "2-digit",
								})
							: "earlier"}
						. Numbers may be out of date.
					</span>
				</span>
				<span className="flex shrink-0 items-center gap-3">
					<RetryButton onRetry={onRetry} />
					{onDismiss && (
						<button
							type="button"
							onClick={onDismiss}
							aria-label="Dismiss"
							className="text-slate-400 hover:text-slate-600"
						>
							<XIcon className="h-4 w-4" />
						</button>
					)}
				</span>
			</div>
		);
	}

	if (scale === "table") {
		return (
			<div
				ref={containerRef}
				role="alert"
				className={cn(
					"flex items-center justify-between gap-3 px-4 py-6",
					className,
				)}
			>
				<span className="flex items-start gap-3">
					<AlertCircle
						className="mt-0.5 h-[22px] w-[22px] shrink-0 text-red"
						aria-hidden
					/>
					<span>
						<p className="text-sm font-semibold text-slate-800">{title}</p>
						<p className="mt-0.5 text-sm text-slate-500">
							{description} Reference {reference ?? "pending"}.
						</p>
					</span>
				</span>
				<RetryButton onRetry={onRetry} />
			</div>
		);
	}

	if (scale === "section") {
		return (
			<div
				ref={containerRef}
				role="alert"
				className={cn("flex items-start gap-3 px-1 py-6", className)}
			>
				<AlertCircle
					className="mt-0.5 h-[22px] w-[22px] shrink-0 text-red"
					aria-hidden
				/>
				<div>
					<p className="text-sm font-semibold text-slate-800">{title}</p>
					{description && (
						<p className="mt-0.5 text-sm text-slate-500">{description}</p>
					)}
					<div className="mt-2">
						<RetryButton onRetry={onRetry} />
					</div>
				</div>
			</div>
		);
	}

	// page scale
	return (
		<div
			ref={containerRef}
			role="alert"
			className={cn(
				"mx-auto flex max-w-[520px] flex-col items-center gap-3 py-16 text-center",
				className,
			)}
		>
			<AlertCircle className="h-10 w-10 text-red" aria-hidden />
			<p className="text-[18px] font-semibold text-slate-800">{title}</p>
			<p className="text-sm text-slate-500">
				{description ??
					"Our IT team has been notified automatically. Try again in a moment."}
			</p>
			<RetryButton onRetry={onRetry} size="md" />
			<ReferenceCaption reference={reference} reportFailed={reportFailed} />
		</div>
	);
}

function OfflineOrNoAccess({
	scale,
	icon,
	title,
	description,
}: {
	scale: LoadErrorScale;
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	const compact =
		scale === "section" || scale === "table" || scale === "banner";
	return (
		<div
			role="status"
			className={cn(
				"flex flex-col items-center gap-2 text-center",
				compact ? "py-6" : "mx-auto max-w-[520px] py-16",
			)}
		>
			<span
				className={
					compact ? "[&_svg]:h-6 [&_svg]:w-6" : "[&_svg]:h-10 [&_svg]:w-10"
				}
			>
				{icon}
			</span>
			<p
				className={cn(
					"font-semibold text-slate-800",
					compact ? "text-sm" : "text-[18px]",
				)}
			>
				{title}
			</p>
			<p className="text-sm text-slate-500">{description}</p>
		</div>
	);
}
