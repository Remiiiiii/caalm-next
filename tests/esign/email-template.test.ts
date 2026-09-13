import { describe, expect, it } from "vitest";
import { applyEsignEmailTemplate } from "@/lib/esign/email-template";

describe("applyEsignEmailTemplate", () => {
	it("substitutes signer and document variables", () => {
		expect(
			applyEsignEmailTemplate(
				"Hi {signer.name} ({signer.email}) — please sign {document.name}",
				{
					signerName: "Jordan Lee",
					signerEmail: "jordan@example.com",
					documentName: "Grant Agreement",
				},
			),
		).toBe(
			"Hi Jordan Lee (jordan@example.com) — please sign Grant Agreement",
		);
	});
});
