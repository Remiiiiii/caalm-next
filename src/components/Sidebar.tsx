'use client';

import Link from 'next/link';
import React from 'react';
import Image from 'next/image';
import { navItems } from '../../constants';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Props {
  fullName: string;
  avatar: string;
  email: string;
  role: 'executive' | 'hr' | 'manager';
}

const Sidebar = ({ fullName, avatar, email }: Props) => {
  const pathname = usePathname();
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
        <ul className="flex flex-1 flex-col gap-6">
          {navItems.map(({ url, name, icon }) => {
            // Support both string and array for url
            const urls = Array.isArray(url) ? url : [url];
            const isActive = urls.some(
              (u) => pathname === u || pathname.startsWith(u + '/')
            );
            return (
              <li
                key={name}
                className={cn('sidebar-nav-item', isActive && 'shad-active')}
              >
                <Link
                  href={urls[0]}
                  className="lg:w-full flex items-center gap-3"
                >
                  <Image
                    src={icon}
                    alt={name}
                    width={24}
                    height={24}
                    className={cn('nav-icon', isActive && 'nav-icon-active')}
                  />
                  <p className="hidden lg:block">{name}</p>
                </Link>
              </li>
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
