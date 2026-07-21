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
	 * Defaults to the first item (the Weather widget in dashboards).
	 */
	heightSourceIndex?: number;
}

const prefersReducedMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Horizontal, scroll-snapping carousel with auto-hiding chevron controls
 * and edge-fade affordances. Every card matches the height of the
 * `heightSourceIndex` item, so the source widget dictates the row height.
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
	const [canScrollLeft, setCanScrollLeft] = React.useState(false);
	const [canScrollRight, setCanScrollRight] = React.useState(false);
	const [sourceHeight, setSourceHeight] = React.useState<number>();

	const updateEdges = React.useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		const { scrollLeft, scrollWidth, clientWidth } = el;
		setCanScrollLeft(scrollLeft > 1);
		setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
	}, []);

	React.useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		updateEdges();
		el.addEventListener("scroll", updateEdges, { passive: true });

		const resizeObserver = new ResizeObserver(updateEdges);
		resizeObserver.observe(el);
		for (const child of Array.from(el.children)) {
			resizeObserver.observe(child);
		}

		return () => {
			el.removeEventListener("scroll", updateEdges);
			resizeObserver.disconnect();
		};
	}, [updateEdges]);

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
		const amount = Math.round(el.clientWidth * 0.85);
		el.scrollBy({
			left: direction === "left" ? -amount : amount,
			behavior: prefersReducedMotion() ? "auto" : "smooth",
		});
	};

	const items = React.Children.toArray(children).filter(Boolean);

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
					className="flex snap-x snap-mandatory items-start gap-2 overflow-x-auto scroll-smooth py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{items.map((child, index) => {
						const isSource = index === heightSourceIndex;
						return (
							<div
								key={`widget-${index}`}
								ref={isSource ? sourceRef : undefined}
								style={isSource ? undefined : { height: sourceHeight }}
								className={cn(
									"min-w-0 shrink-0 snap-start overflow-hidden",
									"w-[85%] sm:w-[340px] xl:w-[360px]",
									"*:h-full",
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
