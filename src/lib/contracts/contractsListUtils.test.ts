import { describe, expect, it } from "vitest";
import {
	applyContractListFilters,
	asFilterList,
	matchesContractFilters,
} from "./contractsListUtils";
import type { UIFileDoc } from "@/types/files";

function file(overrides: Partial<UIFileDoc> = {}): UIFileDoc {
	return {
		$id: "c1",
		name: "Office lease",
		contractName: "Office lease",
		status: "active",
		contractType: "Lease",
		department: "Legal",
		assignedManagers: ["Alex Rivera"],
		$createdAt: "2026-01-15T12:00:00.000Z",
		...overrides,
	} as UIFileDoc;
}

describe("asFilterList", () => {
	it("keeps old saved single values", () => {
		expect(asFilterList("active")).toEqual(["active"]);
	});

	it("drops empty lists", () => {
		expect(asFilterList([])).toBeUndefined();
	});
});

describe("matchesContractFilters", () => {
	it("matches any selected status, type, or department", () => {
		expect(
			matchesContractFilters(file(), {
				status: ["expired", "active"],
				contractType: ["Lease", "NDA"],
				department: ["Legal", "IT"],
			}),
		).toBe(true);
	});

	it("rejects a contract outside the selected lists", () => {
		expect(
			matchesContractFilters(file(), {
				status: ["expired"],
				department: ["IT"],
			}),
		).toBe(false);
	});

	it("matches if any assigned manager is selected", () => {
		expect(
			matchesContractFilters(
				file({ assignedManagers: ["Alex Rivera", "Sam Chen"] }),
				{ assignedTo: ["Sam Chen", "Jordan Lee"] },
			),
		).toBe(true);
	});
});

describe("applyContractListFilters", () => {
	it("keeps contracts that hit any selected status", () => {
		const rows = [
			file({ $id: "a", status: "active" }),
			file({ $id: "b", status: "expired", isExpired: true }),
			file({ $id: "c", status: "inactive" }),
		];
		const result = applyContractListFilters(
			rows,
			{ status: ["active", "expired"] },
			"all",
		);
		expect(result.map((row) => row.$id)).toEqual(["a", "b"]);
	});
});
