'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import OrganizationSelector from '@/components/OrganizationSelector';

export default function TestSWRPage() {
  const { orgId } = useOrganization();
  const {
    stats,
    files,
    invitations,
    authUsers,
    isLoading,
    statsLoading,
    filesLoading,
    invitationsLoading,
    authUsersLoading,
    refreshAll,
  } = useDashboardData(orgId || 'default_organization');

  return (
    <OrganizationProvider>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">SWR Implementation Test</h1>
          <div className="flex items-center gap-4">
            <OrganizationSelector />
            <Button onClick={refreshAll} disabled={isLoading}>
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Stats Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Dashboard Stats
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(stats, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Files Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Files ({files?.length || 0})
              {filesLoading ? (
                <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filesLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : files && files.length > 0 ? (
              <div className="space-y-2">
                {files.slice(0, 5).map((file: Record<string, unknown>) => (
                  <div key={file.$id} className="p-2 bg-gray-50 rounded">
                    {file.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No files found</p>
            )}
          </CardContent>
        </Card>

        {/* Invitations Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Pending Invitations ({invitations?.length || 0})
              {invitationsLoading ? (
                <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitationsLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : invitations && invitations.length > 0 ? (
              <div className="space-y-2">
                {invitations.slice(0, 5).map((inv: Record<string, unknown>) => (
                  <div key={inv.$id} className="p-2 bg-gray-50 rounded">
                    {inv.email} - {inv.role}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No pending invitations</p>
            )}
          </CardContent>
        </Card>

        {/* Auth Users Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Authenticated Users ({authUsers?.length || 0})
              {authUsersLoading ? (
                <div className="animate-pulse bg-gray-200 h-4 w-4 rounded"></div>
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {authUsersLoading ? (
              <div className="animate-pulse space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : authUsers && authUsers.length > 0 ? (
              <div className="space-y-2">
                {authUsers.slice(0, 5).map((user: Record<string, unknown>) => (
                  <div key={user.$id} className="p-2 bg-gray-50 rounded">
                    {user.email} - {user.fullName}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No authenticated users found</p>
            )}
          </CardContent>
        </Card>

        {/* Error Display */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              If you see loading states that never resolve, check that the API
              endpoints are working:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1">
              <li>• /api/dashboard/stats?orgId={orgId}</li>
              <li>• /api/dashboard/files?limit=10</li>
              <li>• /api/dashboard/invitations?orgId={orgId}</li>
              <li>• /api/dashboard/auth-users</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </OrganizationProvider>
  );
}
