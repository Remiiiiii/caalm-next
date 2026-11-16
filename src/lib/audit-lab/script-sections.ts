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