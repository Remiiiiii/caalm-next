import { describe, expect, it } from "vitest";
import {
	AUDITOR_PERSONAS,
	INTERVIEWER_PROFILES,
} from "@/lib/audit-lab/roleplay";
import {
	buildNuanceSystemPrompt,
	NUANCE_PERSONA_BY_AUDITOR,
} from "@/lib/audit-lab/voice/nuance";
import type { VoiceRubricItem } from "@/lib/audit-lab/voice/rubric";

const rubric: VoiceRubricItem[] = [
	{
		questionId: "q1",
		prompt: "Walk me through your access review process.",
		source: "control",
		difficulty: "medium",
		requiresEvidence: true,
	},
	{
		questionId: "q2",
		prompt: "Who owns the change management policy?",
		source: "control",
		difficulty: "easy",
		requiresEvidence: false,
	},
];

describe("Nuance backend persona scoping", () => {
	it("is set only on Simone (friendly_collegiate) and Valentina (forensic)", () => {
		const nuanceBacked = AUDITOR_PERSONAS.filter(
			(persona) => INTERVIEWER_PROFILES[persona].backend === "nuance",
		);
		expect(nuanceBacked.sort()).toEqual(["forensic", "friendly_collegiate"]);
	});

	it("maps Simone to mira and Valentina to sam", () => {
		expect(NUANCE_PERSONA_BY_AUDITOR.friendly_collegiate).toBe("mira");
		expect(NUANCE_PERSONA_BY_AUDITOR.forensic).toBe("sam");
	});
});

describe("buildNuanceSystemPrompt", () => {
	it("tells the persona to honor evidence and wrap-up thinking notes", () => {
		const prompt = buildNuanceSystemPrompt({
			persona: "friendly_collegiate",
			sessionTitle: "Review",
			rubric: [
				{
					questionId: "q1",
					prompt: "Show evidence",
					source: "gap",
					difficulty: "medium",
					requiresEvidence: true,
				},
			],
		});
		expect(prompt).toMatch(/thinking note/i);
		expect(prompt).toMatch(/end_call/);
		expect(prompt).toMatch(/questionId/);
	});

	it("names the persona and includes every rubric question", () => {
		const prompt = buildNuanceSystemPrompt({
			persona: "friendly_collegiate",
			sessionTitle: "Q3 SOC 2 review",
			rubric,
		});
		expect(prompt).toContain("Simone");
		expect(prompt).toContain("Q3 SOC 2 review");
		expect(prompt).toContain("q1");
		expect(prompt).toContain("q2");
	});

	it("gives Simone and Valentina different behavioral instructions", () => {
		const simone = buildNuanceSystemPrompt({
			persona: "friendly_collegiate",
			sessionTitle: "Review",
			rubric,
		});
		const valentina = buildNuanceSystemPrompt({
			persona: "forensic",
			sessionTitle: "Review",
			rubric,
		});
		expect(simone).not.toEqual(valentina);
		expect(simone).toMatch(/relaxed|encouraging|nudge/i);
		expect(valentina).toMatch(/skeptical|gaps|exact dates/i);
	});

	it("never claims to be human or names the underlying model, per Nuance's content policy", () => {
		const prompt = buildNuanceSystemPrompt({
			persona: "forensic",
			sessionTitle: "Review",
			rubric,
		});
		expect(prompt).toMatch(/never claim to be human/i);
		expect(prompt).toMatch(/never name the ai model/i);
	});

	it("mentions skip_current_question and evidence review rules", () => {
		const prompt = buildNuanceSystemPrompt({
			persona: "friendly_collegiate",
			sessionTitle: "Review",
			rubric,
		});
		expect(prompt).toMatch(/skip_current_question/);
		expect(prompt).toMatch(/needs evidence file/);
		expect(prompt).toMatch(/evidenceAccepted/);
	});

	it("truncates an oversized rubric instead of exceeding Nuance's prompt-length cap", () => {
		const hugeRubric: VoiceRubricItem[] = Array.from(
			{ length: 50 },
			(_, i) => ({
				questionId: `q${i}`,
				prompt: "x".repeat(200),
				source: "control",
				difficulty: "medium",
				requiresEvidence: false,
			}),
		);
		const prompt = buildNuanceSystemPrompt({
			persona: "friendly_collegiate",
			sessionTitle: "Review",
			rubric: hugeRubric,
		});
		expect(prompt.length).toBeLessThanOrEqual(4000);
	});
});
