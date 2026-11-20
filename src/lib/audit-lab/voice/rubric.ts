import type { ReviewQuestion } from "@/lib/audit-lab/types";

/** What gets serialized into the LiveKit agent job's metadata as the interview rubric. */
export type VoiceRubricItem = {
	questionId: string;
	prompt: string;
	source: string;
	difficulty: string;
	controlRef?: string;
};

export function buildVoiceRubric(
	questions: ReviewQuestion[],
): VoiceRubricItem[] {
	return questions.map((q) => ({
		questionId: q.$id,
		prompt: q.prompt,
		source: q.source,
		difficulty: q.difficulty,
		controlRef: q.controlRef,
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
