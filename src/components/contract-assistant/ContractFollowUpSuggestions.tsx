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
				Follow-up questions
			</p>
			<div className="flex flex-wrap gap-2">
				{labels.map((question) => (
					<button
						key={question}
						type="button"
						disabled={disabled}
						className="caalm-chip-hover cursor-pointer rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60"
						onClick={() => onSelect(question)}
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}
