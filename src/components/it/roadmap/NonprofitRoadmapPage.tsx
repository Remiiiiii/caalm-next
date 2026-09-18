"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function NonprofitRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Nonprofit Completion Roadmap"
			subtitle="Close the donor, gift, volunteer, and restricted-fund gap — a section completes only when every catalog PR merges to main with green tests."
			progressLabel="Overall nonprofit buildout"
			overviewPath="/api/roadmap/overview?catalog=npo"
		/>
	);
}
