"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DemoTipCard } from "@/components/demo/tour/DemoTipCard";
import {
	useAnchoredPosition,
	CARD_HEIGHT_DEFAULT,
	CARD_HEIGHT_WITH_IMAGE,
	CENTERED_POSITION,
} from "@/hooks/useAnchoredPosition";
import { isDemoMode } from "@/lib/config/demo-mode";
import { getSeenTipIds, markTipSeen } from "@/lib/demo/tour/storage";
import {
	getNextTip,
	getPreviousTip,
	getTipForPathname,
	getTipNavHref,
	getTipStep,
	type DemoTip,
} from "@/lib/demo/tour/tips";

const SHOW_DELAY_MS = 500;

/**
 * Demo-only coach marks: auto-show one tip per first visit to a matched route.
 */
export default function DemoTourLayer() {
	const pathname = usePathname();
	const router = useRouter();
	const [activeTip, setActiveTip] = useState<DemoTip | null>(null);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!isDemoMode()) return;

		const timer = window.setTimeout(() => {
			setActiveTip((current) => {
				if (current) return current;
				return getTipForPathname(pathname, getSeenTipIds());
			});
		}, SHOW_DELAY_MS);

		return () => window.clearTimeout(timer);
	}, [pathname]);

	const dismiss = useCallback(() => {
		if (activeTip) {
			markTipSeen(activeTip.id);
		}
		setActiveTip(null);
	}, [activeTip]);

	const goToNext = useCallback(() => {
		if (!activeTip) return;

		markTipSeen(activeTip.id);
		const next = getNextTip(activeTip.id);
		if (!next) {
			setActiveTip(null);
			return;
		}

		setActiveTip(next);
		router.push(getTipNavHref(next));
	}, [activeTip, router]);

	const goToPrevious = useCallback(() => {
		if (!activeTip) return;

		const previous = getPreviousTip(activeTip.id);
		if (!previous) return;

		setActiveTip(previous);
		router.push(getTipNavHref(previous));
	}, [activeTip, router]);

	const isCentered = activeTip?.position === "center";

	const anchoredPosition = useAnchoredPosition(
		isCentered ? null : (activeTip?.targetSelector ?? null),
		Boolean(activeTip) && !isCentered,
		activeTip?.image ? CARD_HEIGHT_WITH_IMAGE : CARD_HEIGHT_DEFAULT,
	);

	const position = isCentered
		? { ...CENTERED_POSITION, ready: true }
		: anchoredPosition;

	if (
		!isDemoMode() ||
		!mounted ||
		!activeTip ||
		(!isCentered && !position.ready)
	) {
		return null;
	}

	const { current, total } = getTipStep(activeTip.id);
	const hasPrevious = Boolean(getPreviousTip(activeTip.id));
	const hasNext = Boolean(getNextTip(activeTip.id));

	return createPortal(
		<>
			<div
				className="fixed inset-0 z-[99] bg-slate-900/20 backdrop-blur-[1px] animate-in fade-in-0 duration-200"
				aria-hidden="true"
				onClick={dismiss}
			/>
			<DemoTipCard
				tip={activeTip}
				top={position.top}
				left={position.left}
				placement={position.placement}
				stepCurrent={current}
				stepTotal={total}
				hasPrevious={hasPrevious}
				hasNext={hasNext}
				onPrevious={goToPrevious}
				onNext={goToNext}
				onDismiss={dismiss}
			/>
		</>,
		document.body,
	);
}
