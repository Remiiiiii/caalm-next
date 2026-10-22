"use client";

/**
 * Shared floating dock for bulk-selection actions (Assign Tasks is the reference).
 *
 * Pinned DOCK_BOTTOM_PX above the bottom edge of the window and horizontally
 * centered on the card it belongs to: pass `anchorRef`, or leave it out and it
 * centers on the element rendered just before it, else the closest `.glass-card`,
 * else its parent. Only the horizontal center is measured (on resize and when
 * the card changes size), never on scroll, so scrolling cannot make it jump.
 * Overlays content, so selecting rows never shifts the layout.
 */
import {
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

/** Distance from the bottom edge of the window (1-2px). */
const DOCK_BOTTOM_PX = 38;

const DOCK_KBD =
	"rounded border border-slate-300/80 bg-white/50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-600";

export function BulkActionDivider() {
	return (
		<span className="mx-1 h-5 w-px shrink-0 bg-slate-300/70" aria-hidden />
	);
}

export function BulkActionDock({
	count,
	noun = "item",
	anchorRef,
	onClear,
	escapeBlocked = false,
	children,
}: {
	count: number;
	/** Singular noun for the toolbar label, e.g. "task". */
	noun?: string;
	anchorRef?: RefObject<HTMLElement | null>;
	onClear: () => void;
	/** Set while a menu inside the dock is open so Esc closes that first. */
	escapeBlocked?: boolean;
	/** Action buttons; rendered between the count and Clear. */
	children?: ReactNode;
}) {
	const marker = useRef<HTMLSpanElement>(null);
	const [centerX, setCenterX] = useState<number | null>(null);
	const visible = count > 0;

	useLayoutEffect(() => {
		if (!visible) return;
		const anchor =
			anchorRef?.current ??
			(marker.current?.previousElementSibling as HTMLElement | null) ??
			marker.current?.closest<HTMLElement>(".glass-card") ??
			marker.current?.parentElement ??
			null;
		const update = () => {
			const rect = anchor?.getBoundingClientRect();
			setCenterX(rect ? rect.left + rect.width / 2 : null);
		};
		update();
		const ro = anchor ? new ResizeObserver(update) : null;
		if (anchor) ro?.observe(anchor);
		window.addEventListener("resize", update);
		return () => {
			ro?.disconnect();
			window.removeEventListener("resize", update);
		};
	}, [visible, anchorRef]);

	useEffect(() => {
		if (!visible || escapeBlocked) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClear();
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [visible, escapeBlocked, onClear]);

	return (
		<>
			<span ref={marker} hidden />
			{visible ? (
				<div
					className="pointer-events-none fixed z-40 flex -translate-x-1/2 justify-center px-4"
					style={{
						bottom: DOCK_BOTTOM_PX,
						left: centerX ?? "50%",
					}}
				>
					<div
						role="toolbar"
						aria-label={`Bulk actions for ${count} selected ${noun}${count === 1 ? "" : "s"}`}
						className="glass-card pointer-events-auto flex max-w-full flex-wrap items-center gap-1 rounded-full! px-3 py-2 text-slate-700 shadow-lg shadow-slate-900/15"
					>
						<span className="sr-only" aria-live="polite">
							{count} selected
						</span>
						<span className="inline-flex items-center gap-2 pr-1">
							<span className="min-w-6 rounded-full border border-[#078FAB]/20 bg-[#078FAB]/10 px-2 py-0.5 text-center text-sm font-semibold text-[#078FAB]">
								{count}
							</span>
							<span className="text-sm font-medium text-slate-700">
								selected
							</span>
						</span>
						{children ? (
							<>
								<BulkActionDivider />
								{children}
							</>
						) : null}
						<BulkActionDivider />
						<button
							type="button"
							onClick={onClear}
							className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-slate-700 hover:bg-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							Clear
							<kbd className={DOCK_KBD}>Esc</kbd>
						</button>
					</div>
				</div>
			) : null}
		</>
	);
}
