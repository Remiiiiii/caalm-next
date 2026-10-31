import { describe, expect, it } from "vitest";
import {
	formFromQuizText,
	hasScheduleDateAndTime,
	isIncompleteSchedule,
	looksLikeFieldQuiz,
	parseFieldsArg,
	resolveInputForm,
	optionsForSelectField,
	sanitizeFormFields,
	scheduleEventForm,
} from "@/lib/assistant/inputForm";

describe("sanitizeFormFields", () => {
	it("keeps valid rows and drops junk", () => {
		const fields = sanitizeFormFields([
			{ name: "title", label: "Title", type: "text" },
			{ name: "", label: "Nope" },
			{ name: "title", label: "Duplicate" },
			{ name: "when", label: "Date", type: "not-a-type" },
			null,
		]);
		expect(fields.map((f) => f.name)).toEqual(["title", "when"]);
		expect(fields[1]?.type).toBe("text");
	});

	it("turns object select options into unique strings", () => {
		const fields = sanitizeFormFields([
			{
				name: "type",
				label: "Event Type",
				type: "select",
				options: [
					{ value: "meeting", label: "Meeting" },
					{ value: "review", label: "Review" },
					{ value: "meeting", label: "Meeting again" },
					{},
				],
			},
		]);
		expect(fields[0]?.options).toEqual(["meeting", "review"]);
	});
});

describe("optionsForSelectField", () => {
	it("falls back to meeting types when options are [object Object]", () => {
		expect(
			optionsForSelectField({
				name: "eventType",
				label: "Event Type",
				type: "select",
				options: ["[object Object]", "[object Object]"],
			}),
		).toEqual(["meeting", "review", "audit", "deadline", "contract"]);
	});
});

describe("parseFieldsArg", () => {
	it("accepts a JSON string or an array", () => {
		expect(parseFieldsArg({ fields_json: '[{"name":"a","label":"A"}]' })).toEqual(
			[{ name: "a", label: "A" }],
		);
		expect(parseFieldsArg({ fields: [{ name: "a", label: "A" }] })).toEqual([
			{ name: "a", label: "A" },
		]);
	});
});

describe("looksLikeFieldQuiz", () => {
	it("detects numbered field lists", () => {
		expect(
			looksLikeFieldQuiz(
				"Please provide:\n1. Title\n2. Date\n3. Start time\n4. End time",
			),
		).toBe(true);
		expect(looksLikeFieldQuiz("Your meeting is on Friday at 2pm.")).toBe(false);
	});
});

describe("formFromQuizText", () => {
	it("turns numbered questions into form fields", () => {
		const form = formFromQuizText(
			"1. Title\n2. Date\n3. Start time\n4. Description",
		);
		expect(form.fields.map((f) => f.type)).toEqual([
			"text",
			"date",
			"time",
			"textarea",
		]);
	});
});

describe("scheduleEventForm", () => {
	it("has required title, date, and start time", () => {
		const form = scheduleEventForm({ date: "2026-10-31" });
		expect(form.intent).toBe("schedule_event");
		expect(form.fields.find((f) => f.name === "date")?.defaultValue).toBe(
			"2026-10-31",
		);
		expect(form.fields.filter((f) => f.required).map((f) => f.name)).toEqual(
			["title", "date", "startTime", "type"],
		);
	});
});

describe("isIncompleteSchedule / hasScheduleDateAndTime", () => {
	it("flags missing meeting fields", () => {
		expect(isIncompleteSchedule({ title: "Review" })).toBe(true);
		expect(
			isIncompleteSchedule({
				title: "Review",
				date: "2026-10-31",
				startTime: "14:00",
			}),
		).toBe(false);
	});

	it("requires both a date word and a clock time", () => {
		const now = new Date(2026, 9, 30);
		expect(hasScheduleDateAndTime("schedule a meeting tomorrow at 2pm", now)).toBe(
			true,
		);
		expect(hasScheduleDateAndTime("schedule a meeting tomorrow", now)).toBe(
			false,
		);
	});
});

describe("resolveInputForm", () => {
	it("falls back to the schedule form when fields are empty", () => {
		const resolved = resolveInputForm({
			intent: "schedule_event",
			intro: "Need a few details",
			rawFields: [],
		});
		expect(resolved?.form.intent).toBe("schedule_event");
		expect(resolved?.form.fields.length).toBeGreaterThan(3);
	});

	it("returns null when there is nothing to show", () => {
		expect(resolveInputForm({ intent: "input", rawFields: [] })).toBeNull();
	});
});
