import { describe, expect, it } from "vitest";
import {
	buildSequenceRowId,
} from "@/lib/tickets/ticket-number.service";
import {
	displayTicketNumber,
	formatTicketNumber,
	normalizeTicketNumberQuery,
	parseTicketNumber,
} from "@/lib/tickets/ticket-number.utils";

describe("ticket number helpers", () => {
	it("formats year + sequence as TKT-YYYY-####", () => {
		expect(formatTicketNumber(2026, 42)).toBe("TKT-2026-0042");
		expect(formatTicketNumber(2026, 10000)).toBe("TKT-2026-10000");
	});

	it("parses and normalizes human search input", () => {
		expect(parseTicketNumber("TKT-2026-0042")).toEqual({
			year: 2026,
			sequence: 42,
		});
		expect(normalizeTicketNumberQuery("tkt2026-42")).toBe("TKT-2026-0042");
		expect(normalizeTicketNumberQuery("2026-42")).toBe("TKT-2026-0042");
		expect(normalizeTicketNumberQuery("login broken")).toBe("LOGIN BROKEN");
	});

	it("builds stable alphanumeric sequence row ids", () => {
		const id = buildSequenceRowId("orgabc123", 2026);
		expect(id).toMatch(/^ts[a-f0-9]{28}$/);
		expect(id.length).toBeLessThanOrEqual(36);
		expect(buildSequenceRowId("orgabc123", 2026)).toBe(id);
	});

	it("displays ticket number with id fallback", () => {
		expect(
			displayTicketNumber({ ticketNumber: "TKT-2026-0001", $id: "abc" }),
		).toBe("TKT-2026-0001");
		expect(displayTicketNumber({ $id: "abc" })).toBe("abc");
	});
});
