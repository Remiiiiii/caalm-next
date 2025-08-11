'use client';

import React from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

// Mock organizations for development/testing
const MOCK_ORGANIZATIONS = [
  { id: 'default_organization', name: 'Default Organization' },
  { id: 'test_org_1', name: 'Test Organization 1' },
  { id: 'test_org_2', name: 'Test Organization 2' },
  { id: 'demo_org', name: 'Demo Organization' },
];

const OrganizationSelector = () => {
  const { orgId, setOrgId } = useOrganization();

  const handleOrgChange = (newOrgId: string) => {
    setOrgId(newOrgId);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
      <Building2 className="h-4 w-4 text-gray-600" />
      <span className="text-sm text-gray-600">Organization:</span>
      <Select
        value={orgId || 'default_organization'}
        onValueChange={handleOrgChange}
      >
        <SelectTrigger className="w-48 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MOCK_ORGANIZATIONS.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default OrganizationSelector;
