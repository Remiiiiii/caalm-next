import { describe, expect, it } from "vitest";
import {
	parseScriptItems,
	placeQuestionInSection,
	sectionMinutes,
	serializeScriptItems,
	suggestScriptSectionForQuestion,
} from "./script-sections";

describe("script-sections", () => {
	it("migrates legacy flat arrays into process", () => {
		const canvas = parseScriptItems(
			JSON.stringify([{ questionId: "q1", prompt: "Hello", minutes: 3 }]),
		);
		expect(canvas.process).toHaveLength(1);
		expect(canvas.opening).toHaveLength(0);
	});

	it("round-trips sectioned scripts", () => {
		let canvas = parseScriptItems("{}");
		canvas = placeQuestionInSection(canvas, "opening", {
			$id: "q1",
			prompt: "Intro?",
		});
		const again = parseScriptItems(serializeScriptItems(canvas));
		expect(again.opening[0]?.prompt).toBe("Intro?");
		expect(sectionMinutes(again.opening)).toBe(5);
	});

	it("puts evidence walkthroughs in evidence, not opening/closing", () => {
		const written =
			"Walk me through how you meet this requirement: Written contracts. What evidence do you have, and where is it on file?";
		const provider =
			"Walk me through how you meet this requirement: Active provider contract. What evidence do you have, and where is it on file?";
		expect(suggestScriptSectionForQuestion(written, 0, 2)).toBe("evidence");
		expect(suggestScriptSectionForQuestion(provider, 1, 2)).toBe("evidence");
	});
});