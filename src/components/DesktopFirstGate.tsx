"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DesktopRequiredScreen } from "@/components/ui/DesktopRequiredScreen";
import { useIsMobileState } from "@/hooks/use-mobile";
import { isDesktopRequiredPath } from "@/lib/ui/desktop-first";

export function DesktopFirstGate({ children }: { children: ReactNode }) {
	const pathname = usePathname() || "/";
	const isMobile = useIsMobileState();

	// Wait until width is measured so we don't flash the gate on desktop.
	if (isMobile === true && isDesktopRequiredPath(pathname)) {
		return <DesktopRequiredScreen pathname={pathname} />;
	}

	return children;
}
