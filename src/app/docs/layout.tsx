import { DocsShell } from "@/components/docs/DocsShell";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
	title: {
		default: "CAALM Docs",
		template: "%s · CAALM Docs",
	},
	description:
		"Complete documentation for CAALM — contracts, licenses, audits, roles, permissions, and day-to-day workflows.",
};

export default function DocsLayout({ children }: { children: ReactNode }) {
	return <DocsShell>{children}</DocsShell>;
}
