'use client';

import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NotificationCenterExample() {
  const { toast } = useToast();
  const {
    notifications,
    stats,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    mutate,
  } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      toast({
        title: 'Success',
        description: 'Notification marked as read',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
      toast({
        title: 'Success',
        description: 'Notification deleted',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete notification',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    mutate();
    toast({
      title: 'Refreshing',
      description: 'Notifications are being refreshed',
    });
  };

  if (error) {
    return (
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="text-center">
            <Bell className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Failed to load notifications
            </h3>
            <p className="text-red-600 mb-4">
              {error.message || 'An error occurred while loading notifications'}
            </p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-slate-600" />
              <CardTitle className="text-lg font-bold text-slate-700">
                Notifications
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {stats.total} Total
              </Badge>
              <Badge variant="destructive" className="bg-red-100 text-red-800">
                {stats.unread} Unread
              </Badge>
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications List */}
      <Card className="bg-white/30 backdrop-blur border border-white/40 shadow-lg">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                No notifications
              </h3>
              <p className="text-gray-500">
                You&apos;re all caught up! Check back later for new updates.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Mark All as Read Button */}
              {stats.unread > 0 && (
                <div className="flex justify-end pb-4 border-b border-gray-200">
                  <Button
                    onClick={handleMarkAllAsRead}
                    size="sm"
                    variant="outline"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Mark all as read
                  </Button>
                </div>
              )}

              {/* Notifications */}
              {notifications.map((notification) => (
                <div
                  key={notification.$id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-colors ${
                    notification.read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.read
                          ? 'bg-gray-200 text-gray-600'
                          : 'bg-blue-100 text-blue-600'
                      }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-700 mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>
                            {new Date(
                              notification.createdAt
                            ).toLocaleDateString()}
                          </span>
                          <Badge
                            variant={
                              notification.type === 'error'
                                ? 'destructive'
                                : notification.type === 'warning'
                                ? 'secondary'
                                : 'default'
                            }
                            className="text-xs"
                          >
                            {notification.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!notification.read && (
                          <Button
                            onClick={() => handleMarkAsRead(notification.$id)}
                            size="sm"
                            variant="ghost"
                            className="text-blue-600 hover:bg-blue-100"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          onClick={() =>
                            handleDeleteNotification(notification.$id)
                          }
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
