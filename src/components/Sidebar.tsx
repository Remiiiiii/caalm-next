'use client';

import Link from 'next/link';
import React, { Fragment } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/avatar';
import { usePathname, useRouter } from 'next/navigation';
import { useAnalyticsPrefetch } from '@/hooks/useAnalyticsPrefetch';

interface Props {
  fullName: string;
  avatar: string;
  email: string;
  role: 'executive' | 'admin' | 'manager';
  division?: string;
}

const Sidebar = ({ fullName, avatar, email, role, division }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const { prefetchDepartmentAnalytics } = useAnalyticsPrefetch();
  // Map database division values to sidebar division values
  const mapDivisionToSidebar = (dbDivision?: string): string | undefined => {
    if (!dbDivision) return undefined;

    const divisionMap: Record<string, string> = {
      childwelfare: 'child-welfare',
      behavioralhealth: 'behavioral-health',
      clinic: 'clinic',
      residential: 'residential',
      'cins-fins-snap': 'cfs',
      administration: 'administration',
      'c-suite': 'c-suite',
      managerial: 'management',
      finance: 'finance',
      operations: 'operations',
    };

    return divisionMap[dbDivision] || dbDivision;
  };

  const mappedDivision = mapDivisionToSidebar(division);

  // Map database division to route division for direct linking
  const mapDatabaseToRouteDivision = (dbDivision: string): string => {
    const mapping: Record<string, string> = {
      childwelfare: 'child-welfare',
      behavioralhealth: 'behavioral-health',
      'cins-fins-snap': 'cfs',
      administration: 'administration',
      residential: 'residential',
      clinic: 'clinic',
    };
    return mapping[dbDivision] || dbDivision;
  };

  const groupedNav = [
    {
      header: 'Dashboard',
      items: [
        {
          name: 'Executive',
          icon: '/assets/icons/dashboard.svg',
          url: '/dashboard/executive',
          roles: ['executive'],
        },
        {
          name: 'Manager',
          icon: '/assets/icons/dashboard.svg',
          url: '/dashboard/manager',
          roles: ['manager', 'executive'],
        },
        {
          name: 'Admin',
          icon: '/assets/icons/dashboard.svg',
          url: '/dashboard/admin',
          roles: ['admin', 'executive'],
        },
      ],
    },
    {
      header: 'Contracts',
      items: [
        {
          name: 'All Contracts',
          icon: '/assets/icons/documents.svg',
          url: '/contracts',
          roles: ['executive', 'admin'],
        },
        {
          name: 'My Contracts',
          icon: '/assets/icons/documents.svg',
          url: '/my-contracts',
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Proposals & Approvals',
          icon: '/assets/icons/edit.svg',
          url: '/contracts/approvals',
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Advanced Resources',
          icon: '/assets/icons/search.svg',
          url: '/contracts/advanced-resources',
          roles: ['executive', 'admin'],
        },
      ],
    },
    {
      header: 'Licenses',
      items: [
        {
          name: 'All Licenses',
          icon: '/assets/icons/documents.svg',
          url: '/licenses',
          roles: ['executive', 'admin'],
        },
        {
          name: 'Department Licenses',
          icon: '/assets/icons/department.svg',
          url: '/licenses/department',
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Proposals & Approvals',
          icon: '/assets/icons/edit.svg',
          url: '/licenses/approvals',
          roles: ['executive', 'manager'],
        },
      ],
    },
    {
      header: 'Documents',
      items: [
        {
          name: 'Uploads',
          icon: '/assets/icons/uploads.svg',
          url: '/uploads', // This should match the [type] param
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Images',
          icon: '/assets/icons/images.svg',
          url: '/images',
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Media',
          icon: '/assets/icons/media.svg',
          url: '/media',
          roles: ['executive', 'manager', 'admin'],
        },
        {
          name: 'Others',
          icon: '/assets/icons/others.svg',
          url: '/others',
          roles: ['executive', 'manager', 'admin'],
        },
      ],
    },
    {
      header: 'Audits',
      items: [
        {
          name: 'Training & Certifications',
          icon: '/assets/icons/calendar.svg',
          url: '/audits/training',
          roles: ['admin', 'executive'],
        },
        {
          name: 'Audit Logs',
          icon: '/assets/icons/documents.svg',
          url: '/audits/audit',
          roles: ['executive'],
        },
        {
          name: 'Compliance Status',
          icon: '/assets/icons/file-check.svg',
          url: '/audits/status',
          roles: ['executive', 'manager'],
        },
      ],
    },
    {
      header: 'Team',
      items: [
        {
          name: 'User Management',
          icon: '/assets/icons/users.svg',
          url: '/dashboard/user-management',
          roles: ['executive'],
        },
        {
          name: 'Assign Tasks',
          icon: '/assets/icons/task.svg',
          url: '/team/tasks',
          roles: ['manager', 'executive'],
        },
      ],
    },
    {
      header: 'Reports & Analytics',
      items: [
        // For executives, show main analytics page
        ...(role === 'executive'
          ? [
              {
                name: 'All Analytics',
                icon: '/assets/icons/chart.svg',
                url: '/analytics',
                roles: ['executive'],
              },
            ]
          : []),
        // For admins, show administration analytics
        ...(role === 'admin'
          ? [
              {
                name: 'Administration',
                icon: '/assets/icons/chart.svg',
                url: '/analytics/administration',
                roles: ['admin'],
              },
            ]
          : []),
        // For managers, show their department analytics
        ...(role === 'manager' && division
          ? [
              {
                name: mapDatabaseToRouteDivision(division)
                  .split('-')
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' '),
                icon: '/assets/icons/chart.svg',
                url: `/analytics/${mapDatabaseToRouteDivision(division)}`,
                roles: ['manager'],
              },
            ]
          : []),
        // For executives, show all department options
        ...(role === 'executive'
          ? [
              {
                name: 'Administration',
                icon: '/assets/icons/chart.svg',
                url: '/analytics/administration',
                roles: ['executive'],
              },
              {
                name: 'Operations',
                roles: ['executive'],
                subItems: [
                  {
                    name: 'CFS',
                    division: 'cins-fins-snap',
                    url: '/analytics/cfs',
                    roles: ['executive'],
                  },
                  {
                    name: 'Behavioral Health',
                    division: 'behavioralhealth',
                    url: '/analytics/behavioral-health',
                    roles: ['executive'],
                  },
                  {
                    name: 'Child Welfare',
                    division: 'childwelfare',
                    url: '/analytics/child-welfare',
                    roles: ['executive'],
                  },
                  {
                    name: 'Clinic',
                    division: 'clinic',
                    url: '/analytics/clinic',
                    roles: ['executive'],
                  },
                  {
                    name: 'Residential',
                    division: 'residential',
                    url: '/analytics/residential',
                    roles: ['executive'],
                  },
                ],
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <aside className="sidebar">
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
      <nav className="sidebar-nav">
        <ul className="flex flex-1 flex-col">
          {groupedNav.map((section) => {
            // Custom dashboard logic: Executives see all dashboards, others see only their own
            let sectionItems;
            if (section.header === 'Dashboard') {
              if (role === 'executive') {
                // Executives see all dashboard links
                sectionItems = section.items;
              } else {
                // Other roles see only their own dashboard
                sectionItems = section.items.filter((item) =>
                  item.roles.includes(role)
                );
              }
            } else {
              // For non-dashboard sections, filter by role
              sectionItems = section.items.filter((item) =>
                item.roles.includes(role)
              );

              // For managers, filter subitems based on their department
              if (
                role === 'manager' &&
                section.header === 'Reports & Analytics'
              ) {
                sectionItems = sectionItems.map((item) => {
                  if (item.subItems && mappedDivision) {
                    // Filter subitems to only show the manager's department
                    const filteredSubItems = item.subItems.filter(
                      (subItem) => subItem.division === mappedDivision
                    );
                    return {
                      ...item,
                      subItems: filteredSubItems,
                    };
                  }
                  return item;
                });
              }
            }
            if (sectionItems.length === 0) return null;
            // Bracket/curve and icon design for all sections
            return (
              <div key={section.header} className="mb-4">
                <li
                  className={cn(
                    'sidebar-section-header mb-0 sidebar-gradient-text lg:mb-1 font-bold text-lg lg:text-xl'
                  )}
                >
                  <span className="flex items-center gap-2">
                    {section.header === 'Dashboard' ? (
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
                    ) : null}
                    <span className="font-bold text-base text-slate-700">
                      {section.header}
                    </span>
                  </span>
                </li>
                <div className="relative ml-3">
                  <ul className="flex flex-col gap-1 relative z-10">
                    {sectionItems.map(({ url, name, subItems }, index) => (
                      <Fragment key={name}>
                        <li className="relative flex items-center">
                          {/* Main vertical line for all sections */}
                          {index < sectionItems.length + 1 && (
                            <span
                              className="absolute left-0 top-0 h-[24px] w-4 border-l border-[#BFBFBF]"
                              style={{ zIndex: 0 }}
                            ></span>
                          )}
                          <span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
                          <Link
                            href={url || ''}
                            className="ml-4 lg:w-full flex items-start gap-3"
                            onMouseEnter={() => {
                              // Prefetch analytics data on hover for better performance
                              if (url?.includes('/analytics')) {
                                router.prefetch(url);
                                // Extract department from URL for analytics prefetching
                                const departmentMatch = url.match(
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
                            {/* Render only the corresponding icon for each item, no generic icon */}
                            {section.header === 'Dashboard' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="department"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'All Analytics' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/analytics.svg"
                                  alt="all-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'All Contracts' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/all-contracts.svg"
                                  alt="all-contracts"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Advanced Resources' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/resources.svg"
                                  alt="resources"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'My Contracts' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="department"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Proposals & Approvals' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/proposal-approval.svg"
                                  alt="proposal-approval"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'All Licenses' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/licenses.svg"
                                  alt="all-licenses"
                                  width={25}
                                  height={25}
                                />
                              </span>
                            )}
                            {name === 'Department Licenses' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="all-licenses"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Uploads' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/uploads.svg"
                                  alt="upload"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Images' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/images.svg"
                                  alt="images"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Media' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/media.svg"
                                  alt="video"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Others' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/others.svg"
                                  alt="others"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Compliance Status' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/compliance-status.svg"
                                  alt="compliance-status"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Audit Logs' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/audit-logs.svg"
                                  alt="audit-logs"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'User Management' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/user-management.svg"
                                  alt="team"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {/* Reports & Analytics */}
                            {name === 'Administration' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'C-Suite' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Management' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Assign Tasks' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/task.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Child Welfare' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Behavioral Health' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Residential' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'CFS' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Clinic' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/department.svg"
                                  alt="reports-analytics"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            {name === 'Training & Certifications' && (
                              <span className="gap-1">
                                <Image
                                  src="/assets/icons/training-cert.svg"
                                  alt="training-cert"
                                  width={20}
                                  height={20}
                                />
                              </span>
                            )}
                            <p
                              className={`text-sm text-slate-900 px-2 tabs-underline font-medium ${
                                name === 'Administration' ? '-ml-[1px]' : ''
                              }`}
                              data-state={
                                pathname &&
                                url &&
                                (pathname === url ||
                                  pathname.startsWith(`${url}/`))
                                  ? 'active'
                                  : undefined
                              }
                            >
                              {name}
                            </p>
                          </Link>
                        </li>
                        {subItems && (
                          <div className="relative ml-12">
                            <span
                              className="absolute left-0 top-0 h-full w-4 border-l border-[#BFBFBF]"
                              style={{ zIndex: 0 }}
                            ></span>
                            {subItems.map((subItem) => (
                              <li
                                key={subItem.name}
                                className="relative flex items-center"
                              >
                                <span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
                                <Link
                                  href={subItem.url}
                                  className="ml-4 lg:w-full flex items-start gap-3 tabs-underline"
                                  onMouseEnter={() => {
                                    // Prefetch analytics data on hover for better performance
                                    if (subItem.url?.includes('/analytics')) {
                                      router.prefetch(subItem.url);
                                      // Extract department from URL for analytics prefetching
                                      const departmentMatch = subItem.url.match(
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
                                  <span className="gap-1">
                                    <Image
                                      src="/assets/icons/department.svg"
                                      alt="department"
                                      width={20}
                                      height={20}
                                    />
                                  </span>
                                  <p
                                    className="text-sm text-slate-900 font-medium"
                                    data-state={
                                      pathname &&
                                      (pathname === subItem.url ||
                                        pathname.startsWith(`${subItem.url}/`))
                                        ? 'active'
                                        : undefined
                                    }
                                  >
                                    {subItem.name}
                                  </p>
                                </Link>
                              </li>
                            ))}
                          </div>
                        )}
                      </Fragment>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </ul>
      </nav>
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
            name={fullName}
            userId={email}
            size="lg"
            className="sidebar-user-avatar"
          />
        )}
        <div className="hidden lg:block">
          <p className="subtitle-2 capitalize">{fullName}</p>
          <p className="caption">{email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
