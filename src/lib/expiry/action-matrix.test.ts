import { describe, expect, it } from "vitest";
import {
	getExpiryActions,
	resolveContractSnoozeDays,
} from "./action-matrix";

describe("resolveContractSnoozeDays", () => {
	it("far window (≥30): snoozes until 10 days before expiry", () => {
		expect(resolveContractSnoozeDays(30)).toBe(20);
		expect(resolveContractSnoozeDays(40)).toBe(30);
	});

	it("mid window (11–29): short snooze capped at 5", () => {
		expect(resolveContractSnoozeDays(25)).toBe(5);
		expect(resolveContractSnoozeDays(15)).toBe(5);
		expect(resolveContractSnoozeDays(11)).toBe(5);
	});

	it("near window (2–10): until day before expiry", () => {
		expect(resolveContractSnoozeDays(10)).toBe(9);
		expect(resolveContractSnoozeDays(5)).toBe(4);
		expect(resolveContractSnoozeDays(2)).toBe(1);
	});

	it("refuses snooze at ≤1 day or overdue", () => {
		expect(resolveContractSnoozeDays(1)).toBeNull();
		expect(resolveContractSnoozeDays(0)).toBeNull();
		expect(resolveContractSnoozeDays(-3)).toBeNull();
	});
});

describe("getExpiryActions", () => {
	it("contract mid-window: renew / view / snooze 5 / let expire", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: 25 });
		expect(m.primary).toEqual({ id: "renew", label: "Renew Contract" });
		expect(m.secondary.id).toBe("view");
		expect(m.deferral).toEqual({
			id: "snooze",
			label: "Snooze 5 days",
		});
		expect(m.destructive).toEqual({ id: "letExpire", label: "Let Expire…" });
		expect(m.note).toMatch(/marks this contract inactive/i);
	});

	it("contract far-window: snooze until 10 days before (20 of 30)", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: 30 });
		expect(m.deferral).toEqual({
			id: "snooze",
			label: "Snooze 20 days",
		});
	});

	it("contract near-window: snooze daysRemaining - 1", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: 5 });
		expect(m.deferral).toEqual({
			id: "snooze",
			label: "Snooze 4 days",
		});
	});

	it("contract, 1 day left: no snooze", () => {
		const m = getExpiryActions({ kind: "contract", daysRemaining: 1 });
		expect(m.deferral).toBeNull();
		expect(m.note).toMatch(/too close to expiry/i);
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

	it("clamps a custom snoozeDays to day-before-expiry", () => {
		const m = getExpiryActions({
			kind: "contract",
			daysRemaining: 3,
			snoozeDays: 14,
		});
		expect(m.deferral?.label).toBe("Snooze 2 days");
	});
});
