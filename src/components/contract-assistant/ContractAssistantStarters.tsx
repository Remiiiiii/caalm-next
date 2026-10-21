"use client";

type StarterPrompt = {
	label: string;
	prompt: string;
};

export function ContractAssistantStarters({
	prompts,
	loading,
	onSelect,
}: {
	prompts: StarterPrompt[];
	loading?: boolean;
	onSelect: (prompt: string) => void;
}) {
	if (loading) {
		return (
			<div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
				{[1, 2, 3, 4].map((item) => (
					<div
						key={item}
						className="h-7 w-28 shrink-0 animate-pulse rounded-full border border-slate-200 bg-slate-50"
					/>
				))}
			</div>
		);
	}

	if (!prompts.length) return null;

	return (
		<div>
			<p className="mb-2 text-xs font-semibold text-slate-500">
				Explore what’s in this contract
			</p>
			<div className="flex flex-wrap gap-2">
				{prompts.map((item) => (
					<button
						key={item.label}
						type="button"
						className="caalm-chip-hover cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all duration-200"
						onClick={() => onSelect(item.prompt)}
					>
						{item.label}
					</button>
				))}
			</div>
		</div>
	);
}
