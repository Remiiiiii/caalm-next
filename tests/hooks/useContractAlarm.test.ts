import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useContractAlarm } from "@/hooks/useContractAlarm";
import {
	forcePlayContractAlarm,
	resetContractAlarmForTests,
	suppressContractAlarm,
} from "@/lib/sounds/contractAlarm";

class FakeAudio {
	loop = false;
	volume = 1;
	paused = true;
	currentTime = 0;
	play() {
		this.paused = false;
		return Promise.resolve();
	}
	pause() {
		this.paused = true;
	}
	addEventListener() {}
	removeEventListener() {}
}

function contractExpiringSoon() {
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	return {
		$id: "c1",
		contractName: "Soon",
		contractExpiryDate: `${yyyy}-${mm}-${dd}`,
	};
}

describe("useContractAlarm", () => {
	beforeEach(() => {
		vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
		resetContractAlarmForTests();
	});

	afterEach(() => {
		resetContractAlarmForTests();
		vi.unstubAllGlobals();
	});

	it("does not play when the overlay has suppressed the alarm", async () => {
		suppressContractAlarm();
		const { result } = renderHook(() =>
			useContractAlarm({
				contracts: [contractExpiringSoon()],
				enabled: true,
			}),
		);

		await waitFor(() => {
			expect(result.current.isPlaying).toBe(false);
		});
		expect(result.current.isSilenced).toBe(true);
	});

	it("stops playback when enabled becomes false", async () => {
		const { result, rerender } = renderHook(
			({ enabled }: { enabled: boolean }) =>
				useContractAlarm({
					contracts: [contractExpiringSoon()],
					enabled,
				}),
			{ initialProps: { enabled: true } },
		);

		await waitFor(() => {
			expect(result.current.isPlaying).toBe(true);
		});

		rerender({ enabled: false });

		await waitFor(() => {
			expect(result.current.isPlaying).toBe(false);
		});
	});

	it("keeps a forced preview playing when nothing expires within 24 hours", async () => {
		const { result } = renderHook(() =>
			useContractAlarm({
				contracts: [
					{
						$id: "c2",
						contractName: "Later",
						contractExpiryDate: "2027-01-01",
					},
				],
				enabled: true,
			}),
		);

		await waitFor(() => {
			expect(result.current.isPlaying).toBe(false);
		});

		await act(async () => {
			await forcePlayContractAlarm();
		});

		await waitFor(() => {
			expect(result.current.isPlaying).toBe(true);
		});
	});
});
