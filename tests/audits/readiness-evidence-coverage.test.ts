import { afterEach, describe, expect, it } from "vitest";
import {
	contractCandidate,
	heuristicRecordMatches,
	licenseCandidate,
	scoreEvidenceMap,
	scoreRequirement,
} from "@/lib/audits/readiness/evidence-coverage";
import { recommendEvidenceTags } from "@/lib/audits/readiness/recommend-tags";
import { sanitizeRequirementIds } from "@/lib/audits/readiness/evidence-map.seed";
import type { AuditEvidenceMapRow } from "@/lib/audits/readiness/types";

function row(
	partial: Pick<
		AuditEvidenceMapRow,
		"requirementId" | "label" | "evidenceType" | "caalmModule"
	> &
		Partial<Pick<AuditEvidenceMapRow, "auditType">>,
): AuditEvidenceMapRow {
	return {
		segment: "cfce_fqhc_cw",
		auditType: "cw_monitoring",
		inV1: true,
		...partial,
	};
}

const HOME = row({
	requirementId: "CW-HOME-LICENSE",
	label: "Foster / group home or facility licensing",
	evidenceType: "license_credential",
	caalmModule: "licenses",
});

const STAFF = row({
	requirementId: "CW-STAFF-CRED",
	label: "Staff credentials required by contract",
	evidenceType: "license_credential",
	caalmModule: "licenses",
});

const INSURANCE = row({
	requirementId: "PBC-INSURANCE",
	label: "Insurance certificates / coverage evidence",
	evidenceType: "license_or_document",
	caalmModule: "licenses",
	auditType: "financial_pbc",
});

const GRANT = row({
	requirementId: "PBC-GRANT-AGREEMENTS",
	label: "Grant and contract award agreements",
	evidenceType: "contract_agreement",
	caalmModule: "contracts",
	auditType: "financial_pbc",
});

const VENDOR = row({
	requirementId: "PBC-VENDOR-CONTRACTS",
	label: "Material vendor / service contracts",
	evidenceType: "contract_agreement",
	caalmModule: "contracts",
	auditType: "financial_pbc",
});

const CAP = row({
	requirementId: "CW-CAP",
	label: "Corrective action plan items with owners and due dates",
	evidenceType: "corrective_action",
	caalmModule: "contracts",
});

describe("readiness evidence coverage", () => {
	it("covers only the tagged group-home license, not an untagged staff credential", () => {
		const candidates = [
			{
				...licenseCandidate({
					$id: "home-1",
					licenseName: "Behavioral Health Facility License",
					licenseType: "Healthcare",
					status: "active",
					compliance: "compliant",
				}),
				requirementIds: ["CW-HOME-LICENSE"],
			},
			{
				...licenseCandidate({
					$id: "staff-1",
					licenseName: "Clinical Practice Permit",
					licenseType: "Healthcare",
					status: "active",
					compliance: "at-risk",
				}),
				requirementIds: ["CW-STAFF-CRED"],
			},
		];

		const home = scoreRequirement(HOME, candidates);
		const staff = scoreRequirement(STAFF, candidates);

		expect(home.status).toBe("covered");
		expect(home.matchedRecords.map((record) => record.id)).toEqual(["home-1"]);
		expect(staff.status).toBe("gap");
		expect(staff.matchedRecords.map((record) => record.id)).toEqual(["staff-1"]);
	});

	it("treats untagged records as a gap even when the name would have matched", () => {
		const facility = licenseCandidate({
			$id: "home-1",
			licenseName: "Behavioral Health Facility License",
			licenseType: "Healthcare",
			status: "active",
			compliance: "compliant",
		});
		expect(scoreRequirement(HOME, [facility]).status).toBe("gap");
	});

	it("covers insurance only when that record is tagged", () => {
		const insurance = {
			...licenseCandidate({
				$id: "ins-1",
				licenseName: "General Liability Certificate",
				category: "insurance",
				status: "active",
				compliance: "compliant",
			}),
			requirementIds: ["PBC-INSURANCE"],
		};
		const facility = {
			...licenseCandidate({
				$id: "home-1",
				licenseName: "Behavioral Health Facility License",
				status: "active",
				compliance: "compliant",
			}),
			requirementIds: ["CW-HOME-LICENSE"],
		};

		expect(scoreRequirement(INSURANCE, [facility]).status).toBe("gap");
		expect(scoreRequirement(INSURANCE, [insurance, facility]).status).toBe(
			"covered",
		);
	});

	it("covers a tagged vendor contract without covering untagged grants", () => {
		const candidates = [
			{
				...contractCandidate({
					$id: "v-1",
					contractName: "Clinic Supplies Agreement",
					contractType: "Purchase_Order",
					compliance: "up-to-date",
				}),
				requirementIds: ["PBC-VENDOR-CONTRACTS"],
			},
		];

		expect(scoreRequirement(VENDOR, candidates).status).toBe("covered");
		expect(scoreRequirement(GRANT, candidates).status).toBe("gap");
	});

	it("treats corrective action as a gap when a tagged contract is non-compliant", () => {
		const ok = {
			...contractCandidate({
				$id: "ok",
				contractName: "Office Lease",
				compliance: "up-to-date",
			}),
			requirementIds: ["CW-CAP"],
		};
		const bad = {
			...contractCandidate({
				$id: "bad",
				contractName: "Legacy Print Services",
				compliance: "non-compliant",
			}),
			requirementIds: ["CW-CAP"],
		};

		expect(scoreRequirement(CAP, [ok, bad]).status).toBe("gap");
		expect(scoreRequirement(CAP, [ok]).status).toBe("covered");
		expect(scoreRequirement(CAP, []).status).toBe("gap");
	});

	it("still uses keyword hints only as a suggester, not for coverage", () => {
		const transport = licenseCandidate({
			$id: "trp",
			licenseName: "Transportation Permit",
			licenseType: "Transportation",
			status: "active",
			compliance: "compliant",
		});
		expect(
			heuristicRecordMatches(transport, "licenses", {
				keywords: ["nurse"],
			}),
		).toBe(false);
		expect(scoreRequirement(STAFF, [transport]).matchedRecords).toEqual([]);
	});

	it("scores the public site from crawl health, not records", () => {
		const site = row({
			requirementId: "SITE-PUBLIC-PRESENCE",
			label: "Public website reachability (informational)",
			evidenceType: "site_crawl",
			caalmModule: "site",
		});
		expect(
			scoreEvidenceMap({
				rows: [site],
				candidates: [],
				siteHealth: "ok",
			})[0]?.status,
		).toBe("covered");
	});

	it("drops requirement ids that do not belong on that record kind", () => {
		expect(
			sanitizeRequirementIds("license", [
				"CW-HOME-LICENSE",
				"PBC-GRANT-AGREEMENTS",
				"CW-HOME-LICENSE",
			]),
		).toEqual(["CW-HOME-LICENSE"]);
	});
});

describe("recommend evidence tags fallback", () => {
	const previousKey = process.env.GOOGLE_API_KEY;

	afterEach(() => {
		if (previousKey) process.env.GOOGLE_API_KEY = previousKey;
		else delete process.env.GOOGLE_API_KEY;
	});

	it("suggests from name and type when Gemini is off", async () => {
		delete process.env.GOOGLE_API_KEY;
		const suggestions = await recommendEvidenceTags({
			kind: "license",
			title: "Behavioral Health Facility License",
			type: "Healthcare",
		});
		expect(suggestions.some((item) => item.requirementId === "CW-HOME-LICENSE")).toBe(
			true,
		);
		expect(suggestions.every((item) => item.source === "fallback")).toBe(true);
	});
});
