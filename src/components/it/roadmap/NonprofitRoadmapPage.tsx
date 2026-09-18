"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function NonprofitRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Nonprofit Completion Roadmap"
			subtitle="Close the donor, gift, volunteer, and restricted-fund gap. Each task is its own PR; later work stays locked until that PR merges with green tests."
			progressLabel="Overall nonprofit buildout"
			overviewPath="/api/roadmap/overview?catalog=npo"
		/>
	);
}
