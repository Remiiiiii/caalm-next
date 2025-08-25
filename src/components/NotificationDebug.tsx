'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function NotificationDebug() {
  const { user } = useAuth();
  const { notifications, isLoading, error, mutate } = useNotifications();

  const handleRefresh = () => {
    mutate();
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Notification Debug Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <strong>Auth User ID:</strong> {user?.$id || 'No user'}
        </div>
        <div>
          <strong>User Email:</strong> {user?.email || 'No email'}
        </div>
        <div>
          <strong>User Name:</strong> {user?.name || 'No name'}
        </div>
        <div>
          <strong>Notifications Count:</strong> {notifications?.length || 0}
        </div>
        <div>
          <strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}
        </div>
        <div>
          <strong>Error:</strong> {error ? error.message : 'None'}
        </div>
        <div>
          <strong>Expected User ID:</strong> 68682eba0021a8048922
        </div>
        <div>
          <strong>Match:</strong>{' '}
          {user?.$id === '68682eba0021a8048922' ? '✅ Yes' : '❌ No'}
        </div>

        <Button onClick={handleRefresh} disabled={isLoading} className="w-full">
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh Notifications
        </Button>

        {notifications && notifications.length > 0 && (
          <div className="mt-4">
            <strong>Recent Notifications:</strong>
            <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.$id}
                  className="text-xs p-2 bg-gray-100 rounded"
                >
                  <div>
                    <strong>{notification.title}</strong>
                  </div>
                  <div className="text-gray-600">
                    {notification.message.substring(0, 50)}...
                  </div>
                  <div className="text-gray-500">
                    Created:{' '}
                    {new Date(notification.$createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
