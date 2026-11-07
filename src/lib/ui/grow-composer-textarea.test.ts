import { describe, expect, it } from "vitest";
import { growComposerTextarea } from "./grow-composer-textarea";

function mockTextarea(scrollHeight: number) {
	const el = document.createElement("textarea");
	Object.defineProperty(el, "scrollHeight", {
		configurable: true,
		get: () => scrollHeight,
	});
	return el;
}

describe("growComposerTextarea", () => {
	it("grows to content height and hides scroll under max", () => {
		const el = mockTextarea(100);
		growComposerTextarea(el, { minPx: 64, maxPx: 192 });
		expect(el.style.height).toBe("100px");
		expect(el.style.overflowY).toBe("hidden");
	});

	it("clamps to max and shows scroll when content exceeds max", () => {
		const el = mockTextarea(300);
		growComposerTextarea(el, { minPx: 64, maxPx: 192 });
		expect(el.style.height).toBe("192px");
		expect(el.style.overflowY).toBe("auto");
	});

	it("floors at min height", () => {
		const el = mockTextarea(20);
		growComposerTextarea(el, { minPx: 64, maxPx: 192 });
		expect(el.style.height).toBe("64px");
		expect(el.style.overflowY).toBe("hidden");
	});

	it("no-ops on null", () => {
		expect(() =>
			growComposerTextarea(null, { minPx: 64, maxPx: 192 }),
		).not.toThrow();
	});
});
