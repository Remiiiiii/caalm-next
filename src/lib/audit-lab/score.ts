export type PracticeDimensions = {
	accuracy: number;
	evidence: number;
	conciseness: number;
	honesty: number;
};

/** Honest "I don't know" answers are acceptable in rehearsal (spec §6.4). */
export function applyPracticeScore(answer: string, score: number) {
	const honestUnknown = /i don't know|i'll find out|i will find out/i.test(
		answer,
	);
	const normalized = honestUnknown ? Math.max(score, 3) : score;
	const pct = Math.min(100, Math.max(0, Math.round((normalized / 5) * 100)));
	const dimensions: PracticeDimensions = {
		accuracy: pct,
		evidence: /record|ticket|policy|log|show me/i.test(answer)
			? pct
			: Math.max(40, pct - 20),
		conciseness: answer.length > 400 ? Math.max(30, pct - 25) : pct,
		honesty: honestUnknown ? 100 : pct,
	};
	return {
		score: normalized,
		honestUnknown,
		dimensions,
	};
}
