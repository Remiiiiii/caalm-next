'use client';

import React from 'react';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { Models } from 'appwrite';

interface ClientLayoutProps {
  user: Models.User<Models.Preferences>;
  children: React.ReactNode;
}

const ClientLayout = ({ user, children }: ClientLayoutProps) => {
  return <AuthenticatedLayout user={user}>{children}</AuthenticatedLayout>;
};

export default ClientLayout;
