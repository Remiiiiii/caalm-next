/**
 * Default Organization Seed
 * Creates the default organization for existing data migration
 */

import { createOrganization } from '@/lib/rbac/organizations';
import { getOrganization } from '@/lib/rbac/organizations';

const DEFAULT_ORG_ID = 'default_organization';
const DEFAULT_ORG_NAME = 'Default Organization';

/**
 * Create or get default organization
 */
export async function getOrCreateDefaultOrganization(createdBy: string) {
  // Try to get existing default organization
  const existing = await getOrganization(DEFAULT_ORG_ID);
  
  if (existing) {
    console.log('Default organization already exists');
    return existing;
  }

  // Create default organization
  console.log('Creating default organization...');
  const org = await createOrganization({
    name: DEFAULT_ORG_NAME,
    subscriptionTier: 'pro',
    status: 'active',
    settings: {
      maxUsers: 1000,
      maxDepartments: 100,
      features: ['all'],
    },
    createdBy,
  });

  console.log(`✓ Created default organization: ${org.$id}`);
  return org;
}

