'use client';

import Link from 'next/link';
import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface Props {
  fullName: string;
  avatar: string;
  email: string;
  role: 'executive' | 'hr' | 'manager';
}

const Sidebar = ({ fullName, avatar, email, role }: Props) => {
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
          roles: ['manager'],
        },
        {
          name: 'HR',
          icon: '/assets/icons/dashboard.svg',
          url: '/dashboard/hr',
          roles: ['hr'],
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
          roles: ['executive', 'manager', 'hr'],
        },
        {
          name: 'My Department Contracts',
          icon: '/assets/icons/documents.svg',
          url: '/contracts/department',
          roles: ['manager', 'hr'],
        },
        {
          name: 'Proposals & Approvals',
          icon: '/assets/icons/edit.svg',
          url: '/contracts/approvals',
          roles: ['executive', 'manager'],
        },
      ],
    },
    {
      header: 'Documents',
      items: [
        {
          name: 'Uploads',
          icon: '/assets/icons/upload.svg',
          url: '/documents',
          roles: ['executive', 'manager', 'hr'],
        },
        {
          name: 'Images',
          icon: '/assets/icons/images.svg',
          url: '/images',
          roles: ['executive', 'manager', 'hr'],
        },
        {
          name: 'Media',
          icon: '/assets/icons/video.svg',
          url: '/media',
          roles: ['executive', 'manager', 'hr'],
        },
        {
          name: 'Others',
          icon: '/assets/icons/others.svg',
          url: '/others',
          roles: ['executive', 'manager', 'hr'],
        },
      ],
    },
    {
      header: 'Compliance',
      items: [
        {
          name: 'Training & Certifications',
          icon: '/assets/icons/calendar.svg',
          url: '/compliance/training',
          roles: ['hr'],
        },
        {
          name: 'Compliance Status',
          icon: '/assets/icons/file-check.svg',
          url: '/compliance/status',
          roles: ['executive', 'manager'],
        },
        {
          name: 'Audit Logs',
          icon: '/assets/icons/documents.svg',
          url: '/compliance/audit',
          roles: ['executive'],
        },
      ],
    },
    {
      header: 'Team',
      items: [
        {
          name: 'User Management',
          icon: '/assets/icons/users.svg',
          url: '/team/users',
          roles: ['executive'],
        },
        {
          name: 'Assign Tasks',
          icon: '/assets/icons/edit.svg',
          url: '/team/tasks',
          roles: ['manager'],
        },
      ],
    },
    {
      header: 'Reports & Analytics',
      items: [
        {
          name: 'Reports & Analytics',
          icon: '/assets/icons/chart.svg',
          url: '/analytics',
          roles: ['executive', 'manager'],
        },
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
                sectionItems = section.items; // Show all dashboard links
              } else {
                sectionItems = section.items.filter((item) =>
                  item.roles.includes(role)
                );
              }
            } else {
              sectionItems = section.items.filter((item) =>
                item.roles.includes(role)
              );
            }
            if (sectionItems.length === 0) return null;
            // Bracket/curve and icon design for all sections
            return (
              <div key={section.header} className="mb-4">
                <li
                  className={cn(
                    'sidebar-section-header  mb-0  lg:mb-1 font-bold text-lg lg:text-xl'
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
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 26 26"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M21.053 4.37004C21.1963 4.59528 20.9508 4.85768 20.6905 4.79852V4.79852C20.1814 4.64685 19.618 4.57102 19.0439 4.57102H15.4477C15.2905 4.57102 15.1425 4.49707 15.048 4.37138L13.7897 2.69685V2.69685C13.6371 2.48066 13.7813 2.16602 14.0459 2.16602H17.0289C18.7199 2.16602 20.2096 3.04431 21.053 4.37004Z"
                            fill="currentColor"
                          />
                          <path
                            d="M21.8177 7.08435C21.3518 6.74852 20.821 6.49935 20.2469 6.35852C19.8569 6.25018 19.456 6.19602 19.0443 6.19602H15.0143C14.386 6.19602 14.3427 6.14185 14.0068 5.69768L12.4902 3.68268C11.786 2.74018 11.2335 2.16602 9.46768 2.16602H6.95435C4.31102 2.16602 2.16602 4.31102 2.16602 6.95435V19.0443C2.16602 21.6877 4.31102 23.8327 6.95435 23.8327H19.0443C21.6877 23.8327 23.8327 21.6877 23.8327 19.0443V10.9843C23.8327 9.37018 23.0418 7.95102 21.8177 7.08435ZM15.5885 17.701H10.3993C9.97685 17.701 9.65185 17.3652 9.65185 16.9427C9.65185 16.531 9.97685 16.1843 10.3993 16.1843H15.5885C16.011 16.1843 16.3468 16.531 16.3468 16.9427C16.3468 17.3652 16.011 17.701 15.5885 17.701Z"
                            fill="currentColor"
                          />
                        </svg>
                      </span>
                    ) : null}
                    <span className="font-bold text-lg lg:text-xl">
                      {section.header}
                    </span>
                  </span>
                </li>
                <div className="relative ml-3">
                  <span
                    className="absolute left-0 top-0 h-full w-4 border-l border-[#BFBFBF]"
                    style={{ zIndex: 0 }}
                  ></span>
                  <ul className="flex flex-col gap-1 relative z-10">
                    {sectionItems.map(({ url, name }) => (
                      <li key={name} className="relative flex items-center">
                        <span className="absolute left-0 top-0 h-4 w-4 border-l border-b border-[#BFBFBF] rounded-bl-xl"></span>
                        <Link
                          href={url}
                          className="ml-4 lg:w-full flex items-start gap-3"
                        >
                          <span className="text-[#BFBFBF]">
                            <svg
                              width="24"
                              height="24"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M12 3C11.2916 2.99895 10.6056 3.24866 10.0636 3.70493C9.52155 4.16119 9.15852 4.79455 9.03874 5.49283C8.91897 6.19111 9.05019 6.90925 9.40916 7.52005C9.76814 8.13085 10.3317 8.5949 11 8.83V11H8.00003C7.20438 11 6.44132 11.3161 5.87871 11.8787C5.3161 12.4413 5.00003 13.2044 5.00003 14V15.17C4.33254 15.4059 3.76994 15.8702 3.41167 16.4808C3.0534 17.0914 2.92254 17.809 3.04222 18.5068C3.16189 19.2046 3.5244 19.8375 4.06566 20.2939C4.60692 20.7502 5.29208 21.0005 6.00003 21.0005C6.70798 21.0005 7.39314 20.7502 7.9344 20.2939C8.47566 19.8375 8.83817 19.2046 8.95784 18.5068C9.07752 17.809 8.94666 17.0914 8.58839 16.4808C8.23012 15.8702 7.66752 15.4059 7.00003 15.17V14C7.00003 13.7348 7.10539 13.4804 7.29292 13.2929C7.48046 13.1054 7.73481 13 8.00003 13H16C16.2652 13 16.5196 13.1054 16.7071 13.2929C16.8947 13.4804 17 13.7348 17 14V15.17C16.3325 15.4059 15.7699 15.8702 15.4117 16.4808C15.0534 17.0914 14.9225 17.809 15.0422 18.5068C15.1619 19.2046 15.5244 19.8375 16.0657 20.2939C16.6069 20.7502 17.2921 21.0005 18 21.0005C18.708 21.0005 19.3931 20.7502 19.9344 20.2939C20.4757 19.8375 20.8382 19.2046 20.9578 18.5068C21.0775 17.809 20.9467 17.0914 20.5884 16.4808C20.2301 15.8702 19.6675 15.4059 19 15.17V14C19 13.2044 18.684 12.4413 18.1214 11.8787C17.5587 11.3161 16.7957 11 16 11H13V8.83C13.6672 8.59385 14.2294 8.12952 14.5874 7.51904C14.9454 6.90855 15.0761 6.19118 14.9565 5.49366C14.8368 4.79614 14.4745 4.16334 13.9335 3.70705C13.3926 3.25076 12.7077 3.00033 12 3Z"
                                fill="currentColor"
                              />
                            </svg>
                          </span>
                          <p className="font-semibold text-slate-700">{name}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </ul>
      </nav>
      <Image
        src="/assets/images/files-2.png"
        alt="logo"
        width={506}
        height={418}
        className="w-full"
        priority
      />
      <div className="sidebar-user-info">
        <Image
          src={avatar}
          alt="avatar"
          width={44}
          height={44}
          className="sidebar-user-avatar"
        />
        <div className="hidden lg:block">
          <p className="subtitle-2 capitalize">{fullName}</p>
          <p className="caption">{email}</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
