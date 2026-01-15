/**
 * IT Dashboard Navigation Configuration
 * Defines all navigation items for IT/Software Engineering staff portal
 */

import { PERMISSIONS } from './permissions';
import type { PermissionKey } from './permissions';

export interface ITSidebarItem {
  name: string;
  icon: string;
  url: string;
  permission?: PermissionKey;
  subItems?: ITSidebarItem[];
}

export interface ITSidebarSection {
  header: string;
  items: ITSidebarItem[];
}

/**
 * IT Dashboard Navigation Structure
 * Organized by functional areas with permission-based access control
 */
export const IT_NAVIGATION: ITSidebarSection[] = [
  {
    header: 'Dashboard',
    items: [
      {
        name: 'Dashboard',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/it',
      },
    ],
  },
  {
    header: 'System Overview',
    items: [
      {
        name: 'System Overview',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/it/system-overview',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
      {
        name: 'Storage Metrics',
        icon: '/assets/icons/database.svg',
        url: '/dashboard/it/storage',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
    ],
  },
  {
    header: 'Monitoring & Observability',
    items: [
      {
        name: 'API Analytics',
        icon: '/assets/icons/analytics.svg',
        url: '/dashboard/it/monitoring/api-analytics',
        permission: PERMISSIONS.IT.VIEW_ANALYTICS,
      },
      {
        name: 'Rate Limit Monitoring',
        icon: '/assets/icons/shield.svg',
        url: '/dashboard/it/rate-limits',
        permission: PERMISSIONS.IT.VIEW_RATE_LIMITS,
      },
      {
        name: 'System Health',
        icon: '/assets/icons/dashboard.svg',
        url: '/dashboard/it/monitoring/system-health',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
      {
        name: 'Performance Metrics',
        icon: '/assets/icons/analytics.svg',
        url: '/dashboard/it/monitoring/performance',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
      {
        name: 'Error Logs',
        icon: '/assets/icons/alert-triangle.svg',
        url: '/dashboard/it/monitoring/errors',
        permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
      },
      {
        name: 'Infrastructure Monitoring',
        icon: '/assets/icons/server.svg',
        url: '/dashboard/it/monitoring/infrastructure',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
      {
        name: 'Network Monitoring',
        icon: '/assets/icons/network.svg',
        url: '/dashboard/it/monitoring/network',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
      {
        name: 'Application Monitoring',
        icon: '/assets/icons/app.svg',
        url: '/dashboard/it/monitoring/application',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
    ],
  },
  {
    header: 'CI/CD & Deployments',
    items: [
      {
        name: 'Pipeline Status',
        icon: '/assets/icons/git-branch.svg',
        url: '/dashboard/it/cicd/pipelines',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
      {
        name: 'Build History',
        icon: '/assets/icons/build.svg',
        url: '/dashboard/it/cicd/builds',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
      {
        name: 'Deployment Tracking',
        icon: '/assets/icons/rocket.svg',
        url: '/dashboard/it/cicd/deployments',
        permission: PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
      },
      {
        name: 'Release Management',
        icon: '/assets/icons/tag.svg',
        url: '/dashboard/it/cicd/releases',
        permission: PERMISSIONS.IT.MANAGE_DEPLOYMENTS,
      },
      {
        name: 'Code Quality',
        icon: '/assets/icons/check-circle.svg',
        url: '/dashboard/it/cicd/quality',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
    ],
  },
  {
    header: 'Development Tools',
    items: [
      {
        name: 'Repository Management',
        icon: '/assets/icons/git.svg',
        url: '/dashboard/it/development/repositories',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
      {
        name: 'Issue Tracking',
        icon: '/assets/icons/ticket.svg',
        url: '/dashboard/it/development/issues',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
      {
        name: 'Code Analysis',
        icon: '/assets/icons/search.svg',
        url: '/dashboard/it/development/code-analysis',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
    ],
  },
  {
    header: 'API Management',
    items: [
      {
        name: 'API Documentation',
        icon: '/assets/icons/book.svg',
        url: '/dashboard/it/api/documentation',
        permission: PERMISSIONS.IT.MANAGE_API_KEYS,
      },
      {
        name: 'API Usage Statistics',
        icon: '/assets/icons/analytics.svg',
        url: '/dashboard/it/api/usage',
        permission: PERMISSIONS.IT.VIEW_ANALYTICS,
      },
      {
        name: 'API Gateway',
        icon: '/assets/icons/server.svg',
        url: '/dashboard/it/api/gateway',
        permission: PERMISSIONS.IT.MANAGE_API_KEYS,
      },
    ],
  },
  {
    header: 'Security & Compliance',
    items: [
      {
        name: 'Security Dashboard',
        icon: '/assets/icons/shield.svg',
        url: '/dashboard/it/security/dashboard',
        permission: PERMISSIONS.IT.VIEW_SECURITY,
      },
      {
        name: 'Audit Logs',
        icon: '/assets/icons/audit-logs.svg',
        url: '/dashboard/it/security/audit-logs',
        permission: PERMISSIONS.AUDIT.VIEW,
      },
      {
        name: 'Compliance Status',
        icon: '/assets/icons/compliance-status.svg',
        url: '/dashboard/it/security/compliance',
        permission: PERMISSIONS.IT.VIEW_SECURITY,
      },
      {
        name: 'Access Control',
        icon: '/assets/icons/lock.svg',
        url: '/dashboard/it/security/access-control',
        permission: PERMISSIONS.IT.VIEW_SECURITY,
      },
      {
        name: 'Incident Response',
        icon: '/assets/icons/alert-triangle.svg',
        url: '/dashboard/it/security/incident-response',
        permission: PERMISSIONS.IT.VIEW_INCIDENTS,
      },
    ],
  },
  {
    header: 'Database Administration',
    items: [
      {
        name: 'Database Performance',
        icon: '/assets/icons/database.svg',
        url: '/dashboard/it/database/performance',
        permission: PERMISSIONS.IT.MANAGE_DATABASE,
      },
      {
        name: 'Database Health',
        icon: '/assets/icons/activity.svg',
        url: '/dashboard/it/database/health',
        permission: PERMISSIONS.IT.MANAGE_DATABASE,
      },
      {
        name: 'Schema Management',
        icon: '/assets/icons/layers.svg',
        url: '/dashboard/it/database/schema',
        permission: PERMISSIONS.IT.MANAGE_DATABASE,
      },
      {
        name: 'Query Analytics',
        icon: '/assets/icons/search.svg',
        url: '/dashboard/it/database/queries',
        permission: PERMISSIONS.IT.MANAGE_DATABASE,
      },
    ],
  },
  {
    header: 'Logs & Analytics',
    items: [
      {
        name: 'Log Aggregation',
        icon: '/assets/icons/file-text.svg',
        url: '/dashboard/it/logs/aggregation',
        permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
      },
      {
        name: 'Log Analysis',
        icon: '/assets/icons/search.svg',
        url: '/dashboard/it/logs/analysis',
        permission: PERMISSIONS.IT.VIEW_SYSTEM_LOGS,
      },
      {
        name: 'Trace Monitoring',
        icon: '/assets/icons/activity.svg',
        url: '/dashboard/it/logs/traces',
        permission: PERMISSIONS.IT.VIEW_MONITORING,
      },
    ],
  },
  {
    header: 'Incident Management',
    items: [
      {
        name: 'Active Incidents',
        icon: '/assets/icons/alert-circle.svg',
        url: '/dashboard/it/incidents/active',
        permission: PERMISSIONS.IT.VIEW_INCIDENTS,
      },
      {
        name: 'Incident History',
        icon: '/assets/icons/history.svg',
        url: '/dashboard/it/incidents/history',
        permission: PERMISSIONS.IT.VIEW_INCIDENTS,
      },
      {
        name: 'On-Call Schedule',
        icon: '/assets/icons/calendar.svg',
        url: '/dashboard/it/incidents/on-call',
        permission: PERMISSIONS.IT.VIEW_INCIDENTS,
      },
      {
        name: 'Post-Mortems',
        icon: '/assets/icons/file-text.svg',
        url: '/dashboard/it/incidents/post-mortems',
        permission: PERMISSIONS.IT.VIEW_INCIDENTS,
      },
    ],
  },
  {
    header: 'Team & User Management',
    items: [
      {
        name: 'IT Staff Directory',
        icon: '/assets/icons/users.svg',
        url: '/dashboard/it/team/directory',
        permission: PERMISSIONS.USERS.VIEW,
      },
      {
        name: 'User Roles',
        icon: '/assets/icons/user-management.svg',
        url: '/dashboard/it/team/roles',
        permission: PERMISSIONS.USERS.ASSIGN_ROLES,
      },
      {
        name: 'Department Assignments',
        icon: '/assets/icons/department.svg',
        url: '/dashboard/it/team/departments',
        permission: PERMISSIONS.USERS.VIEW,
      },
      {
        name: 'Performance Metrics',
        icon: '/assets/icons/trending-up.svg',
        url: '/dashboard/it/team/performance',
        permission: PERMISSIONS.USERS.VIEW,
      },
    ],
  },
  {
    header: 'Configuration & Settings',
    items: [
      {
        name: 'System Configuration',
        icon: '/assets/icons/settings.svg',
        url: '/dashboard/it/settings/system',
        permission: PERMISSIONS.SETTINGS.VIEW,
      },
      {
        name: 'Integration Management',
        icon: '/assets/icons/plug.svg',
        url: '/dashboard/it/settings/integrations',
        permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
      },
      {
        name: 'Notification Settings',
        icon: '/assets/icons/bell.svg',
        url: '/dashboard/it/settings/notifications',
        permission: PERMISSIONS.SETTINGS.VIEW,
      },
      {
        name: 'Backup & Recovery',
        icon: '/assets/icons/database.svg',
        url: '/dashboard/it/settings/backup',
        permission: PERMISSIONS.IT.MANAGE_DATABASE,
      },
    ],
  },
  {
    header: 'Automation & DevOps',
    items: [
      {
        name: 'Job Scheduler',
        icon: '/assets/icons/clock.svg',
        url: '/dashboard/it/automation/jobs',
        permission: PERMISSIONS.IT.MANAGE_CI_CD,
      },
    ],
  },
];

/**
 * Filter navigation items based on user permissions
 */
export function filterITNavigationByPermissions(
  navigation: ITSidebarSection[],
  userPermissions: PermissionKey[]
): ITSidebarSection[] {
  return navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        // If no permission required, always show
        if (!item.permission) {
          return true;
        }

        // Check if user has the required permission
        const hasPermission = userPermissions.includes(item.permission);

        // Also filter sub-items if they exist
        if (item.subItems) {
          item.subItems = item.subItems.filter((subItem) => {
            if (!subItem.permission) {
              return true;
            }
            return userPermissions.includes(subItem.permission);
          });
        }

        return hasPermission;
      }),
    }))
    .filter((section) => section.items.length > 0); // Remove empty sections
}
