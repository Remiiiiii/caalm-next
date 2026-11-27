import { describe, expect, it } from "vitest";
import {
	buildEvidenceAttachedThinkingNote,
	buildInterviewWrapUpThinkingNote,
} from "./thinking-notes";

describe("thinking-notes", () => {
	it("includes questionId and wrap-up tool for evidence notes", () => {
		const note = buildEvidenceAttachedThinkingNote({
			questionId: "q-provider",
			prompt: "Active provider contract",
			fileName: "provider.pdf",
			wrapUpTool: "conclude_interview",
		});
		expect(note).toContain("questionId: q-provider");
		expect(note).toContain("provider.pdf");
		expect(note).toContain("conclude_interview");
		expect(note).toContain("evidenceAccepted");
	});

	it("lists covered ids and end_call for Nuance wrap-up", () => {
		const note = buildInterviewWrapUpThinkingNote({
			wrapUpTool: "end_call",
			coveredQuestionIds: ["q1", "q2"],
		});
		expect(note).toContain("q1, q2");
		expect(note).toContain("end_call");
		expect(note).toContain("Do not ask another question");
	});
});
