"use client";

import { useCallback, useState } from "react";

/**
 * Wraps an export/download handler (sync or async) so its button can show a
 * spinner. `minMs` keeps the spinner visible for handlers that finish instantly.
 */
export function useBusyAction<A extends unknown[]>(
	action: (...args: A) => unknown,
	minMs = 400,
) {
	const [busy, setBusy] = useState(false);
	const run = useCallback(
		async (...args: A) => {
			setBusy(true);
			try {
				await Promise.all([
					action(...args),
					new Promise((resolve) => setTimeout(resolve, minMs)),
				]);
			} finally {
				setBusy(false);
			}
		},
		[action, minMs],
	);
	return [run, busy] as const;
}
