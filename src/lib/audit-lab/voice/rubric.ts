import type { ReviewQuestion } from "@/lib/audit-lab/types";

/** What gets serialized into the LiveKit agent job's metadata as the interview rubric. */
export type VoiceRubricItem = {
	questionId: string;
	prompt: string;
	source: string;
	difficulty: string;
	controlRef?: string;
	/** Whether this item expects a supporting document, not just a spoken answer — see rubric wording below. */
	requiresEvidence: boolean;
};

/** A question only calls for evidence when its rubric text actually asks for one — not every rubric row does (e.g. a process walkthrough graded on the answer alone). */
export function requiresEvidenceFromRubric(rubric?: string): boolean {
	if (!rubric) return false;
	return /\b(evidence|record|document)/i.test(rubric);
}

export function buildVoiceRubric(
	questions: ReviewQuestion[],
): VoiceRubricItem[] {
	return questions.map((q) => ({
		questionId: q.$id,
		prompt: q.prompt,
		source: q.source,
		difficulty: q.difficulty,
		controlRef: q.controlRef,
		requiresEvidence:
			q.requiresEvidence ?? requiresEvidenceFromRubric(q.rubric),
	}));
}

/** The exact job-metadata shape the worker (`worker/voice-agent`) parses on dispatch. */
export type VoiceAgentJobMetadata = {
	attemptId: string;
	orgId: string;
	sessionTitle: string;
	persona: string;
	rubric: VoiceRubricItem[];
};
