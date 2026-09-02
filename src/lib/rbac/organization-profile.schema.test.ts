import { describe, expect, it } from "vitest";
import {
	organizationProfileFormSchema,
	orgDomainField,
	orgEmailField,
} from "./organization-profile.schema";

const validProfile = {
	name: "Caalm Solutions Inc.",
	domain: "www.caalmsolutions.com",
	timezone: "America/New_York",
	websiteUrl: "https://cfcecares.org",
	street: "9802 SW 77th Ave",
	city: "Miami",
	state: "fl",
	zipcode: "33156",
	phone: "(202) 555-0100",
	email: "hello@example.org",
};

describe("organization profile schema", () => {
	it("accepts a complete valid profile and uppercases the state", () => {
		const parsed = organizationProfileFormSchema.parse(validProfile);
		expect(parsed.state).toBe("FL");
		expect(parsed.domain).toBe("www.caalmsolutions.com");
	});

	it("accepts a hostname with a TLD", () => {
		expect(orgDomainField.parse("example.com")).toBe("example.com");
	});

	it("rejects an email address in the domain field", () => {
		const result = orgDomainField.safeParse("hello@cfcecares.org");
		expect(result.success).toBe(false);
	});

	it("rejects a domain that is not a hostname", () => {
		const result = orgDomainField.safeParse("not a domain");
		expect(result.success).toBe(false);
	});

	it("rejects a public email that is not an address", () => {
		const result = orgEmailField.safeParse("cfcecares.org");
		expect(result.success).toBe(false);
	});

	it("allows blank optional contact fields", () => {
		const parsed = organizationProfileFormSchema.parse({
			name: "CFCE",
			domain: "",
			timezone: "America/New_York",
			websiteUrl: "",
			street: "",
			city: "",
			state: "",
			zipcode: "",
			phone: "",
			email: "",
		});
		expect(parsed.email).toBeNull();
		expect(parsed.domain).toBeNull();
	});

	it("rejects a bad ZIP, state, phone, and website together", () => {
		const result = organizationProfileFormSchema.safeParse({
			...validProfile,
			zipcode: "3315",
			state: "Florida",
			phone: "555",
			websiteUrl: "cfcecares.org",
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			const keys = result.error.issues.map((issue) => issue.path[0]);
			expect(keys).toEqual(
				expect.arrayContaining(["zipcode", "state", "phone", "websiteUrl"]),
			);
		}
	});
});
