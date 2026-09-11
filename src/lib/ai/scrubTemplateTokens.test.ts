import { describe, expect, it } from "vitest";
import {
	isTemplateTokenValue,
	scrubTemplateTokenValue,
} from "./scrubTemplateTokens";

describe("scrubTemplateTokens", () => {
	it("detects leftover merge tokens", () => {
		expect(isTemplateTokenValue("{{CONTRACTOR_NAME}}")).toBe(true);
		expect(isTemplateTokenValue("  {{CONTRACTOR_SIGNEE_TITLE}}  ")).toBe(true);
		expect(isTemplateTokenValue("CAALM filled")).toBe(false);
	});

	it("clears token strings and keeps real text", () => {
		expect(scrubTemplateTokenValue("{{CONTRACTOR_NAME}}")).toBeUndefined();
		expect(scrubTemplateTokenValue("Acme LLC")).toBe("Acme LLC");
	});
});
