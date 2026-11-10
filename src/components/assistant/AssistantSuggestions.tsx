"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import type { AssistantSuggestion } from "@/components/assistant/assistantTypes";

type Props = {
	suggestions: AssistantSuggestion[];
	disabled?: boolean;
	onSelect: (suggestion: AssistantSuggestion) => void;
	variant?: "pills" | "list";
};

export default function AssistantSuggestions({
	suggestions,
	disabled,
	onSelect,
	variant = "pills",
}: Props) {
	if (!suggestions.length) return null;

	if (variant === "list") {
		return (
		<div>
			<p className="mb-1.5 text-xs font-medium text-slate-500">Suggestions</p>
				<ul className="space-y-1">
					{suggestions.map((suggestion) => (
						<li key={suggestion.id}>
							<button
								type="button"
								disabled={disabled}
								onClick={() => onSelect(suggestion)}
								className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
							>
								<ArrowRight
									className="h-3.5 w-3.5 shrink-0 text-slate-400"
									aria-hidden
								/>
								<span className="min-w-0 flex-1">{suggestion.label}</span>
								<Sparkles
									className="h-3.5 w-3.5 shrink-0 text-[#078fab]"
									aria-hidden
								/>
							</button>
						</li>
					))}
				</ul>
			</div>
		);
	}

	return (
		<div>
			<p className="mb-1.5 text-xs font-medium text-slate-500">Suggestions</p>
			<div className="flex flex-wrap gap-1.5">
				{suggestions.map((suggestion) => (
					<button
						key={suggestion.id}
						type="button"
						disabled={disabled}
						onClick={() => onSelect(suggestion)}
						className="caalm-chip-hover cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{suggestion.label}
					</button>
				))}
			</div>
		</div>
	);
}
