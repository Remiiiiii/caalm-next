import { describe, expect, it } from "vitest";
import {
	DOCX_PREVIEW_PAGE_STRIDE_PX,
	measureDocxPreviewPageCount,
	resolveDocxPreviewPage,
} from "./docx-preview-pagination";

function mockRoot({
	scrollHeight,
	paddingTop = "24px",
	paddingBottom = "32px",
	scrollTop = 0,
	clientHeight = 600,
}: {
	scrollHeight: number;
	paddingTop?: string;
	paddingBottom?: string;
	scrollTop?: number;
	clientHeight?: number;
}) {
	const el = document.createElement("div");
	el.className = "docx-paginated";
	el.style.paddingTop = paddingTop;
	el.style.paddingBottom = paddingBottom;
	Object.defineProperty(el, "scrollHeight", {
		configurable: true,
		get: () => scrollHeight,
	});
	Object.defineProperty(el, "scrollTop", {
		configurable: true,
		writable: true,
		value: scrollTop,
	});
	Object.defineProperty(el, "clientHeight", {
		configurable: true,
		get: () => clientHeight,
	});
	document.body.appendChild(el);
	return el;
}

describe("docx preview pagination", () => {
	it("ignores container padding when counting pages", () => {
		const twoPages = DOCX_PREVIEW_PAGE_STRIDE_PX * 2 + 56;
		expect(measureDocxPreviewPageCount(mockRoot({ scrollHeight: twoPages }))).toBe(
			2,
		);
	});

	it("does not count a thin trailing strip as another page", () => {
		const justOverTwo = DOCX_PREVIEW_PAGE_STRIDE_PX * 2 + 40 + 56;
		expect(
			measureDocxPreviewPageCount(mockRoot({ scrollHeight: justOverTwo })),
		).toBe(2);
	});

	it("counts a real third page when enough content remains", () => {
		const threePages = DOCX_PREVIEW_PAGE_STRIDE_PX * 3 + 56;
		expect(
			measureDocxPreviewPageCount(mockRoot({ scrollHeight: threePages })),
		).toBe(3);
	});

	it("reports the last page when scrolled to the bottom", () => {
		const scrollHeight = DOCX_PREVIEW_PAGE_STRIDE_PX * 3 + 56;
		const clientHeight = 700;
		const root = mockRoot({
			scrollHeight,
			scrollTop: scrollHeight - clientHeight,
			clientHeight,
		});
		expect(resolveDocxPreviewPage(root, 3)).toBe(3);
	});
});
