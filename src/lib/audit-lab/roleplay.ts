import type { ReviewQuestion } from "./types";

export const AUDITOR_PERSONAS = [
	"friendly_collegiate",
	"by_the_book",
	"forensic",
	"regulator_style",
] as const;

export type AuditorPersona = (typeof AUDITOR_PERSONAS)[number];

export const INTERVIEWER_PROFILES: Record<
	AuditorPersona,
	{
		name: string;
		label: string;
		img: string;
		desc: string;
		/** CSS object-position; only needed when the source photo is a wider shot and the face sits off-center. */
		imgPosition?: string;
		/** Zoom multiplier applied around imgPosition; use when the face only fills a small part of the source frame. */
		imgScale?: number;
	}
> = {
	by_the_book: {
		name: "Amara",
		label: "By the book",
		img: "/assets/images/interviewers/amara.png",
		desc: "Amara works through the control framework in order and does not skip steps. Expect precise questions, requests for the exact policy or evidence, and a polite but firm push when an answer stays general.",
	},
	regulator_style: {
		name: "David",
		label: "Regulator style",
		img: "/assets/images/interviewers/david-v3.jpg",
		desc: "David cites the clause number before he asks the question and wants the control owner named, not just the control. If a response wouldn't satisfy an external examiner, he says so directly.",
	},
	friendly_collegiate: {
		name: "Simone",
		label: "Friendly collegiate",
		img: "/assets/images/interviewers/simone.jpg",
		desc: "Simone keeps the conversation relaxed and encouraging, but still checks every control. If evidence is thin she nudges for more rather than pushing back hard, treating a wrong answer as a chance to walk through it together.",
	},
	forensic: {
		name: "Valentina",
		label: "Forensic",
		img: "/assets/images/interviewers/valentina.jpg",
		desc: "Valentina looks for gaps between the stated process and the evidence in front of her. Expect follow-up questions for exact dates, system names, and anything that sounds like a vague timeline.",
	},
};

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
		prompt: done ? "Session complete. Review your scores." : q.prompt,
		index: done ? index : index + 1,
		done,
	};
}

export function followUpForVagueAnswer(answer: string): string | null {
	const trimmed = answer.trim();
	if (trimmed.length < 12) {
		return "Walk me through the last time that actually happened.";
	}
	if (
		/we usually|typically|generally/i.test(trimmed) &&
		!/last|on|date/i.test(trimmed)
	) {
		return "When was the last specific occurrence? Who was involved?";
	}
	return null;
}
