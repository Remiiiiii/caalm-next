/**
 * Structured assistant forms. Used instead of asking the user to type
 * numbered answers in the chat box.
 */

import type {
	AssistantFormField,
	AssistantFormFieldType,
	AssistantInputForm,
} from "@/components/assistant/assistantTypes";
import { parseDueDateFromText } from "@/lib/assistant/parseCreateTaskDraft";

const FIELD_TYPES = new Set<AssistantFormFieldType>([
	"text",
	"date",
	"time",
	"select",
	"textarea",
]);

const MEETING_TYPES = [
	"meeting",
	"review",
	"audit",
	"deadline",
	"contract",
];

function asFieldType(raw: unknown): AssistantFormFieldType {
	const t = String(raw ?? "text").toLowerCase();
	return FIELD_TYPES.has(t as AssistantFormFieldType)
		? (t as AssistantFormFieldType)
		: "text";
}

function guessTypeFromLabel(label: string): AssistantFormFieldType {
	const q = label.toLowerCase();
	if (/\b(start|end)?\s*time\b/.test(q)) return "time";
	if (/\bdate\b/.test(q)) return "date";
	if (/\b(type|priority)\b/.test(q)) return "select";
	if (/\b(description|notes|agenda)\b/.test(q)) return "textarea";
	return "text";
}

/** Drop junk Gemini fields; keep only usable form rows. */
export function sanitizeFormFields(raw: unknown): AssistantFormField[] {
	if (!Array.isArray(raw)) return [];
	const seen = new Set<string>();
	const fields: AssistantFormField[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const row = item as Record<string, unknown>;
		const name = String(row.name ?? "")
			.trim()
			.replace(/\s+/g, "_")
			.slice(0, 40);
		const label = String(row.label ?? name).trim();
		if (!name || !label) continue;
		if (seen.has(name)) continue;
		seen.add(name);
		const type = asFieldType(row.type);
		const options = Array.isArray(row.options)
			? row.options.map((o) => String(o)).filter(Boolean)
			: undefined;
		fields.push({
			name,
			label,
			type,
			placeholder:
				typeof row.placeholder === "string" ? row.placeholder : undefined,
			required: row.required !== false,
			...(options?.length ? { options } : {}),
			defaultValue:
				typeof row.defaultValue === "string" ? row.defaultValue : undefined,
		});
	}
	return fields.slice(0, 8);
}

export function parseFieldsArg(args: Record<string, unknown>): unknown {
	const raw = args.fields_json ?? args.fields;
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		try {
			return JSON.parse(raw);
		} catch {
			return [];
		}
	}
	return [];
}

export function scheduleEventForm(
	defaults?: Partial<Record<string, string>>,
): AssistantInputForm {
	const fields: AssistantFormField[] = [
		{
			name: "title",
			label: "Title",
			type: "text",
			placeholder: "What is this meeting for?",
			required: true,
			defaultValue: defaults?.title,
		},
		{
			name: "date",
			label: "Date",
			type: "date",
			required: true,
			defaultValue: defaults?.date,
		},
		{
			name: "startTime",
			label: "Start time",
			type: "time",
			required: true,
			defaultValue: defaults?.startTime,
		},
		{
			name: "endTime",
			label: "End time",
			type: "time",
			required: false,
			defaultValue: defaults?.endTime,
		},
		{
			name: "type",
			label: "Type",
			type: "select",
			required: true,
			options: MEETING_TYPES,
			defaultValue: defaults?.type || "meeting",
		},
		{
			name: "description",
			label: "Agenda",
			type: "textarea",
			placeholder: "Optional",
			required: false,
			defaultValue: defaults?.description,
		},
		{
			name: "participants",
			label: "Participants",
			type: "text",
			placeholder: "Names or emails (optional)",
			required: false,
			defaultValue: defaults?.participants,
		},
	];
	return { intent: "schedule_event", fields };
}

export function scheduleFormFromArgs(
	args: Record<string, unknown>,
): AssistantInputForm {
	const defaults: Record<string, string> = {};
	for (const key of [
		"title",
		"date",
		"startTime",
		"endTime",
		"type",
		"description",
		"participants",
	]) {
		const v = args[key];
		if (typeof v === "string" && v.trim()) defaults[key] = v.trim();
	}
	return scheduleEventForm(defaults);
}

export function isIncompleteSchedule(args: Record<string, unknown>): boolean {
	return (
		!String(args.title ?? "").trim() ||
		!String(args.date ?? "").trim() ||
		!String(args.startTime ?? "").trim()
	);
}

const TIME_RE =
	/\b(?:[01]?\d|2[0-3]):[0-5]\d\b|\b\d{1,2}(?::[0-5]\d)?\s*(?:am|pm)\b/i;

export function hasScheduleDateAndTime(
	message: string,
	now = new Date(),
): boolean {
	return Boolean(parseDueDateFromText(message, now) && TIME_RE.test(message));
}

export function scheduleDefaultsFromMessage(
	message: string,
	now = new Date(),
): Partial<Record<string, string>> {
	const date = parseDueDateFromText(message, now);
	return date ? { date } : {};
}

/** Numbered “please reply with 1. title 2. date…” quiz — replace with a form. */
export function looksLikeFieldQuiz(text: string): boolean {
	const t = text.trim();
	if (!t) return false;
	const numbered = (t.match(/^\s*\d+[.)]\s+\S+/gm) ?? []).length;
	const asks =
		/please (provide|reply|send|list|fill)|need (the )?(following|these)|could you (provide|tell me|reply)/i.test(
			t,
		);
	const fields =
		/\b(title|due date|priority|start time|end time|date|description|participants|agenda)\b/i.test(
			t,
		);
	return numbered >= 3 || (asks && fields && numbered >= 2);
}

export function formFromQuizText(
	text: string,
	fallbackIntent = "input",
): AssistantInputForm {
	const fields: AssistantFormField[] = [];
	const seen = new Set<string>();
	const lines = text.split("\n");
	for (const line of lines) {
		const m = line.match(/^\s*\d+[.)]\s+(.+?)(?:\s*[—–:-].*)?$/);
		if (!m?.[1]) continue;
		const label = m[1].replace(/[*_]/g, "").trim().replace(/\?+$/, "");
		if (!label || label.length > 60) continue;
		const name = label
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "_")
			.replace(/^_|_$/g, "")
			.slice(0, 40);
		if (!name || seen.has(name)) continue;
		seen.add(name);
		const type = guessTypeFromLabel(label);
		fields.push({
			name,
			label: label.charAt(0).toUpperCase() + label.slice(1),
			type,
			required: type !== "textarea",
			...(type === "select" && /type/i.test(label)
				? { options: MEETING_TYPES, defaultValue: "meeting" }
				: {}),
			...(type === "select" && /priority/i.test(label)
				? { options: ["low", "medium", "high"], defaultValue: "medium" }
				: {}),
		});
	}
	if (fields.length >= 2) {
		return { intent: fallbackIntent, fields: fields.slice(0, 8) };
	}
	return scheduleEventForm();
}

export function resolveInputForm(params: {
	intent?: string;
	intro?: string;
	rawFields: unknown;
}): { intro: string; form: AssistantInputForm } | null {
	const intent = String(params.intent ?? "input") || "input";
	let fields = sanitizeFormFields(params.rawFields);
	if (!fields.length && intent === "schedule_event") {
		fields = scheduleEventForm().fields;
	}
	if (!fields.length) return null;
	return {
		intro: (params.intro ?? "Fill this in:").trim() || "Fill this in:",
		form: { intent, fields },
	};
}
