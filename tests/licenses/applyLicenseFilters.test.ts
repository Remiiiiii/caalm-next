/**
 * Unit tests for applyLicenseFilters
 */

import { describe, expect, it } from "vitest";
import { applyLicenseFilters } from "@/lib/licenses/applyLicenseFilters";
import type { License } from "@/types/licenses";

function createLicense(overrides: Partial<License> = {}): License {
	return {
		$id: `lic-${Math.random().toString(36).slice(2, 9)}`,
		$createdAt: "2024-01-01T00:00:00.000Z",
		$updatedAt: "2024-01-01T00:00:00.000Z",
		licenseName: "Test License",
		licenseNumber: "LN-001",
		licenseType: "subscription",
		licenseExpiryDate: "2025-12-31",
		issuingAuthority: "Test Authority",
		issueDate: "2024-01-01",
		status: "active",
		orgId: "org-1",
		...overrides,
	};
}

describe("applyLicenseFilters", () => {
	it("returns all licenses when filters are empty", () => {
		const licenses = [
			createLicense({ $id: "1", status: "active" }),
			createLicense({ $id: "2", status: "inactive" }),
		];
		expect(applyLicenseFilters(licenses, {})).toHaveLength(2);
		expect(applyLicenseFilters(licenses, {})).toEqual(licenses);
	});

	it("returns all licenses when filters object has no meaningful keys", () => {
		const licenses = [createLicense({ $id: "1" })];
		expect(applyLicenseFilters(licenses, {})).toHaveLength(1);
	});

	it("filters by status", () => {
		const licenses = [
			createLicense({ $id: "1", status: "active" }),
			createLicense({ $id: "2", status: "inactive" }),
			createLicense({ $id: "3", status: "active" }),
		];
		const result = applyLicenseFilters(licenses, { status: "active" });
		expect(result).toHaveLength(2);
		expect(result.every((l) => l.status === "active")).toBe(true);
	});

	it("filters by licenseType", () => {
		const licenses = [
			createLicense({ $id: "1", licenseType: "subscription" }),
			createLicense({ $id: "2", licenseType: "perpetual" }),
			createLicense({ $id: "3", licenseType: "subscription" }),
		];
		const result = applyLicenseFilters(licenses, {
			licenseType: "subscription",
		});
		expect(result).toHaveLength(2);
		expect(result.every((l) => l.licenseType === "subscription")).toBe(true);
	});

	it("filters by category", () => {
		const licenses = [
			createLicense({ $id: "1", category: "saas" }),
			createLicense({ $id: "2", category: "cloud" }),
		];
		const result = applyLicenseFilters(licenses, { category: "saas" });
		expect(result).toHaveLength(1);
		expect(result[0].category).toBe("saas");
	});

	it("filters by searchQuery (licenseName)", () => {
		const licenses = [
			createLicense({ $id: "1", licenseName: "Adobe Creative Cloud" }),
			createLicense({ $id: "2", licenseName: "Microsoft 365" }),
		];
		const result = applyLicenseFilters(licenses, { searchQuery: "Adobe" });
		expect(result).toHaveLength(1);
		expect(result[0].licenseName).toBe("Adobe Creative Cloud");
	});

	it("filters by searchQuery (licenseNumber)", () => {
		const licenses = [
			createLicense({ $id: "1", licenseNumber: "ABC-123" }),
			createLicense({ $id: "2", licenseNumber: "XYZ-789" }),
		];
		const result = applyLicenseFilters(licenses, { searchQuery: "ABC" });
		expect(result).toHaveLength(1);
		expect(result[0].licenseNumber).toBe("ABC-123");
	});

	it("filters by searchQuery (vendor and product)", () => {
		const licenses = [
			createLicense({ $id: "1", vendor: "Microsoft", product: "Office" }),
			createLicense({ $id: "2", vendor: "Google", product: "Workspace" }),
		];
		expect(
			applyLicenseFilters(licenses, { searchQuery: "Microsoft" }),
		).toHaveLength(1);
		expect(
			applyLicenseFilters(licenses, { searchQuery: "Office" }),
		).toHaveLength(1);
	});

	it("searchQuery is case-insensitive", () => {
		const licenses = [
			createLicense({ $id: "1", licenseName: "Adobe Creative" }),
		];
		expect(
			applyLicenseFilters(licenses, { searchQuery: "adobe" }),
		).toHaveLength(1);
		expect(
			applyLicenseFilters(licenses, { searchQuery: "CREATIVE" }),
		).toHaveLength(1);
	});

	it("filters by department (division and department)", () => {
		const licenses = [
			createLicense({ $id: "1", department: "IT" }),
			createLicense({ $id: "2", department: "IT" }),
			createLicense({ $id: "3", department: "Finance" }),
		];
		const result = applyLicenseFilters(licenses, { department: "IT" });
		expect(result).toHaveLength(2);
	});

	it("filters by assignedTo (partial match)", () => {
		const licenses = [
			createLicense({
				$id: "1",
				assignedManagers: ["Alice Smith", "Bob Jones"],
			}),
			createLicense({ $id: "2", assignedManagers: ["Carol White"] }),
		];
		const result = applyLicenseFilters(licenses, { assignedTo: "Alice" });
		expect(result).toHaveLength(1);
		expect(result[0].assignedManagers).toContain("Alice Smith");
	});

	it("assignedTo is case-insensitive", () => {
		const licenses = [
			createLicense({ $id: "1", assignedManagers: ["Alice Smith"] }),
		];
		expect(applyLicenseFilters(licenses, { assignedTo: "alice" })).toHaveLength(
			1,
		);
	});

	it("filters by issueDateFrom", () => {
		const licenses = [
			createLicense({ $id: "1", issueDate: "2024-06-01" }),
			createLicense({ $id: "2", issueDate: "2024-01-01" }),
		];
		const result = applyLicenseFilters(licenses, {
			issueDateFrom: new Date("2024-03-01"),
		});
		expect(result).toHaveLength(1);
		expect(result[0].issueDate).toBe("2024-06-01");
	});

	it("filters by issueDateTo", () => {
		const licenses = [
			createLicense({ $id: "1", issueDate: "2024-01-01" }),
			createLicense({ $id: "2", issueDate: "2024-06-01" }),
		];
		const result = applyLicenseFilters(licenses, {
			issueDateTo: new Date("2024-03-01"),
		});
		expect(result).toHaveLength(1);
		expect(result[0].issueDate).toBe("2024-01-01");
	});

	it("filters by expiryDateFrom and expiryDateTo", () => {
		const licenses = [
			createLicense({ $id: "1", licenseExpiryDate: "2025-06-30" }),
			createLicense({ $id: "2", licenseExpiryDate: "2024-12-31" }),
			createLicense({ $id: "3", licenseExpiryDate: "2026-01-01" }),
		];
		const result = applyLicenseFilters(licenses, {
			expiryDateFrom: new Date("2025-01-01"),
			expiryDateTo: new Date("2025-12-31"),
		});
		expect(result).toHaveLength(1);
		expect(result[0].licenseExpiryDate).toBe("2025-06-30");
	});

	it("excludes licenses with no issueDate when issue date filter is set", () => {
		const licenses = [
			createLicense({ $id: "1", issueDate: "2024-01-01" }),
			createLicense({ $id: "2", issueDate: "" } as License),
		];
		const result = applyLicenseFilters(licenses, {
			issueDateFrom: new Date("2024-01-01"),
		});
		expect(result).toHaveLength(1);
	});

	it("combines multiple filters", () => {
		const licenses = [
			createLicense({
				$id: "1",
				status: "active",
				licenseType: "subscription",
				licenseName: "Adobe CC",
			}),
			createLicense({
				$id: "2",
				status: "active",
				licenseType: "perpetual",
				licenseName: "Office",
			}),
			createLicense({
				$id: "3",
				status: "inactive",
				licenseType: "subscription",
				licenseName: "Slack",
			}),
		];
		const result = applyLicenseFilters(licenses, {
			status: "active",
			licenseType: "subscription",
			searchQuery: "Adobe",
		});
		expect(result).toHaveLength(1);
		expect(result[0].licenseName).toBe("Adobe CC");
	});

	it("returns empty array when no license matches", () => {
		const licenses = [createLicense({ $id: "1", status: "active" })];
		const result = applyLicenseFilters(licenses, { status: "expired" });
		expect(result).toHaveLength(0);
	});
});
