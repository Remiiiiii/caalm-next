'use client';

import React from 'react';
import Image from 'next/image';

const groupedNav = [
  {
    header: 'Dashboard',
    items: [
      {
        name: 'Executive',
        icon: '/assets/icons/department.svg',
      },
      {
        name: 'Manager',
        icon: '/assets/icons/department.svg',
      },
      {
        name: 'Admin',
        icon: '/assets/icons/department.svg',
      },
    ],
  },
  {
    header: 'Contracts',
    items: [
      {
        name: 'All Contracts',
        icon: '/assets/icons/all-contracts.svg',
      },
      {
        name: 'My Contracts',
        icon: '/assets/icons/department.svg',
      },
      {
        name: 'Proposals & Approvals',
        icon: '/assets/icons/proposal-approval.svg',
      },
      {
        name: 'Advanced Resources',
        icon: '/assets/icons/resources.svg',
      },
    ],
  },
  {
    header: 'Licenses',
    items: [
      {
        name: 'All Licenses',
        icon: '/assets/icons/licenses.svg',
      },
      {
        name: 'Department Licenses',
        icon: '/assets/icons/department.svg',
      },
      {
        name: 'Proposals & Approvals',
        icon: '/assets/icons/proposal-approval.svg',
      },
    ],
  },
  {
    header: 'Documents',
    items: [
      {
        name: 'Uploads',
        icon: '/assets/icons/uploads.svg',
      },
      {
        name: 'Images',
        icon: '/assets/icons/images.svg',
      },
      {
        name: 'Media',
        icon: '/assets/icons/media.svg',
      },
      {
        name: 'Others',
        icon: '/assets/icons/others.svg',
      },
    ],
  },
  {
    header: 'Audits',
    items: [
      {
        name: 'Training & Certifications',
        icon: '/assets/icons/training-cert.svg',
      },
      {
        name: 'Audit Logs',
        icon: '/assets/icons/audit-logs.svg',
      },
      {
        name: 'Compliance Status',
        icon: '/assets/icons/compliance-status.svg',
      },
    ],
  },
  {
    header: 'Team',
    items: [
      {
        name: 'User Management',
        icon: '/assets/icons/user-management.svg',
      },
      {
        name: 'Assign Tasks',
        icon: '/assets/icons/task.svg',
      },
    ],
  },
  {
    header: 'Reports & Analytics',
    items: [
      {
        name: 'Overview',
        icon: '/assets/icons/analytics.svg',
      },
      {
        name: 'Quick View',
        icon: '/assets/icons/analytics.svg',
      },
      {
        name: 'Management',
        icon: '/assets/icons/department.svg',
        subItems: [
          {
            name: 'CFS',
            icon: '/assets/icons/department.svg',
          },
          {
            name: 'Behavioral Health',
            icon: '/assets/icons/department.svg',
          },
          {
            name: 'Child Welfare',
            icon: '/assets/icons/department.svg',
          },
          {
            name: 'Clinic',
            icon: '/assets/icons/department.svg',
          },
          {
            name: 'Residential',
            icon: '/assets/icons/department.svg',
          },
        ],
      },
    ],
  },
];

const NavigationSidebar = () => {
  return (
    <nav className="w-36">
      <ul className="flex flex-1 flex-col">
        {groupedNav.map((section) => (
          <div key={section.header} className="mb-4">
            <li className="mb-0 font-bold text-lg sidebar-gradient-text">
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
                {section.items.map(({ name, icon, subItems }, index) => (
                  <React.Fragment key={name}>
                    <li className="relative flex items-center">
                      {/* Main vertical line for all sections */}
                      {index < section.items.length + 1 && (
                        <span
                          className="absolute left-0 top-0 h-[24px] w-4 border-l border-[#BFBFBF]"
                          style={{ zIndex: 0 }}
                        ></span>
                      )}
                      <span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
                      <div className="ml-4 w-full flex items-start gap-3">
                        <span className="gap-1 flex items-center">
                          <Image src={icon} alt={name} width={20} height={20} />
                          <p className="text-sm text-slate-900 px-2 tabs-underline font-medium whitespace-nowrap">
                            {name}
                          </p>
                        </span>
                      </div>
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
                            <div className="ml-4 w-full flex items-start gap-3">
                              <span className="gap-1 flex items-center">
                                <Image
                                  src={subItem.icon}
                                  alt={subItem.name}
                                  width={20}
                                  height={20}
                                />
                                <p className="text-sm text-slate-900 font-medium whitespace-nowrap">
                                  {subItem.name}
                                </p>
                              </span>
                            </div>
                          </li>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </ul>
      {/* Settings Section */}
      <div className="flex items-center gap-2 mt-8">
        <Image
          src="/assets/icons/settings.svg"
          alt="settings"
          width={25}
          height={25}
          className="cursor-pointer"
        />
        <span className="font-bold text-base sidebar-gradient-text">
          Settings
        </span>
      </div>
    </nav>
  );
};

export default NavigationSidebar;
