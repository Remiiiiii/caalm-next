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

const docsThemeBoot = `(function(){try{var k='caalm-docs-theme';var t=localStorage.getItem(k);if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function DocsLayout({ children }: { children: ReactNode }) {
	return (
		<>
			<script dangerouslySetInnerHTML={{ __html: docsThemeBoot }} />
			<DocsShell>{children}</DocsShell>
		</>
	);
}
