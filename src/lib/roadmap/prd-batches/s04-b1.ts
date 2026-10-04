/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 4 batch 1: Honest dashboards and compliance views
 */
export const PRD_BATCH_S04_B1 = {
  sectionNumber: 4,
  sectionTitle: "Honest dashboards and compliance views",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s04-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "4.1", title: "Real audit data by default in production" },
    { taskCode: "4.2", title: "Label or replace sample analytics widgets" },
    { taskCode: "4.3", title: "Fix or hide the unified analytics API for customers" },
    { taskCode: "4.4", title: "Compliance tab honesty" },
  ],
} as const;
