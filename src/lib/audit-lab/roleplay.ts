import type { ReviewQuestion } from "./types";

export const AUDITOR_PERSONAS = [
	"friendly_collegiate",
	"by_the_book",
	"forensic",
	"regulator_style",
] as const;

export type AuditorPersona = (typeof AUDITOR_PERSONAS)[number];

export function nextPracticePrompt(
	questions: ReviewQuestion[],
	index: number,
): { prompt: string; index: number; done: boolean } {
	if (questions.length === 0) {
		return { prompt: "No questions in the bank yet.", index: 0, done: true };
	}
	const q = questions[Math.min(index, questions.length - 1)];
	const done = index >= questions.length;
	return {
		prompt: done
			? "Session complete. Review your scores."
			: q.prompt,
		index: done ? index : index + 1,
		done,
	};
}

export function followUpForVagueAnswer(answer: string): string | null {
	const trimmed = answer.trim();
	if (trimmed.length < 12) {
		return "Walk me through the last time that actually happened.";
	}
	if (/we usually|typically|generally/i.test(trimmed) && !/last|on|date/i.test(trimmed)) {
		return "When was the last specific occurrence? Who was involved?";
	}
	return null;
}