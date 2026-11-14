import { describe, expect, it, vi } from "vitest";
import { parsePdfText, toStandalonePdfBytes } from "@/lib/files/parse-pdf";

const pdfParseMock = vi.hoisted(() =>
	vi.fn(async (_data: Uint8Array) => ({ text: "ok", numpages: 1 })),
);
vi.mock("pdf-parse-debugging-disabled", () => ({ default: pdfParseMock }));

/** A Buffer view in the middle of a bigger ArrayBuffer, like Node 24's shared Buffer pool. */
function pooledLikeBuffer(bytes: number[]): Buffer {
	const offset = 9392;
	const backing = new Uint8Array(bytes.length + 64 * 1024);
	backing.set(bytes, offset);
	return Buffer.from(backing.buffer, offset, bytes.length);
}

describe("parsePdfText", () => {
	it("copies to an exactly-sized buffer with offset 0", () => {
		const view = pooledLikeBuffer([1, 2, 3]);
		expect(view.byteOffset).toBeGreaterThan(0);
		const copy = toStandalonePdfBytes(view);
		expect(copy.byteOffset).toBe(0);
		expect(copy.buffer.byteLength).toBe(3);
		expect(Array.from(copy)).toEqual([1, 2, 3]);
	});

	it("never hands pdf-parse a pooled Buffer view", async () => {
		await parsePdfText(pooledLikeBuffer([37, 80, 68, 70]));
		const passed = pdfParseMock.mock.calls[0]?.[0] as Uint8Array;
		expect(passed.byteOffset).toBe(0);
		expect(passed.buffer.byteLength).toBe(4);
		expect(Array.from(passed)).toEqual([37, 80, 68, 70]);
	});
});
