import { z } from "zod";
import { isValidIanaTimezone } from "@/lib/timezone";

/** Hostname used as the part after @ in an email, e.g. example.org */
const EMAIL_DOMAIN_RE =
	/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

const US_PHONE_RE =
	/^(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}$/;

const US_ZIP_RE = /^\d{5}(?:-\d{4})?$/;

const CITY_RE = /^[A-Za-z][A-Za-z .'-]{0,127}$/;

const STREET_RE = /^[A-Za-z0-9][A-Za-z0-9 .,'#/\-]{0,254}$/;

function blankToNull(value: string | null | undefined): string | null {
	if (value == null) return null;
	const trimmed = value.trim();
	return trimmed === "" ? null : trimmed;
}

/** Empty string becomes null. Omitted (`undefined`) stays omitted so partial PUTs do not wipe fields. */
function optionalText(schema: z.ZodType<string>) {
	return z.preprocess((value) => {
		if (value === undefined) return undefined;
		if (value === null) return null;
		if (typeof value !== "string") return value;
		return blankToNull(value);
	}, z.union([z.undefined(), z.null(), schema]));
}

export const orgNameField = z
	.string()
	.trim()
	.min(1, "Enter an organization name")
	.max(255, "Organization name is too long");

export const orgDomainField = optionalText(
	z
		.string()
		.trim()
		.max(255)
		.refine((value) => !value.includes("@"), {
			message: "Enter a domain like example.com, not an email address",
		})
		.refine((value) => !/^https?:\/\//i.test(value), {
			message: "Enter a domain like example.com, not a website URL",
		})
		.refine((value) => EMAIL_DOMAIN_RE.test(value), {
			message: "Enter a domain like example.com",
		}),
);

export const orgTimezoneField = z
	.string()
	.trim()
	.min(1)
	.max(64)
	.refine((value) => isValidIanaTimezone(value), {
		message: "Timezone must be a valid IANA timezone",
	});

export const orgWebsiteField = optionalText(
	z.url("Enter a website URL like https://example.org"),
);

export const orgStreetField = optionalText(
	z
		.string()
		.trim()
		.max(255)
		.regex(STREET_RE, "Enter a street address like 9802 SW 77th Ave"),
);

export const orgCityField = optionalText(
	z
		.string()
		.trim()
		.max(128)
		.regex(CITY_RE, "Enter a city name like Miami"),
);

export const orgStateField = optionalText(
	z
		.string()
		.trim()
		.regex(/^[A-Za-z]{2}$/, "Use a 2-letter state code like FL")
		.transform((value) => value.toUpperCase()),
);

export const orgZipcodeField = optionalText(
	z
		.string()
		.trim()
		.regex(US_ZIP_RE, "Enter a ZIP code like 33156 or 33156-1234"),
);

export const orgPhoneField = optionalText(
	z
		.string()
		.trim()
		.max(64)
		.regex(US_PHONE_RE, "Enter a phone number like (202) 555-0100"),
);

export const orgEmailField = optionalText(
	z.email("Enter a valid email address like hello@example.org"),
);

export const orgAddressField = optionalText(
	z.string().trim().max(500, "Address is too long"),
);

export const organizationProfileFormSchema = z.object({
	name: orgNameField,
	domain: orgDomainField,
	timezone: orgTimezoneField,
	websiteUrl: orgWebsiteField,
	street: orgStreetField,
	city: orgCityField,
	state: orgStateField,
	zipcode: orgZipcodeField,
	phone: orgPhoneField,
	email: orgEmailField,
});

export type OrganizationProfileForm = z.infer<
	typeof organizationProfileFormSchema
>;

export const updateOrgSchema = z.object({
	name: orgNameField.optional(),
	domain: orgDomainField.optional(),
	settings: z
		.object({
			features: z.array(z.string()).optional(),
			timezone: orgTimezoneField.optional(),
			websiteUrl: orgWebsiteField.optional(),
			address: orgAddressField.optional(),
			street: orgStreetField.optional(),
			city: orgCityField.optional(),
			state: orgStateField.optional(),
			zipcode: orgZipcodeField.optional(),
			phone: orgPhoneField.optional(),
			email: orgEmailField.optional(),
		})
		.optional(),
});

export function firstOrgProfileErrors(
	error: z.ZodError,
): Partial<Record<keyof OrganizationProfileForm, string>> {
	const next: Partial<Record<keyof OrganizationProfileForm, string>> = {};
	for (const issue of error.issues) {
		const key = issue.path[0];
		if (typeof key === "string" && next[key as keyof OrganizationProfileForm] == null) {
			next[key as keyof OrganizationProfileForm] = issue.message;
		}
	}
	return next;
}
