/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 1 batch 1: Workspace data isolation
 */
export const PRD_BATCH_S01_B1 = {
  sectionNumber: 1,
  sectionTitle: "Workspace data isolation",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s01-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "1.1", title: "Org filter on view-all contract lists" },
    { taskCode: "1.2", title: "Org filter on licenses, files, and invites" },
    { taskCode: "1.3", title: "Automated two-org regression tests" },
    { taskCode: "1.4", title: "Sales and support isolation note" },
  ],
} as const;
