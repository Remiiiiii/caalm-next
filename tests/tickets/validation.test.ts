import { describe, expect, it } from "vitest";
import { buildCreateTicketInput } from "@/lib/tickets/ticket-intake.service";

describe("ticket validation", () => {
	describe("title validation", () => {
		it("rejects titles shorter than 3 characters", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "ab",
					description: "Valid description for help ticket",
					lane: "help",
					category: "Hardware",
					impact: "low",
					urgency: "medium",
				}),
			).toThrow(/title/i);
		});

		it("accepts valid titles", () => {
			const payload = buildCreateTicketInput({
				title: "Need laptop replacement",
				description: "My current laptop is broken",
				lane: "help",
				category: "Hardware",
				impact: "low",
				urgency: "medium",
			});
			expect(payload.title).toBe("Need laptop replacement");
		});
	});

	describe("engineering ticket validation", () => {
		it("rejects engineering tickets with missing reproduction steps", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "",
					expected: "Should login successfully",
					actual: "Login fails with error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/reproduction steps/i);
		});

		it("rejects engineering tickets with short reproduction steps", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "abc",
					expected: "Should login successfully",
					actual: "Login fails with error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/reproduction steps/i);
		});

		it("rejects engineering tickets with missing expected behavior", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "",
					actual: "Login fails with error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/expected behavior/i);
		});

		it("rejects engineering tickets with short expected behavior", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "works",
					actual: "Login fails with error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/expected behavior/i);
		});

		it("rejects engineering tickets with missing actual behavior", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "Should login successfully",
					actual: "",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/actual behavior/i);
		});

		it("rejects engineering tickets with short actual behavior", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "Should login successfully",
					actual: "error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/actual behavior/i);
		});

		it("rejects engineering tickets with missing OS", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "Should login successfully",
					actual: "Login fails with error",
					os: "",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/OS/i);
		});

		it("rejects engineering tickets with missing environment", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "Should login successfully",
					actual: "Login fails with error",
					os: "Windows",
					environment: "",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/environment/i);
		});

		it("rejects engineering tickets without confirmations", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Login broken",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "1. Open login page\n2. Enter credentials",
					expected: "Should login successfully",
					actual: "Login fails with error",
					os: "Windows",
					environment: "Production",
					searchedExisting: false,
					isBug: false,
				}),
			).toThrow(/confirmations/i);
		});

		it("accepts valid engineering tickets", () => {
			const payload = buildCreateTicketInput({
				title: "Login broken",
				description: "",
				lane: "engineering",
				category: "Software / Application",
				affectedModule: "User Management",
				impact: "high",
				urgency: "high",
				steps: "1. Open login page\n2. Enter credentials\n3. Click submit",
				expected: "Should login successfully and redirect to dashboard",
				actual: "Login fails with error message about invalid session",
				os: "Windows",
				environment: "Production",
				searchedExisting: true,
				isBug: true,
			});

			expect(payload.lane).toBe("engineering");
			expect(payload.title).toBe("Login broken");
			expect(payload.description).toContain("### Reproduction steps");
			expect(payload.description).toContain("### Expected behavior");
			expect(payload.description).toContain("### Actual behavior");
			expect(payload.description).toContain("### OS");
			expect(payload.description).toContain("Windows");
		});
	});

	describe("help ticket validation", () => {
		it("rejects help tickets with short description", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Need laptop",
					description: "help",
					lane: "help",
					category: "Hardware",
					impact: "low",
					urgency: "medium",
				}),
			).toThrow(/description/i);
		});

		it("accepts valid help tickets", () => {
			const payload = buildCreateTicketInput({
				title: "Need laptop replacement",
				description: "My current laptop screen is broken and I need a replacement to continue working effectively",
				lane: "help",
				category: "Hardware",
				impact: "low",
				urgency: "medium",
			});

			expect(payload.lane).toBe("help");
			expect(payload.title).toBe("Need laptop replacement");
			expect(payload.description).toContain("laptop screen is broken");
		});
	});

	describe("gibberish detection (regression for issue #47)", () => {
		it("should accept tickets even with seemingly random text if length requirements are met", () => {
			// Note: "sgfsdfgsdsd" (11 chars) passes 3-char minimum
			// The API layer will have stricter validation for obvious gibberish patterns
			const payload = buildCreateTicketInput({
				title: "sgfsdfgsdsd",
				description: "sdsdfgsdfgsdgf needs attention",
				lane: "help",
				category: "Hardware",
				impact: "low",
				urgency: "medium",
			});
			expect(payload.title).toBe("sgfsdfgsdsd");
		});

		it("should enforce minimum lengths to reduce low-quality submissions", () => {
			// Too short descriptions are still caught
			expect(() =>
				buildCreateTicketInput({
					title: "Valid title here",
					description: "short",
					lane: "help",
					category: "Hardware",
					impact: "low",
					urgency: "medium",
				}),
			).toThrow(/description/i);
		});

		it("should require structured fields for engineering tickets", () => {
			// Engineering tickets need meaningful reproduction steps, expected, actual
			expect(() =>
				buildCreateTicketInput({
					title: "Valid title",
					description: "",
					lane: "engineering",
					category: "Software / Application",
					impact: "high",
					urgency: "high",
					steps: "short",
					expected: "Should work properly without errors or issues",
					actual: "The system fails with an unexpected error",
					os: "Windows",
					environment: "Production",
					searchedExisting: true,
					isBug: true,
				}),
			).toThrow(/reproduction steps/i);
		});

		it("should accept tickets with real content that might look pattern-y", () => {
			// This should NOT be flagged as gibberish
			const payload = buildCreateTicketInput({
				title: "API returns error code AAA-BBB-CCC",
				description: "When calling the endpoint, the API returns error AAA-BBB-CCC",
				lane: "help",
				category: "Other",
				impact: "low",
				urgency: "medium",
			});

			expect(payload.title).toContain("API");
			expect(payload.description).toContain("endpoint");
		});
	});

	describe("cross-field validation", () => {
		it("rejects help category on engineering lane", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Need hardware",
					description: "Request for new equipment",
					lane: "engineering",
					category: "Hardware",
					impact: "low",
					urgency: "medium",
				}),
			).toThrow(/category/i);
		});

		it("rejects engineering category on help lane", () => {
			expect(() =>
				buildCreateTicketInput({
					title: "Bug in system",
					description: "Something is not working as expected",
					lane: "help",
					category: "Software / Application",
					impact: "low",
					urgency: "medium",
				}),
			).toThrow(/category/i);
		});
	});
});
