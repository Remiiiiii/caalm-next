import { describe, expect, it } from "vitest";
import {
	createEmptyInterviewState,
	decideRecordAndAdvance,
	decideSkipQuestion,
	type InterviewAdvanceState,
	markEvidenceAttached,
	reopenAttachAfterRejectedEvidence,
	unlockAttachAfterAuditorFinishedAsking,
} from "./advance-interview";

function freshState(): InterviewAdvanceState {
	return createEmptyInterviewState(
		[
			{
				questionId: "q1",
				prompt: "Show your access review log",
				difficulty: "medium",
				requiresEvidence: true,
			},
			{
				questionId: "q2",
				prompt: "Who owns the policy?",
				difficulty: "easy",
				requiresEvidence: false,
			},
		],
		"q1",
	);
}

describe("unlockAttachAfterAuditorFinishedAsking", () => {
	it("opens attach only for evidence questions still needing a file", () => {
		const state = freshState();
		expect(unlockAttachAfterAuditorFinishedAsking(state)).toBe(true);
		expect(state.posed.has("q1")).toBe(true);
		expect(state.attachOpen.has("q1")).toBe(true);
		expect(unlockAttachAfterAuditorFinishedAsking(state)).toBe(false);
	});
});

describe("reopenAttachAfterRejectedEvidence", () => {
	it("clears the document flag and keeps the paperclip open", () => {
		const state = freshState();
		unlockAttachAfterAuditorFinishedAsking(state);
		markEvidenceAttached(state, "q1");
		expect(state.documented.has("q1")).toBe(true);
		// First upload no longer closes attach — replace stays available.
		expect(state.attachOpen.has("q1")).toBe(true);

		expect(reopenAttachAfterRejectedEvidence(state, "q1")).toBe(true);
		expect(state.documented.has("q1")).toBe(false);
		expect(state.attachOpen.has("q1")).toBe(true);
	});
});

describe("markEvidenceAttached", () => {
	it("records the document without locking the paperclip", () => {
		const state = freshState();
		unlockAttachAfterAuditorFinishedAsking(state);
		expect(markEvidenceAttached(state, "q1")).toBe(true);
		expect(state.documented.has("q1")).toBe(true);
		expect(state.attachOpen.has("q1")).toBe(true);
	});
});

describe("decideSkipQuestion", () => {
	it("lets the interviewee move on without answer or evidence", () => {
		const state = freshState();
		const decision = decideSkipQuestion(state, {
			questionId: "q1",
			reason: "no evidence available",
		});
		expect(decision.action).toBe("advance");
		expect(state.covered.has("q1")).toBe(true);
		expect(state.currentQuestionId).toBe("q2");
		expect(state.attachOpen.has("q1")).toBe(false);
	});
});

describe("decideRecordAndAdvance", () => {
	it("blocks evidence questions until a document lands", () => {
		const state = freshState();
		const decision = decideRecordAndAdvance(state, {
			questionId: "q1",
			answerQuality: "strong",
		});
		expect(decision.action).toBe("blocked");
		expect(state.covered.has("q1")).toBe(false);
	});

	it("advances after evidence is attached and accepted", () => {
		const state = freshState();
		markEvidenceAttached(state, "q1");
		const decision = decideRecordAndAdvance(state, {
			questionId: "q1",
			answerQuality: "adequate",
			evidenceAccepted: true,
		});
		expect(decision.action).toBe("advance");
		expect(state.covered.has("q1")).toBe(true);
		expect(state.currentQuestionId).toBe("q2");
	});

	it("reopens attach when evidence is rejected so they can upload again", () => {
		const state = freshState();
		unlockAttachAfterAuditorFinishedAsking(state);
		markEvidenceAttached(state, "q1");
		const decision = decideRecordAndAdvance(state, {
			questionId: "q1",
			answerQuality: "adequate",
			evidenceAccepted: false,
		});
		expect(decision.action).toBe("blocked");
		expect(state.documented.has("q1")).toBe(false);
		expect(state.attachOpen.has("q1")).toBe(true);
		expect(state.covered.has("q1")).toBe(false);
	});

	it("advances after two failed attempts", () => {
		const state = freshState();
		const first = decideRecordAndAdvance(state, {
			questionId: "q1",
			answerQuality: "weak",
		});
		expect(first.action).toBe("blocked");
		const second = decideRecordAndAdvance(state, {
			questionId: "q1",
			answerQuality: "weak",
		});
		expect(second.action).toBe("advance");
		expect(state.covered.has("q1")).toBe(true);
	});
});
