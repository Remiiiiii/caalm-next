import { describe, expect, it } from "vitest";
import {
	buildExpirySmsMessage,
	DEFAULT_ALERT_CHANNELS,
	parseAlertChannels,
	parseAlertRecipientIds,
} from "@/lib/renewals/expiryAlertChannels";

describe("parseAlertChannels", () => {
	it("defaults when empty", () => {
		expect([...parseAlertChannels(null)].sort()).toEqual(
			[...DEFAULT_ALERT_CHANNELS].sort(),
		);
		expect([...parseAlertChannels([])].sort()).toEqual(
			[...DEFAULT_ALERT_CHANNELS].sort(),
		);
	});

	it("parses array and comma strings", () => {
		expect(parseAlertChannels(["email", "sms"]).has("sms")).toBe(true);
		expect(parseAlertChannels("email,sms,in_app").has("in_app")).toBe(true);
		expect(parseAlertChannels(["email,sms"]).has("email")).toBe(true);
	});

	it("ignores unknown tokens", () => {
		const channels = parseAlertChannels(["email", "carrier-pigeon"]);
		expect(channels.has("email")).toBe(true);
		expect(channels.size).toBe(1);
	});
});

describe("parseAlertRecipientIds", () => {
	it("normalizes arrays and comma lists", () => {
		expect(parseAlertRecipientIds([" a ", "b"])).toEqual(["a", "b"]);
		expect(parseAlertRecipientIds("a,b\nc")).toEqual(["a", "b", "c"]);
	});
});

describe("buildExpirySmsMessage", () => {
	it("stays within SMS length", () => {
		const msg = buildExpirySmsMessage({
			entityLabel: "Contract",
			name: "X".repeat(200),
			daysUntil: 15,
			expirySlice: "2026-08-01",
			autoRenew: false,
		});
		expect(msg.length).toBeLessThanOrEqual(160);
	});
});
