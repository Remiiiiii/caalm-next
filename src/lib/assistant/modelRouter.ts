import type { AssistantDataIntent } from "@/lib/assistant/intent";
import type { PricingTier } from "@/lib/stripe/prices";

export type AssistantLlmProvider = "gemini" | "claude";
export type AssistantTurnKind = "help" | "action";

/**
 * Starter → Gemini only.
 * Growth → Gemini for help/RAG, Claude for tool-calling actions.
 * Enterprise → Claude only.
 * Unknown / missing tier → starter (cheapest default).
 */
export function resolveAssistantProvider(params: {
	tier: PricingTier;
	kind: AssistantTurnKind;
}): AssistantLlmProvider {
	const { tier, kind } = params;
	switch (tier) {
		case "starter":
			return "gemini";
		case "growth":
			return kind === "action" ? "claude" : "gemini";
		case "enterprise":
			return "claude";
		default: {
			const _exhaustive: never = tier;
			return _exhaustive;
		}
	}
}

/** Live-data / mutating intents and remediation are action turns. */
export function resolveAssistantTurnKind(params: {
	dataIntent: AssistantDataIntent;
	hasRemediation?: boolean;
}): AssistantTurnKind {
	if (params.hasRemediation) return "action";
	if (params.dataIntent !== null) return "action";
	return "help";
}
