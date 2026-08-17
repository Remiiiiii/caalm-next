/**
 * Appwrite collection schemas for Audit Readiness V1.
 * Create in Console with the alphanumeric $ids below (name = human label).
 *
 * Collection $id: 66ea192923722f767a74  name: audit_readiness_snapshots
 * - orgId (string, required, indexed)
 * - cadence (enum: weekly|monthly|quarterly, required, indexed)
 * - score (integer, optional)
 * - ragStatus (string, optional)
 * - timezone (string, required)
 * - payload (string, required, size 1_000_000)
 * - aiSummary (string, optional, size 20_000)
 *
 * Collection $id: 3cfb1121431b22b684e3  name: audit_evidence_map
 * - segment (string, required, indexed)
 * - auditType (string, required, indexed)
 * - requirementId (string, required, indexed)
 * - label (string, required)
 * - evidenceType (string, required)
 * - caalmModule (string, required)
 * - inV1 (boolean, required, indexed)
 * - notes (string, optional)
 *
 * Org settings JSON keys (no new org attributes required):
 * - timezone (IANA string, default America/New_York)
 * - websiteUrl (public site URL for bounded crawl)
 */

export const AUDIT_READINESS_SCHEMA_VERSION = 1;
