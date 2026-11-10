import { describe, expect, it } from "vitest";
import {
	resolveAssistantProvider,
	resolveAssistantTurnKind,
} from "@/lib/assistant/modelRouter";

describe("resolveAssistantProvider", () => {
	it("starter always uses Gemini", () => {
		expect(
			resolveAssistantProvider({ tier: "starter", kind: "help" }),
		).toBe("gemini");
		expect(
			resolveAssistantProvider({ tier: "starter", kind: "action" }),
		).toBe("gemini");
	});

	it("growth splits help → Gemini and action → Claude", () => {
		expect(
			resolveAssistantProvider({ tier: "growth", kind: "help" }),
		).toBe("gemini");
		expect(
			resolveAssistantProvider({ tier: "growth", kind: "action" }),
		).toBe("claude");
	});

	it("enterprise always uses Claude", () => {
		expect(
			resolveAssistantProvider({ tier: "enterprise", kind: "help" }),
		).toBe("claude");
		expect(
			resolveAssistantProvider({ tier: "enterprise", kind: "action" }),
		).toBe("claude");
	});
});

describe("resolveAssistantTurnKind", () => {
	it("treats null intent as help", () => {
		expect(resolveAssistantTurnKind({ dataIntent: null })).toBe("help");
	});

	it("treats data intents and remediation as action", () => {
		expect(
			resolveAssistantTurnKind({ dataIntent: "list_tasks" }),
		).toBe("action");
		expect(
			resolveAssistantTurnKind({
				dataIntent: null,
				hasRemediation: true,
			}),
		).toBe("action");
	});
});
