import { describe, expect, it } from "vitest";
import { EXPIRY_ALERT_SNOOZE_DAYS, getExpiryActions } from "./action-matrix";

describe("getExpiryActions", () => {
	it("contract, not overdue: renew / view / snooze 30 / let expire", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: 12 });
		expect(m.primary).toEqual({ id: "renew", label: "Renew Contract" });
		expect(m.secondary.id).toBe("view");
		expect(m.deferral).toEqual({
			id: "snooze",
			label: `Snooze ${EXPIRY_ALERT_SNOOZE_DAYS} days`,
		});
		expect(m.destructive).toEqual({ id: "letExpire", label: "Let Expire…" });
		expect(m.note).toMatch(/marks this contract inactive/i);
	});

	it("contract, overdue: no snooze, mark inactive instead", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: -2 });
		expect(m.deferral).toBeNull();
		expect(m.destructive).toEqual({
			id: "markInactive",
			label: "Mark Inactive…",
		});
		expect(m.note).toMatch(/can't be snoozed/i);
	});

	it("license: renew / view / dismiss only — no snooze, no let expire", () => {
		const m = getExpiryActions({ kind: "license", daysRemaining: 5 });
		expect(m.primary.label).toBe("Renew License");
		expect(m.deferral).toEqual({ id: "dismiss", label: "Dismiss for now" });
		expect(m.destructive).toBeNull();
		expect(m.note).toMatch(/can't be snoozed by date/i);
	});

	it("respects a custom snoozeDays", () => {
		const m = getExpiryActions({
			kind: "contract",
			daysRemaining: 3,
			snoozeDays: 14,
		});
		expect(m.deferral?.label).toBe("Snooze 14 days");
	});
});
