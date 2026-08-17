import type { ReactNode } from "react";
import { AuditsSectionNav } from "@/components/audits/AuditsSectionNav";

export default function AuditsLayout({ children }: { children: ReactNode }) {
	return (
		<div>
			<div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 pt-4">
				<AuditsSectionNav />
			</div>
			{children}
		</div>
	);
}
