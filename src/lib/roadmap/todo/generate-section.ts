/**
 * Turns a free-text prompt into a new Todo Roadmap section (one task, same
 * shape as the hand-written catalog entries) using a one-shot Claude call —
 * mirrors the pattern in src/lib/audit-lab/voice/grade.ts.
 */

import Anthropic from "@anthropic-ai/sdk";
import { claudeModel } from "@/lib/assistant/claudeChat";
import type { RoadmapCatalogSection } from "../types";

function getClient(): Anthropic {
	const apiKey = process.env.CLAUDE_API_KEY;
	if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured");
	return new Anthropic({ apiKey });
}

export class TodoSectionGenerationError extends Error {}

/**
 * Generates one new section (title + a single task with a Who/What/Where/
 * Why/When/How description and acceptance criteria) from a free-text prompt.
 * `sectionNumber` and `sourceRef` are assigned by the caller, not the model.
 */
export async function generateTodoSectionFromPrompt(
	prompt: string,
): Promise<Omit<RoadmapCatalogSection, "sectionNumber" | "sourceRef">> {
	const client = getClient();
	const systemInstruction = `You turn a developer's backlog idea into one roadmap section for an internal IT dashboard. Write a short, concrete title, and one task description formatted as "Who: ... What: ... Where: ... Why: ... When: ... How: ...", each sentence plain and specific — no filler. Also write 2-4 concrete, checkable acceptance criteria. Respond with ONLY JSON of this exact shape, no prose outside the JSON:
{
  "title": "...",
  "taskTitle": "...",
  "description": "Who: ... What: ... Where: ... Why: ... When: ... How: ...",
  "acceptanceCriteria": ["...", "..."]
}`;

	const response = await client.messages.create({
		model: claudeModel(),
		max_tokens: 1200,
		system: systemInstruction,
		messages: [{ role: "user", content: prompt }],
	});
	const text = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === "text")
		.map((block) => block.text)
		.join("");
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end === -1) {
		throw new TodoSectionGenerationError(
			"The model did not return a usable section — try rephrasing the prompt.",
		);
	}

	let parsed: {
		title?: unknown;
		taskTitle?: unknown;
		description?: unknown;
		acceptanceCriteria?: unknown;
	};
	try {
		parsed = JSON.parse(text.slice(start, end + 1));
	} catch {
		throw new TodoSectionGenerationError(
			"The model returned malformed JSON — try rephrasing the prompt.",
		);
	}

	if (
		typeof parsed.title !== "string" ||
		!parsed.title.trim() ||
		typeof parsed.taskTitle !== "string" ||
		!parsed.taskTitle.trim() ||
		typeof parsed.description !== "string" ||
		!parsed.description.trim() ||
		!Array.isArray(parsed.acceptanceCriteria) ||
		parsed.acceptanceCriteria.length === 0 ||
		!parsed.acceptanceCriteria.every((item) => typeof item === "string")
	) {
		throw new TodoSectionGenerationError(
			"The model's response was missing a required field — try rephrasing the prompt.",
		);
	}

	return {
		title: parsed.title.trim(),
		tasks: [
			{
				taskCode: "", // filled in by the caller once sectionNumber is known
				title: parsed.taskTitle.trim(),
				description: parsed.description.trim(),
				acceptanceCriteria: parsed.acceptanceCriteria as string[],
				testSuiteRef: "", // filled in by the caller once sectionNumber is known
			},
		],
	};
}
