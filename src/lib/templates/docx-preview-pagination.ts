/** Matches `.docx-paginated` repeat period in `docx-preview.css` (1048px page + 8px gap). */
export const DOCX_PREVIEW_PAGE_STRIDE_PX = 1056;

/** Trailing content shorter than this fraction of a page is not counted as its own page. */
const PARTIAL_PAGE_THRESHOLD = 0.12;

export function measureDocxPreviewContentHeight(root: {
	scrollHeight: number;
}): number {
	if (typeof window === "undefined") return root.scrollHeight;
	const style = getComputedStyle(root as HTMLElement);
	const padTop = Number.parseFloat(style.paddingTop) || 0;
	const padBottom = Number.parseFloat(style.paddingBottom) || 0;
	return Math.max(0, root.scrollHeight - padTop - padBottom);
}

export function measureDocxPreviewPageCount(root: {
	scrollHeight: number;
}): number {
	const contentHeight = measureDocxPreviewContentHeight(root);
	if (contentHeight <= 0) return 1;

	const pagesExact = contentHeight / DOCX_PREVIEW_PAGE_STRIDE_PX;
	const fullPages = Math.floor(pagesExact);
	const remainder = pagesExact - fullPages;

	if (fullPages === 0) return 1;
	if (remainder <= PARTIAL_PAGE_THRESHOLD) return fullPages;
	return fullPages + 1;
}

export function resolveDocxPreviewPage(
	root: HTMLElement,
	pageCount: number,
): number {
	if (pageCount <= 1) return 1;

	const style = getComputedStyle(root);
	const padTop = Number.parseFloat(style.paddingTop) || 0;
	const { scrollTop, scrollHeight, clientHeight } = root;

	if (scrollTop + clientHeight >= scrollHeight - 4) {
		return pageCount;
	}

	const page =
		Math.floor((scrollTop + padTop) / DOCX_PREVIEW_PAGE_STRIDE_PX) + 1;
	return Math.min(pageCount, Math.max(1, page));
}
