import { z } from "zod";

export const COMPANY_SIZE_OPTIONS = [
	"1-10",
	"11-50",
	"51-200",
	"201-500",
	"501-1,000",
	"1,001-5,000",
	"5,001-10,000",
] as const;

const workEmail = z
	.string()
	.trim()
	.min(1, "Work email is required")
	.email("Enter a valid work email")
	.refine((value) => !/@(gmail|yahoo|hotmail|outlook|icloud)\./i.test(value), {
		message: "Use a work email, not a personal inbox",
	});

export const demoRequestSchema = z.object({
	email: workEmail,
	firstName: z.string().trim().min(1, "First name is required").max(80),
	lastName: z.string().trim().min(1, "Last name is required").max(80),
	companyName: z.string().trim().min(1, "Company name is required").max(160),
	companySize: z.enum(COMPANY_SIZE_OPTIONS, {
		message: "Select a company size",
	}),
	phone: z
		.string()
		.trim()
		.min(1, "Phone number is required")
		.refine((value) => {
			const digits = value.replace(/\D/g, "");
			return digits.length >= 10 && digits.length <= 15;
		}, "Enter a phone number with 10 to 15 digits"),
	message: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type DemoRequestInput = z.infer<typeof demoRequestSchema>;

/** Display as (555) 555-0100 while typing; keep a leading + for international. */
export function formatPhoneInput(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.startsWith("+")) {
		const digits = trimmed.slice(1).replace(/\D/g, "").slice(0, 15);
		return digits ? `+${digits}` : "+";
	}
	const digits = trimmed.replace(/\D/g, "").slice(0, 10);
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
