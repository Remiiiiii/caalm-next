export type GeminiHistoryMessage = {
	role: "user" | "assistant";
	content: string;
};

/**
 * Gemini startChat history must begin with role "user" and must not include
 * the current turn (sendMessage adds that). Slice windows can land on an
 * assistant message — drop leading model turns and merge consecutive same roles.
 */
export function buildGeminiChatHistory(
	messages: GeminiHistoryMessage[],
	userMessage: string,
): Array<{ role: string; parts: Array<{ text: string }> }> {
	let prior = [...messages];
	const last = prior[prior.length - 1];
	if (last?.role === "user" && last.content === userMessage) {
		prior = prior.slice(0, -1);
	}

	prior = prior.slice(-12);
	while (prior.length > 0 && prior[0]!.role === "assistant") {
		prior = prior.slice(1);
	}

	const merged: GeminiHistoryMessage[] = [];
	for (const m of prior) {
		const content = m.content?.trim();
		if (!content) continue;
		const prev = merged[merged.length - 1];
		if (prev && prev.role === m.role) {
			prev.content = `${prev.content}\n\n${content}`;
		} else {
			merged.push({ role: m.role, content });
		}
	}

	return merged.map((m) => ({
		role: m.role === "assistant" ? "model" : "user",
		parts: [{ text: m.content }],
	}));
}
