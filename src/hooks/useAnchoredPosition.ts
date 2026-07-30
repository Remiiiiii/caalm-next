"use client";

import { useCallback, useEffect, useState } from "react";

export type AnchoredPlacement = "right" | "bottom" | "center";

export type AnchoredPosition = {
	top: number;
	left: number;
	placement: AnchoredPlacement;
	ready: boolean;
};

const CARD_WIDTH = 340;
export const CARD_HEIGHT_WITH_IMAGE = 400;
export const CARD_HEIGHT_DEFAULT = 260;
const GAP = 12;
const VIEWPORT_MARGIN = 24;
const RETRY_MS = 150;
const RETRY_COUNT = 15;

/** Center of the viewport for modal-style tips (e.g. welcome). */
export const CENTERED_POSITION: Omit<AnchoredPosition, "ready"> = {
	top: 0,
	left: 0,
	placement: "center",
};

/** Shown beside the sidebar when the nav anchor is still loading or hidden. */
const FALLBACK_POSITION: Omit<AnchoredPosition, "ready"> = {
	top: 120,
	left: 280,
	placement: "right",
};

function computePosition(
	rect: DOMRect,
	cardHeight: number,
): Pick<AnchoredPosition, "top" | "left" | "placement"> {
	const viewportW = window.innerWidth;
	const viewportH = window.innerHeight;
	const cardHalf = cardHeight / 2;

	let placement: AnchoredPlacement = "right";
	let left = rect.right + GAP;
	let top = rect.top + rect.height / 2;

	if (left + CARD_WIDTH > viewportW - VIEWPORT_MARGIN) {
		placement = "bottom";
		left = Math.max(
			VIEWPORT_MARGIN,
			Math.min(rect.left, viewportW - CARD_WIDTH - VIEWPORT_MARGIN),
		);
		top = rect.bottom + GAP;
	}

	if (placement === "right") {
		const minCenter = VIEWPORT_MARGIN + cardHalf;
		const maxCenter = viewportH - VIEWPORT_MARGIN - cardHalf;
		if (maxCenter >= minCenter) {
			top = Math.max(minCenter, Math.min(top, maxCenter));
		} else {
			top = VIEWPORT_MARGIN;
		}
	} else {
		top = Math.min(top, viewportH - cardHeight - VIEWPORT_MARGIN);
		top = Math.max(VIEWPORT_MARGIN, top);
	}

	return { top, left, placement };
}

/**
 * Positions a floating tip next to a DOM target (sidebar section, etc.).
 * Retries briefly so the sidebar can finish rendering after navigation.
 */
export function useAnchoredPosition(
	targetSelector: string | null,
	enabled: boolean,
	cardHeight = CARD_HEIGHT_DEFAULT,
): AnchoredPosition {
	const [pos, setPos] = useState<AnchoredPosition>({
		top: 0,
		left: 0,
		placement: "right",
		ready: false,
	});

	const update = useCallback(() => {
		if (!enabled || !targetSelector) {
			setPos((prev) => ({ ...prev, ready: false }));
			return;
		}
		const el = document.querySelector(targetSelector);
		if (!el) {
			setPos((prev) => ({ ...prev, ready: false }));
			return;
		}
		const rect = el.getBoundingClientRect();
		const next = computePosition(rect, cardHeight);
		setPos({ ...next, ready: true });
	}, [enabled, targetSelector, cardHeight]);

	useEffect(() => {
		if (!enabled || !targetSelector) {
			setPos((prev) => ({ ...prev, ready: false }));
			return;
		}

		let cancelled = false;
		let attempts = 0;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;

		const tryUpdate = () => {
			if (cancelled) return;
			const el = document.querySelector(targetSelector);
			if (el) {
				update();
				return;
			}
			attempts += 1;
			if (attempts < RETRY_COUNT) {
				retryTimer = setTimeout(tryUpdate, RETRY_MS);
			} else {
				setPos({ ...FALLBACK_POSITION, ready: true });
			}
		};

		tryUpdate();

		window.addEventListener("resize", update);
		window.addEventListener("scroll", update, true);

		return () => {
			cancelled = true;
			if (retryTimer) clearTimeout(retryTimer);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [enabled, targetSelector, update]);

	return pos;
}
