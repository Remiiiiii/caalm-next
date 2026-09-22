"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function NonprofitRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Nonprofit Roadmap"
			subtitle="Interactive plan engine — A section completes only when every catalog PR merges to main with green tests. This board is not the PR log."
			progressLabel="Overall nonprofit buildout"
			overviewPath="/api/roadmap/overview?catalog=npo"
		/>
	);
}
