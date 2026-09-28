import { describe, expect, it } from "vitest";
import {
	demoRequestSchema,
	formatPhoneInput,
} from "@/lib/demo-request/schema";

describe("demo request schema", () => {
	const valid = {
		email: "ops@example.org",
		firstName: "Ada",
		lastName: "Okoye",
		companyName: "Harbor Health",
		companySize: "11-50" as const,
		phone: "(555) 555-0100",
		message: "Renewals and gifts",
	};

	it("accepts a complete lead", () => {
		expect(demoRequestSchema.safeParse(valid).success).toBe(true);
	});

	it("rejects a personal inbox and a short phone", () => {
		expect(
			demoRequestSchema.safeParse({ ...valid, email: "ada@gmail.com" }).success,
		).toBe(false);
		expect(
			demoRequestSchema.safeParse({ ...valid, phone: "555" }).success,
		).toBe(false);
	});

	it("formats a US phone while typing", () => {
		expect(formatPhoneInput("5555550100")).toBe("(555) 555-0100");
	});
});
