"use client";

function normalizeFollowUpQuestion(question: unknown): string {
	if (typeof question === "string") return question.trim();
	if (!question || typeof question !== "object") return "";
	const row = question as Record<string, unknown>;
	for (const key of ["prompt", "question", "text", "label"] as const) {
		const value = row[key];
		if (typeof value === "string" && value.trim()) return value.trim();
	}
	return "";
}

export function ContractFollowUpSuggestions({
	questions,
	disabled,
	onSelect,
}: {
	questions: unknown[];
	disabled?: boolean;
	onSelect: (question: string) => void;
}) {
	const labels = questions
		.map(normalizeFollowUpQuestion)
		.filter(Boolean)
		.filter((question, index, all) => all.indexOf(question) === index);

	if (!labels.length) return null;

	return (
		<div>
			<p className="mb-2 text-sm font-semibold sidebar-gradient-text">
				What can I help with next?
			</p>
			<div className="flex flex-col gap-2">
				{labels.map((question) => (
					<button
						key={question}
						type="button"
						disabled={disabled}
						className="w-full cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2.5 text-left text-xs text-slate-600 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
						onClick={() => onSelect(question)}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}
