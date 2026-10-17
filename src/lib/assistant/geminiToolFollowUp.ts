/**
 * Gemini 3.x rejects role "function" on tool results. The older
 * @google/generative-ai ChatSession.sendMessage still labels
 * functionResponse parts as role "function", which causes 400s.
 * Build the follow-up turn ourselves with role "user" instead.
 */

export type GeminiContent = {
	role: string;
	/** Loose parts so Gemini 3 fields (id, thoughtSignature) are allowed. */
	parts: Array<Record<string, unknown>>;
};

export type GeminiFunctionCall = {
	name: string;
	args?: object;
	/** Gemini 3.x returns an id; echo it on the matching functionResponse. */
	id?: string;
};

const ALLOWED_ROLES = new Set(["user", "model"]);

/**
 * Throws if any content uses a role Gemini 3.x rejects (e.g. "function").
 * Use in tests and before calling generateContent.
 */
export function assertGeminiContentRoles(contents: GeminiContent[]): void {
	for (const item of contents) {
		if (!ALLOWED_ROLES.has(item.role)) {
			throw new Error(
				`Invalid Gemini content role "${item.role}". Allowed: user, model.`,
			);
		}
	}
}

/**
 * Build contents for the tool-result turn after the model requested a function call.
 * Order: prior history → current user message → model functionCall → user functionResponse.
 */
export function buildGeminiToolFollowUpContents(params: {
	history: GeminiContent[];
	userMessage: string;
	modelContent: GeminiContent;
	functionCall: GeminiFunctionCall;
	toolResult: unknown;
}): GeminiContent[] {
	const { history, userMessage, modelContent, functionCall, toolResult } =
		params;

	const modelTurn: GeminiContent = {
		role: "model",
		parts:
			Array.isArray(modelContent.parts) && modelContent.parts.length > 0
				? modelContent.parts
				: [
						{
							functionCall: {
								name: functionCall.name,
								args: functionCall.args ?? {},
								...(functionCall.id ? { id: functionCall.id } : {}),
							},
						},
					],
	};

	const functionResponse: Record<string, unknown> = {
		name: functionCall.name,
		response: { output: toolResult },
	};
	if (functionCall.id) {
		functionResponse.id = functionCall.id;
	}

	const contents: GeminiContent[] = [
		...history,
		{ role: "user", parts: [{ text: userMessage }] },
		modelTurn,
		{
			role: "user",
			parts: [{ functionResponse }],
		},
	];

	assertGeminiContentRoles(contents);
	return contents;
}
