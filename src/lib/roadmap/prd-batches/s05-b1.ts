/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 5 batch 1: IT portal credibility
 */
export const PRD_BATCH_S05_B1 = {
  sectionNumber: 5,
  sectionTitle: "IT portal credibility",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s05-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "5.1", title: "Replace or label the IT dashboard API" },
    { taskCode: "5.2", title: "Hide or badge placeholder IT pages" },
    { taskCode: "5.3", title: "Storage and monitoring truth" },
  ],
} as const;
