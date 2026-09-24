import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";
import { NONPROFIT_ROADMAP_CATALOG } from "@/lib/roadmap/nonprofit-catalog";

describe("NPO 6.1 registration schema and ticket types", () => {
	const task = NONPROFIT_ROADMAP_CATALOG[6]?.tasks.find(
		(row) => row.taskCode === "6.1",
	);

	it("is catalogued as registration schema", () => {
		expect(task?.title).toMatch(/Registration schema/i);
	});

	it("uses alphanumeric collection ids for ticket types and registrations", () => {
		expect(appwriteConfig.eventTicketTypesCollectionId).toMatch(/^[a-zA-Z0-9]+$/);
		expect(appwriteConfig.eventRegistrationsCollectionId).toMatch(/^[a-zA-Z0-9]+$/);
		expect(appwriteConfig.eventTicketTypesCollectionId).not.toBe(
			"event_ticket_types",
		);

		const example = readFileSync(join(process.cwd(), ".env.example"), "utf8");
		expect(example).toMatch(
			/NEXT_PUBLIC_APPWRITE_EVENT_TICKET_TYPES_COLLECTION=/,
		);
		expect(example).toMatch(
			/NEXT_PUBLIC_APPWRITE_EVENT_REGISTRATIONS_COLLECTION=/,
		);
	});

	it("requires capacity on ticket type create", () => {
		const route = readFileSync(
			join(process.cwd(), "src/app/api/events/[eventId]/ticket-types/route.ts"),
			"utf8",
		);
		expect(route).toMatch(/capacity must be at least 1/);
	});
});
