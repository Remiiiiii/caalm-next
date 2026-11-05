"use client";

import { ClipboardCheck, Gauge, ScrollText } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";

const SECTION_TABS = [
	{
		href: "/audits/readiness",
		label: "Readiness",
		icon: Gauge,
		match: (pathname: string) => pathname.startsWith("/audits/readiness"),
	},
	{
		href: "/audits/status",
		label: "Compliance status",
		icon: ClipboardCheck,
		match: (pathname: string) =>
			pathname === "/audits/status" || pathname.startsWith("/audits/status/"),
	},
	{
		href: "/audits/audit",
		label: "Audit logs",
		icon: ScrollText,
		match: (pathname: string) => pathname.startsWith("/audits/audit"),
	},
	{
		href: "/audits/uploads",
		label: "Uploaded audits",
		icon: ClipboardCheck,
		match: (pathname: string) =>
			pathname.startsWith("/audits/uploads") ||
			pathname.startsWith("/audits/upload/"),
	},
] as const;

type SectionHref = (typeof SECTION_TABS)[number]["href"];

/** Audit sections as a switch; each tab is a route. */
export function AuditsSectionNav({
	hideOnReadiness = false,
	className = "mb-4",
}: {
	/** Layout copy: the Readiness page renders its own switch above the score card. */
	hideOnReadiness?: boolean;
	className?: string;
}) {
	const pathname = usePathname() || "";
	const router = useRouter();
	const active =
		SECTION_TABS.find((tab) => tab.match(pathname))?.href ??
		SECTION_TABS[0].href;

	const hidden = hideOnReadiness && active === "/audits/readiness";

	useEffect(() => {
		for (const tab of SECTION_TABS) router.prefetch(tab.href);
	}, [router]);

	if (hidden) return null;

	return (
		<SegmentedToggle<SectionHref>
			value={active}
			onChange={(href) => router.push(href)}
			ariaLabel="Audit sections"
			className={className}
			tabs={SECTION_TABS.map((tab) => ({
				value: tab.href,
				label: tab.label,
				icon: tab.icon,
				iconClassName: "text-[#0f5384]",
			}))}
		/>
	);
}
