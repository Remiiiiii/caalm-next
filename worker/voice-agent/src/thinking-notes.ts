/**
 * Mid-call thinking notes for the LiveKit interviewer.
 * Keep wording in sync with src/lib/audit-lab/voice/thinking-notes.ts.
 */

export function buildEvidenceAttachedThinkingNote(params: {
	questionId: string;
	prompt: string;
	fileName: string;
}): string {
	const prompt = params.prompt.trim() || "(unknown prompt)";
	const fileName = params.fileName.trim() || "unknown file";
	return [
		"Evidence file attached and scanned clean.",
		`questionId: ${params.questionId}`,
		`rubric prompt: "${prompt}"`,
		`file name: ${fileName}`,
		"Judge whether THIS file supports THIS rubric item (match the requirement in the file name/title to the prompt).",
		"Call record_response_and_advance with evidenceAccepted true only if it matches; false if it is for a different requirement or the wrong document.",
		"If evidenceAccepted is false, tell them they can upload a different file. If they want to move on without fixing it, call skip_current_question.",
		"If that was the last rubric item and you just recorded it, thank them briefly and call conclude_interview now.",
	].join("\n");
}

export function buildInterviewWrapUpThinkingNote(params: {
	coveredQuestionIds: string[];
}): string {
	const ids =
		params.coveredQuestionIds.length > 0
			? params.coveredQuestionIds.join(", ")
			: "(none listed)";
	return [
		"All rubric items for this interview are covered.",
		`covered questionIds: ${ids}`,
		"Do not ask another question.",
		"Thank them briefly in one short sentence, then call conclude_interview now.",
	].join("\n");
}
