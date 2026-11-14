/** Honest "I don't know" answers are acceptable in rehearsal (spec §9). */
export function applyPracticeScore(answer: string, score: number) {
	const honestUnknown = /i don't know|i'll find out|i will find out/i.test(
		answer,
	);
	return {
		score: honestUnknown ? Math.max(score, 3) : score,
		honestUnknown,
	};
}
