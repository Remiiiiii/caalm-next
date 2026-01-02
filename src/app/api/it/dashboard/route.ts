/**
 * IT Dashboard API Endpoint
 * Returns system health, alerts, and quick stats for IT dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireITRole } from '@/lib/auth/it-guards';

export async function GET(request: NextRequest) {
  // Verify IT role
  const roleCheck = await requireITRole(request);
  if (roleCheck) return roleCheck;

  try {
    // Mock data for now - replace with actual system metrics later
    const dashboardData = {
      systemHealth: {
        status: 'healthy' as const,
        uptime: 99.9,
        services: [
          {
            name: 'API Server',
            status: 'up' as const,
            responseTime: 45,
          },
          {
            name: 'Database',
            status: 'up' as const,
            responseTime: 12,
          },
          {
            name: 'Cache Server',
            status: 'up' as const,
            responseTime: 8,
          },
        ],
      },
      recentAlerts: [
        {
          id: '1',
          severity: 'info' as const,
          message: 'System backup completed successfully',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          severity: 'warning' as const,
          message: 'High memory usage detected on server 2',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
      ],
      quickStats: {
        apiRequests: 125000,
        deployments: 12,
        activeIncidents: 0,
        systemLoad: 45,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error('[IT Dashboard API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch IT dashboard data',
      },
      { status: 500 }
    );
  }
}
