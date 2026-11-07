import { describe, expect, it } from "vitest";
import {
	detectCapCloseAssistIntent,
	extractVerificationNoteFromText,
	isCapClosableStatus,
	resolveVerificationNoteForClose,
} from "./cap-close-assist";

describe("detectCapCloseAssistIntent", () => {
	it("detects open dialog phrasing", () => {
		expect(
			detectCapCloseAssistIntent("Please open the mark closed dialog and paste"),
		).toEqual({ kind: "open_dialog" });
	});

	it("detects draft note phrasing", () => {
		expect(
			detectCapCloseAssistIntent("Write a verification note for this cap"),
		).toEqual({ kind: "stage_note" });
	});

	it("detects open + paste the following phrasing", () => {
		expect(
			detectCapCloseAssistIntent(
				"Open mark closed and paste the following: Uploaded files and corrected the misclassification.",
			),
		).toEqual({ kind: "open_dialog" });
	});
});

describe("extractVerificationNoteFromText", () => {
	it("pulls quoted blockquote text", () => {
		const note = extractVerificationNoteFromText(
			'> "Corrective action mapping is complete and verified in CAALM."',
		);
		expect(note).toContain("Corrective action mapping");
	});

	it("pulls text after 'paste the following:'", () => {
		const note = extractVerificationNoteFromText(
			"Open mark closed and paste the following: Uploaded files and corrected the misclassification of CDC award expenditures.",
		);
		expect(note).toContain("Uploaded files and corrected");
	});
});

describe("isCapClosableStatus", () => {
	it("allows in progress and pending verification", () => {
		expect(isCapClosableStatus("in_progress")).toBe(true);
		expect(isCapClosableStatus("open")).toBe(false);
	});
});

describe("resolveVerificationNoteForClose", () => {
	it("prefers note embedded in the user message", () => {
		const note = resolveVerificationNoteForClose({
			userMessage: 'Use this: "All tasks complete with evidence on file."',
			priorAssistantContent: null,
			stagedDraft: null,
		});
		expect(note).toContain("All tasks complete");
	});
});
