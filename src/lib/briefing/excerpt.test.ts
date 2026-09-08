import { describe, expect, it } from "vitest";
import { excerptWords, htmlToPlainText } from "./excerpt";

describe("news excerpt", () => {
	it("keeps the first 20 words and adds ...", () => {
		const body =
			"A month after tens of thousands of migrants entered the city of Ceuta, a Spanish exclave in North Africa, there are still thousands waiting at the border fence.";
		expect(excerptWords(body)).toBe(
			"A month after tens of thousands of migrants entered the city of Ceuta, a Spanish exclave in North Africa, there...",
		);
	});

	it("does not add ... when the body is already short", () => {
		expect(excerptWords("Floods hit Nepal overnight.")).toBe(
			"Floods hit Nepal overnight.",
		);
	});

	it("strips HTML from RSS descriptions", () => {
		expect(
			htmlToPlainText(
				"<p>A month after tens of thousands of migrants entered the city.</p>",
			),
		).toBe("A month after tens of thousands of migrants entered the city.");
	});

	it("decodes hex HTML entities in descriptions", () => {
		expect(htmlToPlainText("Nepal&#x27;s disaster")).toBe("Nepal's disaster");
	});
});
