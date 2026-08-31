export const DOCX_PREVIEW_CSS: string;

export type ImageExtent = { width: number; height: number };

export function extractImageExtents(docx: Buffer): ImageExtent[];
export function isLetterheadOrgPart(part: string): boolean;
export function stripEmptyPreviewListItems(html: string): string;
export function layoutDocxHtml(html: string): string;
export function docxBufferToHtml(
	docx: Buffer,
	opts?: { imageScale?: number },
): Promise<string>;
