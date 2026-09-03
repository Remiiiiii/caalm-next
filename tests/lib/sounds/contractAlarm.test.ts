import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CONTRACT_ALARM_SILENCED_KEY,
	forcePlayContractAlarm,
	getContractAlarmSnapshot,
	isContractAlarmBlocked,
	isForcedContractAlarm,
	playContractAlarm,
	resetContractAlarmForTests,
	silenceContractAlarm,
	stopContractAlarm,
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

describe("contractAlarm singleton", () => {
	beforeEach(() => {
		vi.stubGlobal("Audio", FakeAudio as unknown as typeof Audio);
		resetContractAlarmForTests();
	});

	afterEach(() => {
		resetContractAlarmForTests();
		vi.unstubAllGlobals();
	});

	it("does not play after suppress", async () => {
		suppressContractAlarm();
		expect(isContractAlarmBlocked()).toBe(true);
		await playContractAlarm();
		expect(isContractAlarmBlocked()).toBe(true);
	});

	it("silence writes localStorage and blocks playback", async () => {
		silenceContractAlarm(60_000);
		expect(localStorage.getItem(CONTRACT_ALARM_SILENCED_KEY)).toBeTruthy();
		expect(isContractAlarmBlocked()).toBe(true);
		await playContractAlarm();
		stopContractAlarm();
	});

	it("forcePlay clears suppress and starts playback", async () => {
		suppressContractAlarm();
		expect(isContractAlarmBlocked()).toBe(true);
		await forcePlayContractAlarm();
		expect(isContractAlarmBlocked()).toBe(false);
		expect(isForcedContractAlarm()).toBe(true);
		expect(getContractAlarmSnapshot().playing).toBe(true);
	});
});
