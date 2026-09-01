"use client";

export function ContractFollowUpSuggestions({
	questions,
	disabled,
	onSelect,
}: {
	questions: string[];
	disabled?: boolean;
	onSelect: (question: string) => void;
}) {
	if (!questions.length) return null;

	return (
		<div>
			<p className="mb-2 text-sm font-semibold sidebar-gradient-text">
				What can I help with next?
			</p>
			<div className="flex flex-wrap gap-2">
				{questions.map((question) => (
					<button
						key={question}
						type="button"
						disabled={disabled}
						className="cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
						onClick={() => onSelect(question)}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}
