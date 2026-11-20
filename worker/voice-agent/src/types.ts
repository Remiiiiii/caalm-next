/**
 * Mirrors `VoiceRubricItem`/`VoiceAgentJobMetadata` in the main app
 * (`src/lib/audit-lab/voice/rubric.ts`) — keep these two in sync by hand, this
 * package has no dependency on the Next.js app's source.
 */
export type VoiceRubricItem = {
	questionId: string;
	prompt: string;
	source: string;
	difficulty: string;
	controlRef?: string;
};

export type VoiceAgentJobMetadata = {
	attemptId: string;
	orgId: string;
	sessionTitle: string;
	persona: string;
	rubric: VoiceRubricItem[];
};
