"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface WidgetCarouselProps {
	children: React.ReactNode;
	/** Accessible label for the scroll region. */
	ariaLabel?: string;
	className?: string;
	/** Extra classes applied to each item wrapper (controls card width). */
	itemClassName?: string;
	/**
	 * Index of the item whose natural height every other card matches.
	 * Defaults to the first item (expiry alerts in dashboards).
	 */
	heightSourceIndex?: number;
}

const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const INTERACTIVE_SELECTOR =
	"button, a, input, select, textarea, label, [role='button'], [role='combobox'], [role='option'], [contenteditable='true']";

const MOMENTUM_FRICTION = 0.95;
const MOMENTUM_MIN_VELOCITY = 0.15;

/**
 * Flatten children into carousel slots. React.Children.toArray does not unwrap
 * Fragments, so `{ready ? <>a b c</> : skeletons}` would otherwise become one
 * narrow column with every widget stacked inside a single item wrapper.
 */
function flattenCarouselItems(children: React.ReactNode): React.ReactNode[] {
	const out: React.ReactNode[] = [];
	for (const child of React.Children.toArray(children)) {
		if (
			React.isValidElement<{ children?: React.ReactNode }>(child) &&
			child.type === React.Fragment
		) {
			out.push(...flattenCarouselItems(child.props.children));
			continue;
		}
		// toArray already drops null / undefined / booleans
		out.push(child);
	}
	return out;
}

/**
 * Free horizontal carousel with grab-to-drag + light momentum, wheel→horizontal
 * scroll, auto-hiding chevrons, and edge-fade affordances. No snap points —
 * drag and wheel leave the track wherever you stop.
 */
export function WidgetCarousel({
	children,
	ariaLabel = "Scrollable widgets",
	className,
	itemClassName,
	heightSourceIndex = 0,
}: WidgetCarouselProps) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const sourceRef = React.useRef<HTMLDivElement>(null);
	const dragRef = React.useRef<{
		pointerId: number;
		startX: number;
		scrollLeft: number;
		moved: boolean;
		lastX: number;
		lastT: number;
		velocity: number;
	} | null>(null);
	/** Survives pointer-up so the following click can be suppressed after a drag. */
	const suppressClickRef = React.useRef(false);
	const momentumRafRef = React.useRef<number | null>(null);
	const [canScrollLeft, setCanScrollLeft] = React.useState(false);
	const [canScrollRight, setCanScrollRight] = React.useState(false);
	const [sourceHeight, setSourceHeight] = React.useState<number>();
	const [isGrabbing, setIsGrabbing] = React.useState(false);

	const stopMomentum = React.useCallback(() => {
		if (momentumRafRef.current != null) {
			cancelAnimationFrame(momentumRafRef.current);
			momentumRafRef.current = null;
		}
	}, []);

	const updateEdges = React.useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const { scrollLeft, scrollWidth, clientWidth } = el;
		setCanScrollLeft(scrollLeft > 1);
		setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
	}, []);

	const clampScroll = (el: HTMLDivElement, next: number) => {
		const max = Math.max(0, el.scrollWidth - el.clientWidth);
		return Math.min(max, Math.max(0, next));
	};

	const startMomentum = React.useCallback(
		(initialVelocity: number) => {
			const el = scrollRef.current;
			if (!el || prefersReducedMotion()) return;
			if (Math.abs(initialVelocity) < MOMENTUM_MIN_VELOCITY) return;

			stopMomentum();
			let velocity = initialVelocity;

			const tick = () => {
				const track = scrollRef.current;
				if (!track) {
					momentumRafRef.current = null;
					return;
				}

				track.scrollLeft = clampScroll(track, track.scrollLeft + velocity);
				velocity *= MOMENTUM_FRICTION;

				const atEdge =
					(velocity < 0 && track.scrollLeft <= 0) ||
					(velocity > 0 &&
						track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);

				if (atEdge || Math.abs(velocity) < MOMENTUM_MIN_VELOCITY) {
					momentumRafRef.current = null;
					updateEdges();
					return;
				}

				momentumRafRef.current = requestAnimationFrame(tick);
			};

			momentumRafRef.current = requestAnimationFrame(tick);
		},
		[stopMomentum, updateEdges],
	);

	React.useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		updateEdges();
		el.addEventListener("scroll", updateEdges, { passive: true });

		const onWheel = (event: WheelEvent) => {
			if (el.scrollWidth <= el.clientWidth) return;

			const mostlyVertical =
				Math.abs(event.deltaY) >= Math.abs(event.deltaX);
			if (!mostlyVertical && event.deltaX === 0) return;

			const delta = mostlyVertical ? event.deltaY : event.deltaX;
			if (delta === 0) return;

			const atStart = el.scrollLeft <= 0;
			const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
			if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;

			stopMomentum();
			event.preventDefault();
			el.scrollLeft = clampScroll(el, el.scrollLeft + delta);
		};

		el.addEventListener("wheel", onWheel, { passive: false });

		const resizeObserver = new ResizeObserver(updateEdges);
		resizeObserver.observe(el);
		for (const child of Array.from(el.children)) {
			resizeObserver.observe(child);
		}

		return () => {
			el.removeEventListener("scroll", updateEdges);
			el.removeEventListener("wheel", onWheel);
			resizeObserver.disconnect();
			stopMomentum();
		};
	}, [stopMomentum, updateEdges]);

	// Measure the source widget's natural height and share it with siblings.
	React.useEffect(() => {
		const el = sourceRef.current;
		if (!el) return;

		const measure = () => setSourceHeight(el.offsetHeight);
		measure();

		const resizeObserver = new ResizeObserver(measure);
		resizeObserver.observe(el);
		return () => resizeObserver.disconnect();
	}, []);

	const scrollByPage = (direction: "left" | "right") => {
		const el = scrollRef.current;
		if (!el) return;
		stopMomentum();
		const amount = Math.round(el.clientWidth * 0.85);
		el.scrollBy({
			left: direction === "left" ? -amount : amount,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	};

	const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) return;
		const target = event.target as HTMLElement | null;
		if (target?.closest(INTERACTIVE_SELECTOR)) return;

		const el = scrollRef.current;
		if (!el) return;

		stopMomentum();
		const now = performance.now();
		dragRef.current = {
			pointerId: event.pointerId,
			startX: event.clientX,
			scrollLeft: el.scrollLeft,
			moved: false,
			lastX: event.clientX,
			lastT: now,
			velocity: 0,
		};
		setIsGrabbing(true);
		el.setPointerCapture(event.pointerId);
	};

	const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		const el = scrollRef.current;
		if (!drag || !el || drag.pointerId !== event.pointerId) return;

		const now = performance.now();
		const dt = Math.max(1, now - drag.lastT);
		const dxFrame = event.clientX - drag.lastX;
		// px per frame-ish velocity (negative = scroll right when dragging left)
		drag.velocity = (-dxFrame / dt) * 16;
		drag.lastX = event.clientX;
		drag.lastT = now;

		const dx = event.clientX - drag.startX;
		if (Math.abs(dx) > 3) drag.moved = true;
		el.scrollLeft = clampScroll(el, drag.scrollLeft - dx);
	};

	const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
		const drag = dragRef.current;
		const el = scrollRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;

		if (drag.moved) {
			suppressClickRef.current = true;
			startMomentum(drag.velocity);
		}
		dragRef.current = null;
		setIsGrabbing(false);
		if (el?.hasPointerCapture(event.pointerId)) {
			el.releasePointerCapture(event.pointerId);
		}
	};

	/** After a drag, block the synthetic click so cards don't get accidental taps. */
	const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
		if (!suppressClickRef.current) return;
		suppressClickRef.current = false;
		event.preventDefault();
		event.stopPropagation();
	};

	const items = flattenCarouselItems(children);

	const chevronClass =
		"z-20 flex h-16 w-6 sm:w-7 shrink-0 items-center justify-center rounded-lg border border-white/40 bg-white/30 text-slate-700 shadow-lg backdrop-blur transition-all duration-200 hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40";

	return (
		<div
			className={cn(
				"group flex items-center gap-2 -mx-1 sm:gap-3 sm:-mx-2",
				className,
			)}
		>
			<button
				type="button"
				aria-label="Scroll left"
				onClick={() => scrollByPage("left")}
				disabled={!canScrollLeft}
				className={cn(
					chevronClass,
					canScrollLeft
						? "cursor-pointer opacity-100"
						: "cursor-default opacity-40",
				)}
			>
				<ChevronLeft className="h-4 w-4" />
			</button>

			<div className="relative min-w-0 flex-1">
				{/* Left edge fade */}
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white/70 to-transparent transition-opacity duration-200",
						canScrollLeft ? "opacity-100" : "opacity-0",
					)}
				/>
				{/* Right edge fade */}
				<div
					aria-hidden
					className={cn(
						"pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white/70 to-transparent transition-opacity duration-200",
						canScrollRight ? "opacity-100" : "opacity-0",
					)}
				/>

				<section
					ref={scrollRef}
					aria-label={ariaLabel}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={endDrag}
					onPointerCancel={endDrag}
					onClickCapture={onClickCapture}
					className={cn(
						// py-4: bottom shadow. px-5: room for first/last pop-out scale inside the
						// overflow-x clip edge (padding stays in the scrollport, so sides stay visible).
						"flex items-start gap-2 overflow-x-auto overflow-y-hidden px-5 py-4 scroll-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-y",
						isGrabbing
							? "cursor-grabbing select-none touch-none"
							: "cursor-grab",
					)}
				>
					{items.map((child, index) => {
						const isSource = index === heightSourceIndex;
						return (
							<div
								key={`widget-${index}`}
								ref={isSource ? sourceRef : undefined}
								style={isSource ? undefined : { height: sourceHeight }}
								className={cn(
									// overflow-visible so each widget's glass-card shadow paints (Company News look)
									"relative min-w-0 shrink-0 overflow-visible",
									"w-[85%] sm:w-[340px] xl:w-[360px]",
									"*:h-full",
									"[&>*]:transition-[transform,box-shadow] [&>*]:duration-200",
									// Trial: pop-out on hover (lift + slight scale + deeper shadow)
									!isGrabbing &&
										"motion-safe:hover:z-20 motion-safe:[&:hover>*]:-translate-y-2 motion-safe:[&:hover>*]:scale-[1.025] motion-safe:[&:hover>*]:shadow-[0_18px_48px_0_rgba(31,38,135,0.28)]",
									itemClassName,
								)}
							>
								{child}
							</div>
						);
					})}
				</section>
			</div>

			<button
				type="button"
				aria-label="Scroll right"
				onClick={() => scrollByPage("right")}
				disabled={!canScrollRight}
				className={cn(
					chevronClass,
					canScrollRight
						? "cursor-pointer opacity-100"
						: "cursor-default opacity-40",
				)}
			>
				<ChevronRight className="h-4 w-4" />
			</button>
		</div>
	);
}
