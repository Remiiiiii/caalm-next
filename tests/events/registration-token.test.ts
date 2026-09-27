import { describe, expect, it } from "vitest";
import {
	createRegistrationToken,
	parseRegistrationToken,
	verifyRegistrationToken,
} from "@/lib/events/registration-token";

describe("event registration token helper", () => {
	const secret = "unit-test-registration-secret";

	it("round-trips sign and verify", () => {
		const token = createRegistrationToken("reg1", "org1", {
			secret,
			expiresAt: 4_000_000_000,
		});
		expect(parseRegistrationToken(token, secret)).toEqual({
			registrationId: "reg1",
			orgId: "org1",
			expiresAt: 4_000_000_000,
		});
	});

	it("rejects tampered tokens", () => {
		const token = createRegistrationToken("reg1", "org1", {
			secret,
			expiresAt: 4_000_000_000,
		});
		expect(parseRegistrationToken(`${token}x`, secret)).toBeNull();
		expect(parseRegistrationToken(token, "other-secret")).toBeNull();
	});

	it("rejects expired tokens", () => {
		const token = createRegistrationToken("reg1", "org1", {
			secret,
			expiresAt: 1,
		});
		const verified = verifyRegistrationToken(token, {
			secret,
			nowSeconds: 100,
		});
		expect(verified.ok).toBe(false);
		if (!verified.ok) expect(verified.reason).toBe("expired");
	});

	it("returns already-used when tokenUsedAt is set", () => {
		const token = createRegistrationToken("reg1", "org1", {
			secret,
			expiresAt: 4_000_000_000,
		});
		const verified = verifyRegistrationToken(token, {
			secret,
			tokenUsedAt: new Date().toISOString(),
			nowSeconds: 100,
		});
		expect(verified.ok).toBe(false);
		if (!verified.ok) expect(verified.reason).toBe("already_used");
	});
});
