"use client";

import { useEffect, useState } from "react";

const OVERLAY_SELECTOR =
	'[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

function hasOpenOverlay(): boolean {
	return Boolean(document.querySelector(OVERLAY_SELECTOR));
}

/**
 * True when a Radix dialog or alert dialog is open anywhere in the tree.
 * Used to hide global FABs so they do not stack on full-window modals.
 */
export function useFullWindowOverlayOpen(): boolean {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		const sync = () => setOpen(hasOpenOverlay());
		sync();

		const observer = new MutationObserver(sync);
		observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["data-state", "role"],
		});

		return () => observer.disconnect();
	}, []);

	return open;
}
