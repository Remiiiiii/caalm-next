/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 2 batch 1: API permission coverage
 */
export const PRD_BATCH_S02_B1 = {
  sectionNumber: 2,
  sectionTitle: "API permission coverage",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s02-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "2.1", title: "Protect file upload and download" },
    { taskCode: "2.2", title: "Protect analytics and reporting APIs" },
    { taskCode: "2.3", title: "Protect assistant and legacy AI routes" },
    { taskCode: "2.4", title: "Retire duplicate contract pipeline routes" },
    { taskCode: "2.5", title: "CI ratchet on the unguarded list" },
  ],
} as const;
