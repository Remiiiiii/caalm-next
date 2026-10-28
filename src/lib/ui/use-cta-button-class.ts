"use client";

import { usePathname } from "next/navigation";

/**
 * EXPERIMENT: on /dashboard/superadmin the primary call-to-action buttons use
 * `.btn-secondary` (the Open assistant pill). Everywhere else they keep
 * `.btn-primary`. Delete this hook and put `btn-primary` back to end it.
 */
export function useCtaButtonClass(): "btn-secondary" | "btn-primary" {
	const pathname = usePathname();
	return pathname?.startsWith("/dashboard/superadmin")
		? "btn-secondary"
		: "btn-primary";
}
