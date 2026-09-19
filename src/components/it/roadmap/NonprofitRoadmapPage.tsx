"use client";

import { ClmRoadmapPage } from "@/components/it/roadmap/ClmRoadmapPage";

export function NonprofitRoadmapPage() {
	return (
		<ClmRoadmapPage
			title="Nonprofit Roadmap"
			subtitle="Development project for donor, gift, volunteer, and restricted-fund work. Each later task is its own PR. This board is not the PR log."
			progressLabel="Overall nonprofit buildout"
			overviewPath="/api/roadmap/overview?catalog=npo"
		/>
	);
}
