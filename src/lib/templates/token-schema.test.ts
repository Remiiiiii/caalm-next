import { describe, expect, it } from "vitest";
import { emptyWizardPayload } from "./assemble-contract";
import {
	buildMergeTokenValues,
	formatAmountForDocument,
	getVisibleFillFields,
	isSignatureLockToken,
	parseAmountInput,
	validateBlueprintTokens,
} from "./token-schema";

describe("blueprint token schema", () => {
	it("locks signature hash and timestamp tokens", () => {
		expect(isSignatureLockToken("VENDOR_SIGNATURE_HASH")).toBe(true);
		expect(isSignatureLockToken("VENDOR_SIGNATURE_TIMESTAMP")).toBe(true);
		expect(isSignatureLockToken("VENDOR_SIGNEE_NAME")).toBe(false);
	});

	it("does not show signature lock tokens as fill fields", () => {
		const fields = getVisibleFillFields("government");
		expect(
			fields.some(
				(field) => field.kind === "token" && field.token.includes("SIGNATURE_HASH"),
			),
		).toBe(false);
		expect(fields.some((field) => field.kind === "intake" && field.intakeField === "counterparty")).toBe(
			true,
		);
	});

	it("lists every missing required field at once", () => {
		const payload = emptyWizardPayload();
		const errors = validateBlueprintTokens("vendor", payload.intake, {});
		expect(errors.length).toBeGreaterThan(1);
		expect(errors.some((row) => /contract/i.test(row))).toBe(true);
		expect(errors.some((row) => /vendor|other party|counterparty/i.test(row))).toBe(
			true,
		);
	});

	it("maps intake values onto docx tokens", () => {
		const payload = emptyWizardPayload();
		payload.intake.counterparty = "Acme Corp";
		payload.intake.startDate = "2026-09-01";
		payload.intake.expiryDate = "2027-09-01";
		payload.intake.amount = "12000";
		const values = buildMergeTokenValues("vendor", payload.intake, {});
		expect(values.VENDOR_NAME).toBe("Acme Corp");
		expect(values.DATE).toBe("2026-09-01");
		expect(values.END_DATE).toBe("2027-09-01");
		expect(values.BUDGET).toBe("$12,000.00");
		expect(values.VENDOR_SIGNATURE_HASH).toBeUndefined();
	});

	it("formats budget with the intake currency", () => {
		expect(formatAmountForDocument("10000", "USD")).toBe("$10,000.00");
		expect(parseAmountInput("$10,000.00")).toBe("10000.00");
	});

	it("bakes org letterhead tokens into the merge map", () => {
		const payload = emptyWizardPayload();
		const values = buildMergeTokenValues("vendor", payload.intake, {}, {
			org_name: "CFCE",
			org_address: "123 Main St",
			org_phone_number: "202-555-0100",
			org_email: "hello@cfcecares.org",
			org_website: "https://cfcecares.org",
		});
		expect(values.org_name).toBe("CFCE");
		expect(values.org_website).toBe("https://cfcecares.org");
	});
});
