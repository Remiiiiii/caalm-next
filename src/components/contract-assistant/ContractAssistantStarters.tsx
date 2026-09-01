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
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{[1, 2, 3, 4].map((item) => (
					<div
						key={item}
						className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
					/>
				))}
			</div>
		);
	}

	if (!prompts.length) return null;

	return (
		<div>
			<p className="mb-3 text-sm font-semibold sidebar-gradient-text">
				Explore what’s in this contract
			</p>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{prompts.map((item) => (
					<button
						key={item.label}
						type="button"
						className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 text-left text-sm text-slate-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50"
						onClick={() => onSelect(item.prompt)}
					>
						<span className="font-semibold text-slate-800">{item.label}</span>
					</button>
				))}
			</div>
		</div>
	);
}
