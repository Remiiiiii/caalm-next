import { describe, expect, it } from "vitest";
import {
	parseScriptItems,
	placeQuestionInSection,
	sectionMinutes,
	serializeScriptItems,
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
});