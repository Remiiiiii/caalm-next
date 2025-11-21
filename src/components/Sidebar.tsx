'use client';

import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { useAnalyticsPrefetch } from '@/hooks/useAnalyticsPrefetch';
import {
  NAVIGATION_CONFIG,
  mapDatabaseToRouteDivision,
} from '@/constants/navigation';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRoles } from '@/hooks/useUserRoles';
import {
  PERMISSION_BASED_NAV,
  hasNavigationPermission,
  type NavigationItem,
} from '@/constants/navigation-permissions';
import { PERMISSIONS } from '@/constants/permissions';
import type { PermissionKey } from '@/constants/permissions';
import { Crown, Building2, Building, Eye, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  name?: string;
  avatar?: string;
  email: string;
  role?: string; // Legacy role for backward compatibility
  division?: string;
}

const Sidebar = ({ name, avatar, email, role, division }: Props) => {
  const performHardRefresh = () => {
    window.location.href = window.location.href;
  };

  // Function for button click
  const handleButtonClick = () => {
    handleKeyDown(
      new KeyboardEvent('keydown', { ctrlKey: true, shiftKey: true, key: 'R' })
    );
  };

  // Function for keyboard shortcut
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      performHardRefresh();
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const router = useRouter();
  const pathname = usePathname();
  const { prefetchDepartmentAnalytics } = useAnalyticsPrefetch();
  const { permissions, loading: permissionsLoading } = usePermissions();
  const { roles: userRoles, loading: rolesLoading } = useUserRoles();

  // Memoize viewer check and primary role to avoid unnecessary recalculations
  const { isViewer, primaryRole } = useMemo(() => {
    if (userRoles.length === 0) {
      return { isViewer: false, primaryRole: null };
    }
    const viewerRole = userRoles.find((r) => r.roleName === 'Viewer');
    return {
      isViewer: !!viewerRole,
      primaryRole: userRoles[0]?.roleName || null,
    };
  }, [userRoles]);

  // Get role badge icon component
  // const getRoleBadgeIcon = (roleName: string | null) => {
  //   if (!roleName) return null;
  //   const iconProps = { className: 'h-4 w-4', 'aria-hidden': true };
  //   switch (roleName) {
  //     case 'Super Admin':
  //       return <Crown {...iconProps} className="h-4 w-4 text-yellow-500" />;
  //     case 'Organization Admin':
  //       return <Building2 {...iconProps} className="h-4 w-4 text-blue-500" />;
  //     case 'Department Manager':
  //       return <Building {...iconProps} className="h-4 w-4 text-green-500" />;
  //     case 'Viewer':
  //       return <Eye {...iconProps} className="h-4 w-4 text-gray-500" />;
  //     default:
  //       return null;
  //   }
  // };

  // Map database division values to sidebar division values
  const mapDivisionToSidebar = (dbDivision?: string): string | undefined => {
    if (!dbDivision) return undefined;

    const divisionMap: Record<string, string> = {
      'child-welfare': 'child-welfare',
      'behavioral-health': 'behavioral-health',
      clinic: 'clinic',
      residential: 'residential',
      cfs: 'cfs',
      hr: 'hr',
      'c-suite': 'c-suite',
      managerial: 'management',
      finance: 'finance',
      operations: 'operations',
    };

    return divisionMap[dbDivision] || dbDivision;
  };

  const mappedDivision = mapDivisionToSidebar(division);

  // Memoize lock check function to avoid recreating on every render
  const shouldShowLock = useMemo(
    () =>
      (item: NavigationItem): boolean => {
        if (!item.requiresElevated) return false;
        // Show lock if requires elevated permission and user doesn't have it
        return !hasNavigationPermission(permissions, item);
      },
    [permissions]
  );

  // Build navigation based on permissions
  const groupedNav = useMemo(() => {
    if (permissionsLoading || rolesLoading) {
      return [];
    }

    const nav: typeof PERMISSION_BASED_NAV = [];

    // Dashboard section - dynamically generate based on user's actual roles
    const dashboardItems: Array<{
      name: string;
      icon: string;
      url: string;
      permissions: PermissionKey[];
    }> = [];

    // Map role names to dashboard URLs
    const roleToDashboardMap: Record<
      string,
      { url: string; permissions: PermissionKey[] }
    > = {
      'Super Admin': {
        url: '/dashboard/superadmin',
        permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
      },
      'Organization Admin': {
        url: '/dashboard/organizationadmin',
        permissions: [PERMISSIONS.USERS.VIEW, PERMISSIONS.SETTINGS.VIEW],
      },
      'Department Manager': {
        url: '/dashboard/departmentmanager',
        permissions: [
          PERMISSIONS.CALENDAR.VIEW_TEAM,
          PERMISSIONS.CONTRACTS.VIEW,
        ],
      },
      Viewer: {
        url: '/dashboard/viewer',
        permissions: [
          PERMISSIONS.CALENDAR.VIEW_OWN,
          PERMISSIONS.CONTRACTS.VIEW,
        ],
      },
    };

    // Generate dashboard items from user's actual roles
    const seenUrls = new Set<string>();
    userRoles.forEach((userRole) => {
      if (userRole.roleName) {
        const dashboardConfig = roleToDashboardMap[userRole.roleName];
        if (dashboardConfig && !seenUrls.has(dashboardConfig.url)) {
          // Check if user has required permissions
          const hasAccess = dashboardConfig.permissions.some((perm) =>
            permissions.includes(perm)
          );

          if (hasAccess) {
            seenUrls.add(dashboardConfig.url);
            dashboardItems.push({
              name: userRole.roleName,
              icon: '/assets/icons/dashboard.svg',
              url: dashboardConfig.url,
              permissions: dashboardConfig.permissions,
            });
          }
        }
      }
    });

    // Fallback: if no roles found, use permission-based access (for backward compatibility)
    if (dashboardItems.length === 0 && !rolesLoading) {
      const fallbackDashboardItems =
        PERMISSION_BASED_NAV.find((s) => s.header === 'Dashboard')?.items || [];
      const accessibleDashboards = fallbackDashboardItems.filter((item) =>
        hasNavigationPermission(permissions, item)
      );

      // Replace hardcoded names with generic "Dashboard" if needed
      accessibleDashboards.forEach((item) => {
        if (!seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          dashboardItems.push(item);
        }
      });
    }

    if (dashboardItems.length > 0) {
      nav.push({
        header: 'Dashboard',
        items: dashboardItems,
      });
    }

    // Helper function to filter items based on role visibility
    const filterItemsByRole = (items: NavigationItem[]): NavigationItem[] => {
      return items.filter((item) => {
        // Check if item should be hidden for user's role
        if (item.hiddenForRoles && primaryRole) {
          if (item.hiddenForRoles.includes(primaryRole)) {
            return false;
          }
        }
        return true;
      });
    };

    // Calendar section
    const calendarItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Calendar')?.items || [];
    const accessibleCalendar = filterItemsByRole(
      calendarItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleCalendar.length > 0) {
      nav.push({
        header: 'Calendar',
        items: accessibleCalendar,
      });
    }

    // Contracts section
    const contractItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Contracts')?.items || [];
    const accessibleContracts = filterItemsByRole(
      contractItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleContracts.length > 0) {
      nav.push({
        header: 'Contracts',
        items: accessibleContracts,
      });
    }

    // Licenses section
    const licenseItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Licenses')?.items || [];
    const accessibleLicenses = filterItemsByRole(
      licenseItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleLicenses.length > 0) {
      nav.push({
        header: 'Licenses',
        items: accessibleLicenses,
      });
    }

    // Documents section
    const documentItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Documents')?.items || [];
    const accessibleDocuments = filterItemsByRole(
      documentItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleDocuments.length > 0) {
      nav.push({
        header: 'Documents',
        items: accessibleDocuments,
      });
    }

    // Audits section
    const auditItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Audits')?.items || [];
    const accessibleAudits = filterItemsByRole(
      auditItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleAudits.length > 0) {
      nav.push({
        header: 'Audits',
        items: accessibleAudits,
      });
    }

    // Team section
    const teamItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Team')?.items || [];
    const accessibleTeam = filterItemsByRole(
      teamItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleTeam.length > 0) {
      nav.push({
        header: 'Team',
        items: accessibleTeam,
      });
    }

    // Reports & Analytics section
    const analyticsItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Reports & Analytics')
        ?.items || [];
    const accessibleAnalytics = filterItemsByRole(
      analyticsItems.filter((item) =>
        hasNavigationPermission(permissions, item)
      )
    );

    if (accessibleAnalytics.length > 0) {
      nav.push({
        header: 'Reports & Analytics',
        items: accessibleAnalytics,
      });
    }

    // Settings section
    const settingsItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'Settings')?.items || [];
    const accessibleSettings = filterItemsByRole(
      settingsItems.filter((item) => hasNavigationPermission(permissions, item))
    );

    if (accessibleSettings.length > 0) {
      nav.push({
        header: 'Settings',
        items: accessibleSettings,
      });
    }

    // My Roles & Permissions section
    const permissionsItems =
      PERMISSION_BASED_NAV.find((s) => s.header === 'My Roles & Permissions')
        ?.items || [];
    const accessiblePermissions = permissionsItems.filter((item) =>
      hasNavigationPermission(permissions, item)
    );

    if (accessiblePermissions.length > 0) {
      nav.push({
        header: 'My Roles & Permissions',
        items: accessiblePermissions,
      });
    }

    return nav;
  }, [
    permissions,
    permissionsLoading,
    division,
    userRoles,
    rolesLoading,
    primaryRole,
  ]);

  return (
    <aside className="sidebar">
      <div className="flex items-center justify-between mb-4">
        <Link href="/">
          <Image
            src="/assets/images/logo.svg"
            alt="logo"
            width={50}
            height={50}
            className="hidden h-auto lg:block"
          />
          <Image
            src="/assets/images/logo.svg"
            alt="logo"
            width={50}
            height={50}
            className="lg:hidden"
          />
        </Link>

        {/* Hard Refresh Button */}
        <button
          onClick={handleButtonClick}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white transition-colors duration-200 shadow-md hover:shadow-lg"
          title="Hard Refresh (Ctrl+Shift+R)"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </button>
      </div>
      <nav className="sidebar-nav">
        <ul className="flex flex-1 flex-col">
          {permissionsLoading || rolesLoading ? (
            <li className="text-center py-8 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></div>
                <span className="text-sm">Loading navigation...</span>
              </div>
            </li>
          ) : groupedNav.length === 0 ? (
            <li className="text-center py-8 text-muted-foreground">
              No navigation items available
            </li>
          ) : (
            groupedNav.map((section) => {
              if (section.items.length === 0) return null;

              return (
                <div key={section.header} className="mb-4">
                  <li
                    className={cn(
                      'sidebar-section-header mb-0 lg:mb-1 font-bold text-lg lg:text-xl'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {section.header === 'Dashboard' ? (
                        <span className="flex items-center gap-2">
                          <span className="text-[#03AFBF]">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 26 26"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M10.5167 2.16602H3.74582C2.87467 2.16602 2.16602 2.87467 2.16602 3.74582V7.80832C2.16602 8.67964 2.87467 9.38829 3.74582 9.38829H10.5167C11.388 9.38829 12.0966 8.67964 12.0966 7.80832V3.74582C12.0966 2.87467 11.388 2.16602 10.5167 2.16602ZM10.5167 11.1937H3.74582C2.87467 11.1937 2.16602 11.9024 2.16602 12.7737V22.2529C2.16602 23.124 2.87467 23.8327 3.74582 23.8327H10.5167C11.388 23.8327 12.0966 23.124 12.0966 22.2529V12.7737C12.0966 11.9024 11.388 11.1937 10.5167 11.1937ZM22.2529 16.6104H15.482C14.6107 16.6104 13.9021 17.3191 13.9021 18.1904V22.2529C13.9021 23.124 14.6107 23.8327 15.482 23.8327H22.2529C23.124 23.8327 23.8327 23.124 23.8327 22.2529V18.1904C23.8327 17.3191 23.124 16.6104 22.2529 16.6104ZM22.2529 2.16602H15.482C14.6107 2.16602 13.9021 2.87467 13.9021 3.74582V13.225C13.9021 14.0963 14.6107 14.805 15.482 14.805H22.2529C23.124 14.805 23.8327 14.0963 23.8327 13.225V3.74582C23.8327 2.87467 23.124 2.16602 22.2529 2.16602Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          {primaryRole && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {/* <span className="flex items-center">
                                    {getRoleBadgeIcon(primaryRole)}
                                  </span> */}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    You have {permissions.length} permissions as{' '}
                                    {primaryRole}. View details →
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </span>
                      ) : section.header === 'Calendar' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/calendar2.svg"
                            alt="calendar"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Contracts' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/contracts.svg"
                            alt="contracts"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Licenses' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/license.svg"
                            alt="license"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Documents' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/documents.svg"
                            alt="documents"
                            width={20}
                            height={20}
                          />
                        </span>
                      ) : section.header === 'Audits' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/audit.svg"
                            alt="audits"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Team' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/team.svg"
                            alt="team"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Reports & Analytics' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/reports-analytics.svg"
                            alt="reports-analytics"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'Settings' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/settings.svg"
                            alt="settings"
                            width={24}
                            height={24}
                          />
                        </span>
                      ) : section.header === 'My Roles & Permissions' ? (
                        <span className="text-[#03AFBF]">
                          <Image
                            src="/assets/icons/shield.svg"
                            alt="permissions"
                            width={22}
                            height={22}
                          />
                        </span>
                      ) : null}
                      <span className="font-bold text-base sidebar-gradient-text relative z-10">
                        {section.header}
                      </span>
                    </span>
                  </li>
                  <div className="relative ml-3">
                    <ul className="flex flex-col gap-1 relative z-10">
                      {section.items.map((item, index) => (
                        <Fragment
                          key={`${section.header}-${item.name}-${
                            item.url || index
                          }`}
                        >
                          <li className="relative flex items-center">
                            {/* Main vertical line for all sections */}
                            {index < section.items.length + 1 && (
                              <span
                                className="absolute left-0 top-0 h-[24px] w-4 border-l border-[#BFBFBF]"
                                style={{ zIndex: 0 }}
                              ></span>
                            )}
                            <span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
                            <Link
                              href={item.url || ''}
                              className="ml-4 lg:w-full flex items-start"
                              onMouseEnter={() => {
                                // Prefetch analytics data on hover for better performance
                                if (item.url?.includes('/analytics')) {
                                  router.prefetch(item.url);
                                  // Extract department from URL for analytics prefetching
                                  const departmentMatch = item.url.match(
                                    /\/analytics\/([^\/]+)/
                                  );
                                  if (departmentMatch) {
                                    prefetchDepartmentAnalytics(
                                      departmentMatch[1]
                                    );
                                  }
                                }
                              }}
                            >
                              {/* Render icons based on item name - Role badges for Dashboard items */}
                              {section.header === 'Dashboard' && (
                                <span className="gap-1s">
                                  {item.name === 'Super Admin' && (
                                    <Crown className="h-5 w-5 text-yellow-500" />
                                  )}
                                  {item.name === 'Organization Admin' && (
                                    <Building2 className="h-5 w-5 text-blue-500" />
                                  )}
                                  {item.name === 'Department Manager' && (
                                    <Building className="h-5 w-5 text-green-500" />
                                  )}
                                  {item.name === 'Viewer' && (
                                    <Eye className="h-5 w-5 text-gray-500" />
                                  )}
                                </span>
                              )}
                              {/* {item.name === 'Quick View' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/analytics.svg"
                                    alt="analytics"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )} */}
                              {item.name === 'All Contracts' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/all-contracts.svg"
                                    alt="all-contracts"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'My Contracts' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/my-contracts.svg"
                                    alt="all-contracts"
                                    width={20}
                                    height={18}
                                  />
                                </span>
                              )}
                              {item.name === 'Advanced Resources' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/resources.svg"
                                    alt="resources"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Proposals & Approvals' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/proposal-approval.svg"
                                    alt="proposal-approval"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'All Licenses' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/licenses.svg"
                                    alt="all-licenses"
                                    width={25}
                                    height={25}
                                  />
                                </span>
                              )}
                              {item.name === 'Department Licenses' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/dept-license.svg"
                                    alt="all-licenses"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Uploads' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/uploads.svg"
                                    alt="upload"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Images' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/images.svg"
                                    alt="images"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Media' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/media.svg"
                                    alt="video"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Others' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/others.svg"
                                    alt="others"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Compliance Status' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/compliance-status.svg"
                                    alt="compliance-status"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Audit Logs' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/audit-logs.svg"
                                    alt="audit-logs"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'User Management' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/user-management.svg"
                                    alt="team"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Role Management' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/user-management2.svg"
                                    alt="roles"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Calendar View' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/calendar3.svg"
                                    alt="calendar"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Training & Certifications' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/training-cert.svg"
                                    alt="training-cert"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {item.name === 'Assign Tasks' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/task.svg"
                                    alt="tasks"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {/* Reports & Analytics icons */}
                              {(item.name === 'Overview' ||
                                item.name === 'Quick View' ||
                                item.name === 'C Suite' ||
                                item.name === 'C-Suite') && (
                                // item.name === 'Management' ||
                                // item.name === 'Child Welfare' ||
                                // item.name === 'Behavioral Health' ||
                                // item.name === 'Residential' ||
                                // item.name === 'CFS' ||
                                // item.name === 'Clinic') && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/analytics.svg"
                                    alt="reports-analytics"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {/* Settings icons */}
                              {(item.name === 'System Settings' ||
                                item.name === 'Organization Settings' ||
                                item.name === 'Billing & Integrations') && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/settings2.svg"
                                    alt="settings"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {/* My Roles & Permissions icons */}
                              {item.name === 'View My Access' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/key.svg"
                                    alt="permissions"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              {/* System Audit Logs icon */}
                              {item.name === 'System Audit Logs' && (
                                <span className="gap-1">
                                  <Image
                                    src="/assets/icons/audit-logs.svg"
                                    alt="audit-logs"
                                    width={20}
                                    height={20}
                                  />
                                </span>
                              )}
                              <p
                                className={`text-sm text-slate-900 px-2 tabs-underline font-medium flex items-center gap-2 ${
                                  item.name === 'Admin' ? '-ml-[1px]' : ''
                                } ${
                                  isViewer && item.viewerReadOnly
                                    ? 'opacity-75'
                                    : ''
                                }`}
                                data-state={
                                  pathname &&
                                  item.url &&
                                  (pathname === item.url ||
                                    (pathname.startsWith(`${item.url}/`) &&
                                      item.url !== '/analytics'))
                                    ? 'active'
                                    : undefined
                                }
                              >
                                <span>{item.name}</span>
                                {shouldShowLock(item) && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center">
                                          <Lock className="h-3 w-3 text-gray-500" />
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          This feature requires{' '}
                                          {item.permissions
                                            .map((p) => p.split('.').pop())
                                            .join(' or ')}{' '}
                                          permission. Contact your administrator
                                          to request access.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {isViewer && item.viewerReadOnly && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center text-xs text-gray-500">
                                          (read-only)
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          You have read-only access as an
                                          External Auditor. You cannot modify
                                          this data.
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </p>
                            </Link>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
          )}
        </ul>
      </nav>
      {/* Settings link - only show if Settings section is not in nav */}
      {!groupedNav.some((s) => s.header === 'Settings') && (
        <Link href="/settings">
          <div className="flex items-center gap-2 mt-8">
            <Image
              src="/assets/icons/settings.svg"
              alt="logo"
              width={25}
              height={25}
              className="cursor-pointer"
              priority
            />
            <span className="font-bold text-base sidebar-gradient-text">
              Settings
            </span>
          </div>
        </Link>
      )}
      <div className="sidebar-user-info">
        {avatar ? (
          <Image
            src={avatar}
            alt="avatar"
            width={44}
            height={44}
            className="sidebar-user-avatar"
          />
        ) : (
          <Avatar
            name={name}
            userId={email}
            size="lg"
            className="sidebar-user-avatar"
          />
        )}
        <div className="hidden lg:block">
          <p className="subtitle-2 capitalize">{name || 'User'}</p>
          <p className="caption">{email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
