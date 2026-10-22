/**
 * Plain-English messages when monthly AI document reads are used up.
 * Shared by API PlanLimitError text and upload UI toasts.
 */

export const AI_EXTRACTION_LIMIT_TITLE = "AI reading limit reached";

export function plainAiExtractionLimitMessage(params: {
	used?: number;
	limit?: number;
	tier?: string;
	billingStatus?: string | null;
}): string {
	const used = params.used;
	const limit = params.limit;
	const tier = params.tier ? String(params.tier) : "your";
	const pilot = params.billingStatus === "trialing";

	if (
		typeof used === "number" &&
		typeof limit === "number" &&
		Number.isFinite(used) &&
		Number.isFinite(limit)
	) {
		const planBit = pilot ? `on your ${tier} pilot` : `on your ${tier} plan`;
		return `You've used all ${limit} AI document reads for this month ${planBit} (${used} used). You can still fill the form by hand. Upgrade in Settings → Billing, or wait until next month.`;
	}

	return "You've used all AI document reads for this month. You can still fill the form by hand. Upgrade in Settings → Billing, or wait until next month.";
}

export class AiExtractionLimitError extends Error {
	readonly code = "PLAN_LIMIT_EXCEEDED";
	readonly kind = "ai_extractions" as const;

	constructor(message?: string) {
		super(message || plainAiExtractionLimitMessage({}));
		this.name = "AiExtractionLimitError";
	}
}

export function isAiExtractionLimitError(
	error: unknown,
): error is AiExtractionLimitError {
	return (
		error instanceof AiExtractionLimitError ||
		(typeof error === "object" &&
			error !== null &&
			(error as { name?: string }).name === "AiExtractionLimitError")
	);
}

type PlanLimitBody = {
	error?: string;
	code?: string;
	kind?: string;
	limit?: number;
	used?: number;
	tier?: string;
};

/** Throw a typed limit error (or generic Error) when extract-data is not OK. */
export async function throwIfAiExtractionHttpFailed(
	response: Response,
): Promise<void> {
	if (response.ok) return;

	let body: PlanLimitBody | null = null;
	try {
		body = (await response.json()) as PlanLimitBody;
	} catch {
		body = null;
	}

	const isLimit =
		response.status === 402 ||
		body?.code === "PLAN_LIMIT_EXCEEDED" ||
		body?.kind === "ai_extractions";

	if (isLimit) {
		throw new AiExtractionLimitError(
			plainAiExtractionLimitMessage({
				used: body?.used,
				limit: body?.limit,
				tier: body?.tier,
			}),
		);
	}

	throw new Error(
		body?.error ||
			`We couldn't read this file with AI (error ${response.status}). You can still fill the form by hand.`,
	);
}
