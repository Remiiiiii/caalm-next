export const SCRIPT_SECTIONS = [
	"opening",
	"process",
	"evidence",
	"closing",
] as const;

export type ScriptSection = (typeof SCRIPT_SECTIONS)[number];

export type ScriptItem = {
	id: string;
	questionId: string;
	prompt: string;
	minutes: number;
	section: ScriptSection;
};

export type ScriptCanvas = Record<ScriptSection, ScriptItem[]>;

export function emptyCanvas(): ScriptCanvas {
	return { opening: [], process: [], evidence: [], closing: [] };
}

export function parseScriptItems(itemsJson: string | undefined): ScriptCanvas {
	const canvas = emptyCanvas();
	if (!itemsJson) return canvas;
	try {
		const parsed = JSON.parse(itemsJson) as unknown;
		if (!parsed || typeof parsed !== "object") return canvas;
		if (Array.isArray(parsed)) {
			// Legacy flat list → process walkthroughs
			for (const [index, raw] of parsed.entries()) {
				const row = raw as Partial<ScriptItem>;
				if (!row.prompt && !row.questionId) continue;
				canvas.process.push({
					id: row.id || `legacy-${index}`,
					questionId: String(row.questionId ?? ""),
					prompt: String(row.prompt ?? ""),
					minutes: Number(row.minutes ?? 5),
					section: "process",
				});
			}
			return canvas;
		}
		const obj = parsed as Partial<Record<ScriptSection, ScriptItem[]>>;
		for (const section of SCRIPT_SECTIONS) {
			const list = obj[section];
			if (!Array.isArray(list)) continue;
			canvas[section] = list.map((row, index) => ({
				id: row.id || `${section}-${index}`,
				questionId: String(row.questionId ?? ""),
				prompt: String(row.prompt ?? ""),
				minutes: Number(row.minutes ?? 5),
				section,
			}));
		}
		return canvas;
	} catch {
		return canvas;
	}
}

export function serializeScriptItems(canvas: ScriptCanvas): string {
	return JSON.stringify(canvas);
}

export function sectionMinutes(items: ScriptItem[]): number {
	return items.reduce((sum, item) => sum + (item.minutes || 0), 0);
}

export const DEFAULT_SECTION_BUDGET_MINUTES: Record<ScriptSection, number> = {
	opening: 5,
	process: 25,
	evidence: 10,
	closing: 5,
};

export type ScriptDocument = {
	sections: ScriptCanvas;
	budgets: Record<ScriptSection, number>;
};

export function emptyScriptDocument(): ScriptDocument {
	return {
		sections: emptyCanvas(),
		budgets: { ...DEFAULT_SECTION_BUDGET_MINUTES },
	};
}

/** Reads the `{sections,budgets}` shape; falls back to the legacy bare-canvas/flat-array shape with default budgets. */
export function parseScriptDocument(
	itemsJson: string | undefined,
): ScriptDocument {
	if (!itemsJson) return emptyScriptDocument();
	try {
		const parsed = JSON.parse(itemsJson) as unknown;
		if (
			parsed &&
			typeof parsed === "object" &&
			!Array.isArray(parsed) &&
			"sections" in parsed &&
			"budgets" in parsed
		) {
			const obj = parsed as { sections: unknown; budgets: unknown };
			const sections = parseScriptItems(JSON.stringify(obj.sections));
			const budgetsRaw = (obj.budgets ?? {}) as Partial<
				Record<ScriptSection, number>
			>;
			const budgets = { ...DEFAULT_SECTION_BUDGET_MINUTES };
			for (const section of SCRIPT_SECTIONS) {
				if (typeof budgetsRaw[section] === "number") {
					budgets[section] = budgetsRaw[section] as number;
				}
			}
			return { sections, budgets };
		}
	} catch {
		return emptyScriptDocument();
	}
	return {
		sections: parseScriptItems(itemsJson),
		budgets: { ...DEFAULT_SECTION_BUDGET_MINUTES },
	};
}

export function serializeScriptDocument(doc: ScriptDocument): string {
	return JSON.stringify(doc);
}

export function placeQuestionInSection(
	canvas: ScriptCanvas,
	section: ScriptSection,
	question: { $id: string; prompt: string },
	minutes = 5,
): ScriptCanvas {
	const next = structuredClone(canvas);
	next[section].push({
		id: `${section}-${question.$id}-${Date.now()}`,
		questionId: question.$id,
		prompt: question.prompt,
		minutes,
		section,
	});
	return next;
}

/**
 * Pick a script section from the question text — evidence walkthroughs should
 * not land in Opening/Closing just because they are first/last in the bank.
 */
export function suggestScriptSectionForQuestion(
	prompt: string,
	index: number,
	total: number,
): ScriptSection {
	const text = prompt.trim().toLowerCase();
	const asksForEvidence =
		/\b(evidence|document|record|on file|attach|contract|policy|agreement|log)\b/.test(
			text,
		) || /what evidence do you have/.test(text);
	if (asksForEvidence) return "evidence";

	const looksLikeOpening =
		/\b(welcome|introduce|yourself|kick.?off|start with|opening)\b/.test(text);
	const looksLikeClosing =
		/\b(wrap.?up|closing|anything else|final|thank you|before we end)\b/.test(
			text,
		);
	if (looksLikeOpening) return "opening";
	if (looksLikeClosing) return "closing";

	// Soft bookends only when the prompt is not evidence-heavy and the bank is large enough.
	if (total >= 4 && index === 0) return "opening";
	if (total >= 4 && index === total - 1) return "closing";
	return "process";
}
