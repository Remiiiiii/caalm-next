"use client";

import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useLayoutEffect,
	useRef,
} from "react";
import { cn } from "@/lib/utils";

type EqualHeightGridProps = {
	children: ReactNode;
	className?: string;
};

/**
 * CSS grid that stretches every card to the tallest card in the grid.
 */
export default function EqualHeightGrid({
	children,
	className,
}: EqualHeightGridProps) {
	const rootRef = useRef<HTMLElement>(null);
	const syncingRef = useRef(false);

	useLayoutEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		const getCards = () =>
			Array.from(
				root.querySelectorAll<HTMLElement>("[data-equal-height-card]"),
			);

		const sync = () => {
			if (syncingRef.current) return;
			const cards = getCards();
			if (cards.length === 0) return;

			syncingRef.current = true;
			try {
				for (const card of cards) {
					card.style.minHeight = "";
				}

				let max = 0;
				for (const card of cards) {
					max = Math.max(max, card.getBoundingClientRect().height);
				}

				if (max <= 0) return;

				const next = `${Math.ceil(max)}px`;
				for (const card of cards) {
					if (card.style.minHeight !== next) {
						card.style.minHeight = next;
					}
				}
			} finally {
				requestAnimationFrame(() => {
					syncingRef.current = false;
				});
			}
		};

		const scheduleSync = () => requestAnimationFrame(sync);

		sync();

		const observer = new ResizeObserver(scheduleSync);
		observer.observe(root);
		for (const card of getCards()) {
			observer.observe(card);
		}

		window.addEventListener("resize", scheduleSync);
		return () => {
			observer.disconnect();
			window.removeEventListener("resize", scheduleSync);
		};
	}, [children]);

	return (
		<section ref={rootRef} className={cn("items-stretch", className)}>
			{Children.map(children, (child) => {
				if (!isValidElement(child)) return child;
				const el = child as ReactElement<{ className?: string }>;
				return cloneElement(el, {
					className: cn("min-w-0 h-full", el.props.className),
				});
			})}
		</section>
	);
}
