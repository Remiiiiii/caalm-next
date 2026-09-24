import { appwriteConfig } from "@/lib/appwrite/config";
import type { RoadmapCatalogKey } from "./catalog-key";

export type RoadmapAppwriteTableIds = {
	sectionsTableId: string | undefined;
	tasksTableId: string | undefined;
	testRunsTableId: string | undefined;
	statusLogTableId: string | undefined;
};

/** CLM vs NPO roadmap table IDs — same schema, separate tables (taskCode unique per catalog). */
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
	return {
		sectionsTableId: appwriteConfig.roadmapSectionsCollectionId,
		tasksTableId: appwriteConfig.roadmapTasksCollectionId,
		testRunsTableId: appwriteConfig.roadmapTestRunsCollectionId,
		statusLogTableId: appwriteConfig.roadmapStatusLogCollectionId,
	};
}
