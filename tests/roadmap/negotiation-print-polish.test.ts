import { describe, expect, it } from "vitest";
import {
	alignTermStartWithEffectiveDate,
	extractEffectiveDate,
	polishNegotiationHtml,
	polishNegotiationPlainText,
	stripRedundantPartyLines,
} from "@/lib/contracts/negotiation/print-polish";

describe("print-polish", () => {
	it("extracts Effective Date from body text", () => {
		expect(
			extractEffectiveDate(
				"Intro.\nEffective Date: 2026-09-10\nGrantor: State Health Foundation",
			),
		).toBe("2026-09-10");
	});

	it("aligns Term start with Effective Date", () => {
		const next = alignTermStartWithEffectiveDate(
			[
				"Effective Date: 2026-09-10",
				"3. TERM",
				"This Agreement runs from 2026-09-07 through 2026-12-01.",
			].join("\n"),
		);
		expect(next).toContain("from 2026-09-10 through 2026-12-01");
		expect(next).not.toContain("from 2026-09-07 through");
	});

	it("strips redundant Grantor/Grantee lines when intro already names them", () => {
		const next = stripRedundantPartyLines(
			[
				'This Agreement is entered into by State Health Foundation ("Grantor") and Acme Health Services ("Grantee").',
				"Effective Date: 2026-09-10",
				"Grantor: State Health Foundation",
				"Grantee: Acme Health Services",
				"1. GRANT PURPOSE",
			].join("\n"),
		);
		expect(next).toContain("Effective Date: 2026-09-10");
		expect(next).not.toMatch(/^Grantor:/m);
		expect(next).not.toMatch(/^Grantee:/m);
		expect(next).toContain('("Grantor")');
	});

	it("polishes plain text end-to-end", () => {
		const next = polishNegotiationPlainText(
			[
				'Parties: State Health Foundation ("Grantor") and Acme ("Grantee").',
				"Effective Date: 2026-09-10",
				"Grantor: State Health Foundation",
				"Grantee: Acme",
				"Term from 2026-09-07 through 2026-12-01.",
			].join("\n"),
		);
		expect(next).toContain("from 2026-09-10 through 2026-12-01");
		expect(next).not.toContain("Grantor: State Health Foundation");
	});

	it("polishes HTML party lines and term dates", () => {
		const html = polishNegotiationHtml(
			[
				'<p>State Health Foundation ("Grantor") and Acme ("Grantee").</p>',
				"<p>Effective Date: 2026-09-10</p>",
				"<p>Grantor: State Health Foundation</p>",
				"<p>Grantee: Acme</p>",
				"<p>from 2026-09-07 through 2026-12-01</p>",
			].join(""),
		);
		expect(html).toContain("from 2026-09-10 through 2026-12-01");
		expect(html).not.toContain("<p>Grantor: State Health Foundation</p>");
		expect(html).not.toContain("<p>Grantee: Acme</p>");
	});
});
