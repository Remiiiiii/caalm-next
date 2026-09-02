import { describe, expect, it } from "vitest";
import {
	buildSignatureSectionXml,
	signaturePartiesForBlueprint,
} from "./signature-block";

describe("signature-block", () => {
	it("derives government signature parties from blueprint tokens", () => {
		const parties = signaturePartiesForBlueprint("government");
		expect(parties).toHaveLength(2);
		expect(parties[0]?.heading).toBe("GOVERNMENT AGENCY");
		expect(parties[0]?.shortLabel).toBe("Agency");
		expect(parties[1]?.heading).toBe("CONTRACTOR");
		expect(parties[1]?.shortLabel).toBe("Contractor");
	});

	it("builds the revamped two-column signature layout", () => {
		const parties = signaturePartiesForBlueprint("government");
		const xml = buildSignatureSectionXml(parties, {}, true);
		expect(xml).toContain("GOVERNMENT AGENCY");
		expect(xml).toContain("CONTRACTOR");
		expect(xml).toContain("AUTHORIZED SIGNEE (PRINTED NAME)");
		expect(xml).toContain("DIGITAL SIGNATURE RECORD");
		expect(xml).toContain("Fingerprint hash (Agency)");
		expect(xml).toContain("Fingerprint hash (Contractor)");
		expect(xml).toContain("ELECTRONICALLY SIGNED VIA CAALM SECURE SIGNATURE MODULE");
		expect(xml).toContain("E8F5F0");
		expect(xml).not.toContain("DIGITAL SIGNATURES &amp; EXECUTION");
	});
});
