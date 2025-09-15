'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Shield, User, Bell, CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useUserRole } from '@/hooks/useUserRole';
import TwoFactorSetup from '@/components/settings/TwoFactorSetup';
import ProfileSettings from '@/components/settings/ProfileSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';

const SettingsPage = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/3 mb-4"></div>
          <div className="h-4 bg-white/20 rounded-xl w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-64 bg-white/20 rounded-xl backdrop-blur"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/20 backdrop-blur border border-white/40 hover:bg-white/30 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-blue-500 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="h1 text-navy">Settings</h1>
              <p className="body-1 text-light-200">
                Manage your account and security preferences
              </p>
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="text-sm bg-white/20 backdrop-blur border border-white/40"
        >
          {role?.toUpperCase()}
        </Badge>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Settings */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 text-navy flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSettings />
          </CardContent>
        </Card>

        {/* Two-Factor Authentication */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 text-navy flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TwoFactorSetup />
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 text-navy flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
          </CardContent>
        </Card>

        {/* Security Overview */}
        <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
          <CardHeader>
            <CardTitle className="h3 text-navy flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">Email Verification</span>
              <CheckCircle className="h-4 w-4 text-[#03AEBF]" />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-700">
                Two-Factor Authentication
              </span>
              <CheckCircle className="h-4 w-4 text-[#03AEBF]" />
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-200">Last Login</span>
              <span className="text-sm text-light-200">Today, 2:30 PM</span>
            </div>
            <Separator className="bg-white/20" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-light-200">Account Status</span>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
