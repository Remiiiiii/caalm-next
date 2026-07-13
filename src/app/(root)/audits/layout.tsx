import type { ReactNode } from "react";
import Link from "next/link";
import { ClipboardCheck, ScrollText } from "lucide-react";

export default function AuditsLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<div>
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4">
				<nav className="flex gap-2 mb-2">
					<Link
						href="/audits/status"
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-200"
					>
						<ClipboardCheck className="h-4 w-4 text-[#0f5384]" />
						Compliance status
					</Link>
					<Link
						href="/audits/audit"
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors duration-200"
					>
						<ScrollText className="h-4 w-4 text-[#0f5384]" />
						Audit logs
					</Link>
				</nav>
			</div>
			{children}
		</div>
	);
}
