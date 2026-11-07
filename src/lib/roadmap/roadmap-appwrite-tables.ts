import { appwriteConfig } from "@/lib/appwrite/config";
import type { RoadmapCatalogKey } from "./catalog-key";

export type RoadmapAppwriteTableIds = {
	sectionsTableId: string | undefined;
	tasksTableId: string | undefined;
	testRunsTableId: string | undefined;
	statusLogTableId: string | undefined;
};

/**
 * Per-catalog Appwrite table IDs — same schema, separate tables.
 * taskCode and sectionNumber are unique per table, so catalogs must not share.
 */
export function roadmapAppwriteTableIds(
	catalogKey: RoadmapCatalogKey,
): RoadmapAppwriteTableIds {
	if (catalogKey === "npo") {
		return {
			sectionsTableId: appwriteConfig.npoRoadmapSectionsCollectionId,
			tasksTableId: appwriteConfig.npoRoadmapTasksCollectionId,
			testRunsTableId: appwriteConfig.npoRoadmapTestRunsCollectionId,
			statusLogTableId: appwriteConfig.npoRoadmapStatusLogCollectionId,
		};
	}
	if (catalogKey === "prd") {
		return {
			sectionsTableId: appwriteConfig.prdRoadmapSectionsCollectionId,
			tasksTableId: appwriteConfig.prdRoadmapTasksCollectionId,
			testRunsTableId: appwriteConfig.prdRoadmapTestRunsCollectionId,
			statusLogTableId: appwriteConfig.prdRoadmapStatusLogCollectionId,
		};
	}
	if (catalogKey === "pto") {
		return {
			sectionsTableId: appwriteConfig.ptoRoadmapSectionsCollectionId,
			tasksTableId: appwriteConfig.ptoRoadmapTasksCollectionId,
			testRunsTableId: appwriteConfig.ptoRoadmapTestRunsCollectionId,
			statusLogTableId: appwriteConfig.ptoRoadmapStatusLogCollectionId,
		};
	}
	return {
		sectionsTableId: appwriteConfig.roadmapSectionsCollectionId,
		tasksTableId: appwriteConfig.roadmapTasksCollectionId,
		testRunsTableId: appwriteConfig.roadmapTestRunsCollectionId,
		statusLogTableId: appwriteConfig.roadmapStatusLogCollectionId,
	};
}
