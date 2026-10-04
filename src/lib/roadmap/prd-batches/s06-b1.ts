/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 6 batch 1: Enterprise buyer honesty
 */
export const PRD_BATCH_S06_B1 = {
  sectionNumber: 6,
  sectionTitle: "Enterprise buyer honesty",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s06-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "6.1", title: "Integrations panel matches reality" },
    { taskCode: "6.2", title: "Security questionnaire starter" },
    { taskCode: "6.3", title: "Handoff to CLM API and SSO sections" },
    { taskCode: "6.4", title: "Buyer demo script update" },
  ],
} as const;
