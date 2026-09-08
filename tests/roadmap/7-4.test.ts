import { describe, expect, it } from "vitest";
import {
	canCounterpartyComment,
	hashNegotiationToken,
	isAccessValid,
	tokensMatch,
} from "@/lib/contracts/negotiation/access.logic";

describe("roadmap task 7.4 counterparty access", () => {
	it("allows a live token and rejects an expired one", () => {
		const token = "invite-token-example";
		const hash = hashNegotiationToken(token);
		expect(tokensMatch(token, hash)).toBe(true);

		const live = isAccessValid({
			expiresAt: new Date(Date.now() + 60_000).toISOString(),
			revokedAt: "",
		});
		expect(canCounterpartyComment(live)).toBe(true);

		const expired = isAccessValid({
			expiresAt: new Date(Date.now() - 60_000).toISOString(),
			revokedAt: "",
		});
		expect(canCounterpartyComment(expired)).toBe(false);
	});
});
