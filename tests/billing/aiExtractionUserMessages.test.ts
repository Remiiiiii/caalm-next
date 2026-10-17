import { describe, expect, it } from "vitest";
import {
	AiExtractionLimitError,
	isAiExtractionLimitError,
	plainAiExtractionLimitMessage,
	throwIfAiExtractionHttpFailed,
} from "@/lib/billing/aiExtractionUserMessages";

describe("plainAiExtractionLimitMessage", () => {
	it("explains used/limit in plain English", () => {
		const msg = plainAiExtractionLimitMessage({
			used: 50,
			limit: 50,
			tier: "starter",
		});
		expect(msg).toContain("50");
		expect(msg).toContain("Settings → Billing");
		expect(msg).toContain("fill the form by hand");
	});

	it("mentions pilot when trialing", () => {
		const msg = plainAiExtractionLimitMessage({
			used: 100,
			limit: 100,
			tier: "growth",
			billingStatus: "trialing",
		});
		expect(msg).toContain("pilot");
	});
});

describe("throwIfAiExtractionHttpFailed", () => {
	it("throws AiExtractionLimitError on 402", async () => {
		const response = new Response(
			JSON.stringify({
				code: "PLAN_LIMIT_EXCEEDED",
				kind: "ai_extractions",
				used: 50,
				limit: 50,
				tier: "starter",
			}),
			{ status: 402 },
		);
		await expect(throwIfAiExtractionHttpFailed(response)).rejects.toBeInstanceOf(
			AiExtractionLimitError,
		);
	});

	it("does nothing when response is ok", async () => {
		const response = new Response("{}", { status: 200 });
		await expect(throwIfAiExtractionHttpFailed(response)).resolves.toBeUndefined();
	});
});

describe("isAiExtractionLimitError", () => {
	it("recognizes the typed error", () => {
		expect(isAiExtractionLimitError(new AiExtractionLimitError())).toBe(true);
		expect(isAiExtractionLimitError(new Error("other"))).toBe(false);
	});
});
