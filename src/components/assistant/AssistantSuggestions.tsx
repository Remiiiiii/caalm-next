"use client";

import { ArrowUpRight, Sparkles } from "lucide-react";
import type { AssistantSuggestion } from "@/components/assistant/assistantTypes";

type Props = {
	suggestions: AssistantSuggestion[];
	disabled?: boolean;
	onSelect: (suggestion: AssistantSuggestion) => void;
};

export default function AssistantSuggestions({
	suggestions,
	disabled,
	onSelect,
}: Props) {
	if (!suggestions.length) return null;

	return (
		<div className="mt-3 border-t border-slate-200/80 pt-3">
			<div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
				<Sparkles className="h-3.5 w-3.5 text-[#0f5384]" aria-hidden />
				Suggestions
			</div>
			<ul className="space-y-1">
				{suggestions.map((s) => (
					<li key={s.id}>
						<button
							type="button"
							disabled={disabled}
							onClick={() => onSelect(s)}
							className="flex w-full cursor-pointer items-start gap-2 rounded-md px-1 py-1.5 text-left text-sm text-slate-700 transition-colors duration-200 hover:bg-blue-50 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<ArrowUpRight
								className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400"
								aria-hidden
							/>
							<span>{s.label}</span>
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
