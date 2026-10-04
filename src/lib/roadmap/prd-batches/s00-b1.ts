/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 0 batch 1: Platform Readiness Roadmap Engine
 */
export const PRD_BATCH_S00_B1 = {
  sectionNumber: 0,
  sectionTitle: "Platform Readiness Roadmap Engine",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s00-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "0.1", title: "Third catalog in the roadmap engine" },
    { taskCode: "0.2", title: "Sequential unlock for readiness work" },
    { taskCode: "0.3", title: "IT Development board page" },
    { taskCode: "0.4", title: "PRD branch and title matching" },
  ],
} as const;
