/** Parses a single `bytes=start-end` range; null when absent or unusable. */
export function parseByteRange(
	header: string | null,
	size: number,
): { start: number; end: number } | null {
	const match = header?.match(/^bytes=(\d*)-(\d*)$/);
	if (!match || size <= 0) return null;
	const [, rawStart, rawEnd] = match;
	if (!rawStart && !rawEnd) return null;
	let start: number;
	let end: number;
	if (!rawStart) {
		start = Math.max(0, size - Number(rawEnd));
		end = size - 1;
	} else {
		start = Number(rawStart);
		end = rawEnd ? Math.min(Number(rawEnd), size - 1) : size - 1;
	}
	if (start > end || start >= size) return null;
	return { start, end };
}
