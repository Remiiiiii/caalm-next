import { beforeEach, describe, expect, it } from "vitest";
import {
	clearTicketFormDraft,
	DRAFT_MAX_AGE_MS,
	loadTicketFormDraft,
	saveTicketFormDraft,
	ticketFormDraftHasContent,
} from "./ticket-form-draft";

const store = new Map<string, string>();

beforeEach(() => {
	store.clear();
	Object.defineProperty(globalThis, "sessionStorage", {
		configurable: true,
		value: {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => void store.set(k, v),
			removeItem: (k: string) => void store.delete(k),
		},
	});
});

describe("ticket form draft", () => {
	it("round-trips a saved draft with engineering fields", () => {
		saveTicketFormDraft({ title: "Broken", reproSteps: ["a", "b"] });
		const draft = loadTicketFormDraft();
		expect(draft?.title).toBe("Broken");
		expect(draft?.reproSteps).toEqual(["a", "b"]);
	});

	it("drops drafts older than the max age", () => {
		saveTicketFormDraft({ title: "Old" });
		const key = [...store.keys()][0];
		const stale = JSON.parse(store.get(key) as string);
		stale.savedAt = Date.now() - DRAFT_MAX_AGE_MS - 1000;
		store.set(key, JSON.stringify(stale));
		expect(loadTicketFormDraft()).toBeNull();
		expect(store.size).toBe(0);
	});

	it("clears the draft", () => {
		saveTicketFormDraft({ title: "x" });
		clearTicketFormDraft();
		expect(loadTicketFormDraft()).toBeNull();
	});

	it("ignores defaults when deciding if there is content", () => {
		expect(
			ticketFormDraftHasContent({
				lane: "help",
				helpPriority: "medium",
				os: "Windows",
				reproSteps: ["", ""],
			}),
		).toBe(false);
		expect(ticketFormDraftHasContent({ reproSteps: ["", "click"] })).toBe(true);
	});
});
