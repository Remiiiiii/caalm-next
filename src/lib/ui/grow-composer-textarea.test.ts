import { describe, expect, it } from "vitest";
import { growComposerTextarea } from "@/lib/ui/grow-composer-textarea";

describe("growComposerTextarea", () => {
	it("caps height at maxPx even when scrollHeight is inflated", () => {
		const el = document.createElement("textarea");
		Object.defineProperty(el, "scrollHeight", {
			configurable: true,
			get: () => 800,
		});
		growComposerTextarea(el, { minPx: 44, maxPx: 192 });
		expect(el.style.height).toBe("192px");
		expect(el.style.maxHeight).toBe("192px");
	});

	it("uses minPx when content is short", () => {
		const el = document.createElement("textarea");
		Object.defineProperty(el, "scrollHeight", {
			configurable: true,
			get: () => 40,
		});
		growComposerTextarea(el, { minPx: 44, maxPx: 192 });
		expect(el.style.height).toBe("44px");
	});
});
