import { describe, expect, it } from "vitest";
import {
	groupFilesByDepartment,
	UNFILED_DEPARTMENT,
} from "@/lib/files/folder-groups";
import type { UIFileDoc } from "@/types/files";

function file(overrides: Partial<UIFileDoc>): UIFileDoc {
	return {
		$id: "1",
		$createdAt: "2025-01-01T00:00:00.000Z",
		$updatedAt: "2025-01-01T00:00:00.000Z",
		$collectionId: "c",
		$databaseId: "d",
		$permissions: [],
		type: "document",
		extension: "pdf",
		url: "https://example.com/f.pdf",
		name: "file.pdf",
		size: 1,
		owner: "Jane Doe",
		users: [],
		...overrides,
	} as UIFileDoc;
}

describe("groupFilesByDepartment", () => {
	it("groups files by department and counts them", () => {
		const groups = groupFilesByDepartment([
			file({ $id: "1", department: "Accounting" }),
			file({ $id: "2", department: "Accounting" }),
			file({ $id: "3", department: "Fiscal" }),
		]);
		const accounting = groups.find((g) => g.department === "Accounting");
		expect(accounting?.count).toBe(2);
		expect(groups.find((g) => g.department === "Fiscal")?.count).toBe(1);
	});

	it("buckets files with no department under Unfiled, sorted last", () => {
		const groups = groupFilesByDepartment([
			file({ $id: "1", department: undefined }),
			file({ $id: "2", department: "Accounting" }),
		]);
		expect(groups.at(-1)?.department).toBe(UNFILED_DEPARTMENT);
		expect(groups.find((g) => g.department === UNFILED_DEPARTMENT)?.count).toBe(
			1,
		);
	});

	it("surfaces the most recently modified file's timestamp and owner", () => {
		const groups = groupFilesByDepartment([
			file({
				$id: "1",
				department: "Accounting",
				$updatedAt: "2025-01-01T00:00:00.000Z",
				owner: "Jane Doe",
			}),
			file({
				$id: "2",
				department: "Accounting",
				$updatedAt: "2025-06-01T00:00:00.000Z",
				owner: "Mike Williams",
			}),
		]);
		const accounting = groups.find((g) => g.department === "Accounting");
		expect(accounting?.lastModifiedAt).toBe("2025-06-01T00:00:00.000Z");
		expect(accounting?.lastModifiedBy).toBe("Mike Williams");
	});

	it("sorts named departments alphabetically", () => {
		const groups = groupFilesByDepartment([
			file({ $id: "1", department: "Personnel" }),
			file({ $id: "2", department: "Accounting" }),
			file({ $id: "3", department: "Administrative" }),
		]);
		expect(groups.map((g) => g.department)).toEqual([
			"Accounting",
			"Administrative",
			"Personnel",
		]);
	});

	it("returns an empty list for no files", () => {
		expect(groupFilesByDepartment([])).toEqual([]);
	});
});
