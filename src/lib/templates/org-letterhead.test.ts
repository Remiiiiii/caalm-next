import { describe, expect, it } from "vitest";
import {
	formatOrgCityStateZip,
	formatOrgStreetAddress,
	formatOrgWebsite,
	orgLetterheadValues,
} from "./org-letterhead";

describe("org letterhead values", () => {
	it("maps org profile fields onto letterhead tokens", () => {
		const values = orgLetterheadValues({
			name: "CFCE",
			domain: "cfcecares.org",
			settings: {
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				address: "123 Main St",
				phone: "202-555-0100",
				email: "hello@cfcecares.org",
				websiteUrl: "https://cfcecares.org",
			},
		});
		expect(values.org_name).toBe("CFCE");
		expect(values.org_address).toBe("123 Main St");
		expect(values.org_phone_number).toBe("202-555-0100");
		expect(values.org_email).toBe("hello@cfcecares.org");
		expect(values.org_website).toBe("cfcecares.org");
	});

	it("splits street and city/state/zip onto separate letterhead lines", () => {
		const values = orgLetterheadValues({
			name: "Caalm Solutions Inc.",
			domain: "caalmsolutions.com",
			settings: {
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				street: "9802 SW 77th Ave",
				city: "Miami",
				state: "FL",
				zipcode: "33156",
				phone: "(305) 555-5555",
				email: "support@caalmsolutions.com",
				websiteUrl: "https://caalmsolutions.com",
			},
		});
		expect(values.org_address).toBe("9802 SW 77th Ave\nMiami, FL 33156");
		expect(values.org_website).toBe("caalmsolutions.com");
	});

	it("formats city/state/zip without an extra comma before zip", () => {
		expect(
			formatOrgCityStateZip({
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				city: "Miami",
				state: "FL",
				zipcode: "33156",
			}),
		).toBe("Miami, FL 33156");
	});

	it("strips https:// from website values", () => {
		expect(formatOrgWebsite("https://caalmsolutions.com/")).toBe(
			"caalmsolutions.com",
		);
		expect(formatOrgWebsite("http://example.org")).toBe("example.org");
	});

	it("keeps a single-line legacy address when structured fields are missing", () => {
		expect(
			formatOrgStreetAddress({
				maxUsers: 10,
				maxDepartments: 3,
				features: [],
				address: "123 Main St",
			}),
		).toBe("123 Main St");
	});
});
