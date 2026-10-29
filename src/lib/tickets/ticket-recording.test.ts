import { describe, expect, it, vi } from "vitest";
import {
	displayMediaConstraints,
	formatRecordingDuration,
	pickMime,
	type TicketRecording,
	ticketRecordingToFile,
} from "./ticket-recording";

describe("ticket-recording", () => {
	it("pickMime prefers first supported type", () => {
		const supported = vi
			.fn()
			.mockImplementation((t: string) => t.startsWith("video/webm"));
		vi.stubGlobal("MediaRecorder", { isTypeSupported: supported });
		expect(pickMime()).toBe("video/webm;codecs=vp9,opus");
		vi.unstubAllGlobals();
	});

	it("ticketRecordingToFile uses extension from mime", () => {
		const rec: TicketRecording = {
			blob: new Blob(["x"], { type: "video/webm" }),
			url: "blob:x",
			mime: "video/webm",
			bytes: 1,
			durationMs: 1000,
			hasAudio: false,
		};
		const file = ticketRecordingToFile(rec);
		expect(file.name).toBe("screen-recording.webm");
		expect(file.type).toBe("video/webm");
	});

	it("formatRecordingDuration caps at 60s display", () => {
		expect(formatRecordingDuration(5_000)).toBe("0:05");
		expect(formatRecordingDuration(90_000)).toBe("0:60");
	});

	it("displayMediaConstraints prefers current tab when on problem page", () => {
		const onPage = displayMediaConstraints(
			true,
		) as DisplayMediaStreamOptions & {
			selfBrowserSurface?: string;
			preferCurrentTab?: boolean;
		};
		expect(onPage.selfBrowserSurface).toBe("include");
		expect(onPage.preferCurrentTab).toBe(true);

		const away = displayMediaConstraints(false) as DisplayMediaStreamOptions & {
			selfBrowserSurface?: string;
			preferCurrentTab?: boolean;
		};
		expect(away.selfBrowserSurface).toBe("exclude");
		expect(away.preferCurrentTab).toBe(false);
	});
});
