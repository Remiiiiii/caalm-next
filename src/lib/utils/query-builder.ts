/**
 * Query Builder Utilities
 * Helper functions for building organization-aware queries
 */

import { Query } from 'node-appwrite';

/**
 * Build query with organization filter
 * Automatically adds orgId filter to queries
 */
export function buildOrgQuery(orgId: string, ...queries: any[]) {
  return [
    Query.equal('orgId', orgId),
    ...queries,
  ];
}

/**
 * Build query for listing rows with organization filter
 */
export function buildOrgListQuery(
  orgId: string,
  options: {
    limit?: number;
    offset?: number;
    orderBy?: string;
    orderDesc?: string;
  } = {}
) {
  const queries: any[] = [Query.equal('orgId', orgId)];

  if (options.limit) {
    queries.push(Query.limit(options.limit));
  }

  if (options.offset) {
    queries.push(Query.offset(options.offset));
  }

  if (options.orderBy) {
    queries.push(Query.orderAsc(options.orderBy));
  }

  if (options.orderDesc) {
    queries.push(Query.orderDesc(options.orderDesc));
  }

  return queries;
}

