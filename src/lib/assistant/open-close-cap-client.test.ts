import { afterEach, describe, expect, it, vi } from "vitest";
import { getCapVerificationDraft } from "@/lib/assistant/cap-verification-draft";
import {
	dispatchOpenCloseCap,
	OPEN_CLOSE_CAP_EVENT,
} from "@/lib/assistant/open-close-cap-client";
import { buildOpenCloseCapSuggestion } from "@/lib/assistant/suggestions";

describe("dispatchOpenCloseCap", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("stages draft and dispatches open event", () => {
		const handler = vi.fn();
		window.addEventListener(OPEN_CLOSE_CAP_EVENT, handler);
		dispatchOpenCloseCap({
			capId: "cap-1",
			findingId: "finding-1",
			documentId: "doc-1",
			verificationNote: "Verified in CAALM.",
		});
		expect(getCapVerificationDraft("cap-1")).toBe("Verified in CAALM.");
		expect(handler).toHaveBeenCalled();
		window.removeEventListener(OPEN_CLOSE_CAP_EVENT, handler);
	});
});

describe("buildOpenCloseCapSuggestion", () => {
	it("uses note-specific label when text is present", () => {
		const chip = buildOpenCloseCapSuggestion({
			capId: "c",
			findingId: "f",
			documentId: "d",
			verificationNote: "Done.",
		});
		expect(chip.action.type).toBe("open_close_cap");
		expect(chip.label).toContain("with this note");
	});
});
