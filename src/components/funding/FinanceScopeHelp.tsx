import { Info } from "lucide-react";
import { FUNDING_SCOPE_HELP } from "@/lib/funding/finance-scope-copy";

export function FinanceScopeHelp() {
	return (
		<div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-3">
			<Info className="h-5 w-5 text-[#0f5384] shrink-0 mt-0.5" />
			<p className="text-sm text-slate-600">{FUNDING_SCOPE_HELP}</p>
		</div>
	);
}
