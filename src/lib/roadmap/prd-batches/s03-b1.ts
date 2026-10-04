/**
 * Platform Readiness batch ticket — implement all tasks on this PR branch.
 * Section 3 batch 1: Trustworthy sign-in and two-factor
 */
export const PRD_BATCH_S03_B1 = {
  sectionNumber: 3,
  sectionTitle: "Trustworthy sign-in and two-factor",
  batch: 1,
  markerPath: "src/lib/roadmap/prd-batches/s03-b1.ts",
  batchTicket: true,
  tasks: [
    { taskCode: "3.1", title: "Session-bound two-factor setup" },
    { taskCode: "3.2", title: "Remove test-only 2FA from production" },
    { taskCode: "3.3", title: "Audit log on session revoke" },
    { taskCode: "3.4", title: "Audit log on password and 2FA reset" },
  ],
} as const;
