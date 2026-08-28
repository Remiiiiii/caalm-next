import type {
	AssembledSection,
	AssemblyResult,
	ClauseSlot,
	ClauseSnapshot,
	MergeFieldKey,
	SlotCondition,
	WizardIntake,
	WizardPayload,
	WizardSection,
} from "@/types/contract-templates";
import { MERGE_FIELD_KEYS } from "@/types/contract-templates";

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function emptyWizardPayload(): WizardPayload {
	return {
		startPath: "scratch",
		templateId: null,
		intake: {
			contractName: "",
			contractType: "vendor",
			department: "",
			counterparty: "",
			amount: "",
			currency: "USD",
			startDate: "",
			expiryDate: "",
			governingLaw: "",
			description: "",
		},
		sections: [],
	};
}

export function slotsToSections(
	slots: ClauseSlot[],
	source: WizardSection["source"],
	fromTemplateId?: string,
): WizardSection[] {
	return slots.map((slot) => ({
		familyId: slot.familyId,
		source,
		fromTemplateId,
		required: slot.required,
		enabled: true,
		condition: slot.condition,
	}));
}

/**
 * Append a recipe without replacing what the user already assembled.
 * Duplicate family IDs are skipped so injecting the same template twice is safe.
 */
export function injectTemplateSlots(
	existing: WizardSection[],
	slots: ClauseSlot[],
	fromTemplateId: string,
): WizardSection[] {
	const seen = new Set(existing.map((section) => section.familyId));
	const next = [...existing];
	for (const slot of slots) {
		if (!slot.familyId || seen.has(slot.familyId)) continue;
		seen.add(slot.familyId);
		next.push({
			familyId: slot.familyId,
			source: existing.length === 0 ? "template" : "injected",
			fromTemplateId,
			required: slot.required,
			enabled: true,
			condition: slot.condition,
		});
	}
	return next;
}

export function injectClauseFamily(
	existing: WizardSection[],
	familyId: string,
	required = false,
): WizardSection[] {
	if (!familyId || existing.some((section) => section.familyId === familyId)) {
		return existing;
	}
	return [
		...existing,
		{
			familyId,
			source: "injected",
			required,
			enabled: true,
		},
	];
}

export function moveSection(
	sections: WizardSection[],
	index: number,
	direction: -1 | 1,
): WizardSection[] {
	const target = index + direction;
	if (
		index < 0 ||
		target < 0 ||
		index >= sections.length ||
		target >= sections.length
	) {
		return sections;
	}
	const next = [...sections];
	const [row] = next.splice(index, 1);
	next.splice(target, 0, row);
	return next;
}

export function buildMergeValues(
	intake: WizardIntake,
	today = new Date(),
): Record<MergeFieldKey, string> {
	const iso = today.toISOString().slice(0, 10);
	return {
		contractName: intake.contractName.trim(),
		counterparty: intake.counterparty.trim(),
		amount: intake.amount.trim(),
		currency: (intake.currency || "USD").trim(),
		startDate: intake.startDate.trim(),
		expiryDate: intake.expiryDate.trim(),
		department: intake.department.trim(),
		governingLaw: intake.governingLaw.trim(),
		today: iso,
	};
}

export function applyMergeFields(
	text: string,
	values: Record<string, string>,
): string {
	return text.replace(PLACEHOLDER, (_, key: string) => {
		const value = values[key];
		return value && value.length > 0 ? value : `{{${key}}}`;
	});
}

function compareNumbers(
	left: number,
	right: number,
	op: SlotCondition["op"],
): boolean {
	switch (op) {
		case "gt":
			return left > right;
		case "gte":
			return left >= right;
		case "lt":
			return left < right;
		case "lte":
			return left <= right;
		case "eq":
			return left === right;
		case "neq":
			return left !== right;
		default:
			return false;
	}
}

export function evaluateCondition(
	condition: SlotCondition | undefined,
	values: Record<MergeFieldKey, string>,
): { ok: boolean; reason?: string } {
	if (!condition) return { ok: true };

	if (condition.field === "amountNumber" || condition.field === "amount") {
		const left = Number(String(values.amount).replace(/[$,]/g, ""));
		const right = Number(String(condition.value).replace(/[$,]/g, ""));
		if (!Number.isFinite(left) || !Number.isFinite(right)) {
			return {
				ok: false,
				reason: "Amount is missing, so this clause stays out",
			};
		}
		const ok = compareNumbers(left, right, condition.op);
		return ok
			? { ok: true }
			: {
					ok: false,
					reason: `Skipped: amount ${left} is not ${condition.op} ${right}`,
				};
	}

	const left = values[condition.field] ?? "";
	const right = condition.value;
	if (condition.op === "contains") {
		const ok = left.toLowerCase().includes(right.toLowerCase());
		return ok
			? { ok: true }
			: {
					ok: false,
					reason: `Skipped: ${condition.field} does not contain “${right}”`,
				};
	}
	if (condition.op === "eq") {
		return left === right
			? { ok: true }
			: { ok: false, reason: `Skipped: ${condition.field} is not “${right}”` };
	}
	if (condition.op === "neq") {
		return left !== right
			? { ok: true }
			: { ok: false, reason: `Skipped: ${condition.field} is “${right}”` };
	}
	return { ok: true };
}

/**
 * Hard product rule: a template run always creates a new contract.
 * Passing an existing id is rejected instead of patching pending/active rows.
 */
export function assertCreatesNewContract(payload: WizardPayload): void {
	const existing = payload.existingContractId?.trim();
	if (existing) {
		throw new Error(
			"Templates create a new contract. They cannot patch a pending or active one.",
		);
	}
}

export function validateIntake(intake: WizardIntake): string[] {
	const errors: string[] = [];
	if (!intake.contractName.trim()) errors.push("Name the contract");
	if (!intake.contractType.trim()) errors.push("Pick a contract type");
	if (!intake.counterparty.trim()) errors.push("Name the other party");
	if (!intake.expiryDate.trim()) errors.push("Set an expiry date");
	return errors;
}

export function assembleContract(input: {
	payload: WizardPayload;
	clausesByFamily: Map<string, ClauseSnapshot>;
	today?: Date;
}): AssemblyResult {
	assertCreatesNewContract(input.payload);
	const mergeValues = buildMergeValues(input.payload.intake, input.today);
	const sections: AssembledSection[] = [];

	for (const row of input.payload.sections) {
		const clause = input.clausesByFamily.get(row.familyId);
		const condition = evaluateCondition(row.condition, mergeValues);
		const skipped =
			!row.enabled || !condition.ok || !clause || clause.status !== "active";

		let skipReason: string | undefined;
		if (!row.enabled) skipReason = "Turned off in the wizard";
		else if (!condition.ok) skipReason = condition.reason;
		else if (!clause)
			skipReason = "No published clause in the library for this slot";
		else if (clause.status !== "active") {
			skipReason = "Only published (active) clauses are snapshotted";
		}

		const body =
			clause && !skipped ? applyMergeFields(clause.body, mergeValues) : "";

		sections.push({
			familyId: row.familyId,
			clauseId: clause?.$id ?? null,
			version: clause?.version ?? null,
			title: clause?.title || "Missing clause",
			category: clause?.category || "other",
			body,
			source: row.source,
			fromTemplateId: row.fromTemplateId,
			enabled: row.enabled,
			skipped: Boolean(skipped),
			skipReason,
		});
	}

	const included = sections.filter((section) => !section.skipped);
	const lines: string[] = [];
	lines.push(`# ${mergeValues.contractName || "Untitled contract"}`);
	lines.push("");
	lines.push(`- Other party: ${mergeValues.counterparty || "—"}`);
	lines.push(`- Department: ${mergeValues.department || "—"}`);
	lines.push(`- Value: ${mergeValues.currency} ${mergeValues.amount || "—"}`);
	lines.push(`- Start: ${mergeValues.startDate || "—"}`);
	lines.push(`- Expiry: ${mergeValues.expiryDate || "—"}`);
	if (mergeValues.governingLaw) {
		lines.push(`- Governing law: ${mergeValues.governingLaw}`);
	}
	lines.push(`- Assembled: ${mergeValues.today}`);
	if (input.payload.intake.description.trim()) {
		lines.push("");
		lines.push(input.payload.intake.description.trim());
	}
	lines.push("");

	included.forEach((section, index) => {
		lines.push(`## ${index + 1}. ${section.title}`);
		lines.push("");
		lines.push(
			`_Source: ${section.source === "injected" ? "injected" : "template"} · v${section.version}_`,
		);
		lines.push("");
		lines.push(section.body.trim());
		lines.push("");
	});

	lines.push("---");
	lines.push("");
	lines.push("### Clause lineage");
	lines.push("");
	for (const section of included) {
		lines.push(
			`- ${section.title} (${section.familyId} v${section.version}, ${section.source})`,
		);
	}

	const lineage = included
		.filter((section) => section.clauseId && section.version != null)
		.map((section) => ({
			familyId: section.familyId,
			clauseId: section.clauseId as string,
			version: section.version as number,
			title: section.title,
			source: section.source,
		}));

	return {
		markdown: `${lines.join("\n").trim()}\n`,
		sections,
		mergeValues,
		lineage,
	};
}

export function isMergeFieldKey(value: string): value is MergeFieldKey {
	return (MERGE_FIELD_KEYS as readonly string[]).includes(value);
}
