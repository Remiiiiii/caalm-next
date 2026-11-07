import { describe, expect, it } from "vitest";
import { appwriteConfig } from "@/lib/appwrite/config";

/** Alphanumeric Appwrite $id only — no underscores/hyphens (appwrite-collection-ids.mdc). */
const ALPHANUMERIC_ID = /^[a-zA-Z0-9]{1,36}$/;

describe("Production Tools roadmap Appwrite IDs", () => {
	it("uses alphanumeric table ids (not snake_case names)", () => {
		expect(appwriteConfig.ptoRoadmapSectionsCollectionId).toMatch(
			ALPHANUMERIC_ID,
		);
		expect(appwriteConfig.ptoRoadmapTasksCollectionId).toMatch(ALPHANUMERIC_ID);
		expect(appwriteConfig.ptoRoadmapTestRunsCollectionId).toMatch(
			ALPHANUMERIC_ID,
		);
		expect(appwriteConfig.ptoRoadmapStatusLogCollectionId).toMatch(
			ALPHANUMERIC_ID,
		);
	});
});
