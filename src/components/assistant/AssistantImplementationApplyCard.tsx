"use client";

import { Loader2 } from "lucide-react";
import AssistantResearchTracePlayback from "@/components/assistant/AssistantResearchTracePlayback";
import type { AssistantResearchStep } from "@/lib/assistant/assistant-research-steps";
import type { ImplementationChange } from "@/lib/assistant/implementation-analysis";

export default function AssistantImplementationApplyCard({
	changes,
	busy,
	applyProgressSteps,
	onApply,
	onCancel,
}: {
	changes: ImplementationChange[];
	busy?: boolean;
	applyProgressSteps?: AssistantResearchStep[] | null;
	onApply: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white/80">
			<div className="border-b border-slate-200/80 px-3 py-2">
				<p className="text-sm font-semibold text-[#0f5384]">
					Start corrective action (Open → In progress)
				</p>
			</div>
			<ul className="space-y-1.5 px-3 py-2.5 text-xs text-slate-600">
				{changes.map((change) => (
					<li key={change.label}>
						<span className="font-medium text-slate-700">{change.label}:</span>{" "}
						{change.current} → {change.required}
					</li>
				))}
			</ul>
			{busy && applyProgressSteps?.length ? (
				<div className="border-t border-slate-200/80 px-3 py-2.5">
					<AssistantResearchTracePlayback
						steps={applyProgressSteps}
						autoPlayback
					/>
				</div>
			) : null}
			<div className="flex items-center justify-end gap-3 border-t border-slate-200/80 px-3 py-2">
				<button
					type="button"
					className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={busy}
					onClick={onCancel}
				>
					Cancel
				</button>
				<button
					type="button"
					className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#0f5384] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
					disabled={busy}
					onClick={onApply}
				>
					{busy ? (
						<Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
					) : null}
					Start corrective action
				</button>
			</div>
		</div>
	);
}
