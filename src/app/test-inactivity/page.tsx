'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MousePointer, Keyboard, Hand } from 'lucide-react';

export default function TestInactivityPage() {
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  const logActivity = (eventType: string) => {
    const now = new Date();
    setLastActivity(now);
    setActivityLog((prev) => [
      `${now.toLocaleTimeString()} - ${eventType}`,
      ...prev.slice(0, 9), // Keep only last 10 entries
    ]);
  };

  const handleMouseMove = () => logActivity('Mouse Movement');
  const handleKeyPress = () => logActivity('Key Press');
  const handleClick = () => logActivity('Click/Touch');
  const handleScroll = () => logActivity('Scroll');

  return (
    <div className="container mx-auto p-8 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Inactivity Timer Test</h1>
        <p className="text-gray-600">
          This page demonstrates the inactivity timer functionality. The timer
          will trigger after 10 minutes of inactivity.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Activity Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              Timer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Inactivity Limit:</span>
                <Badge variant="outline">10 minutes</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Countdown Time:</span>
                <Badge variant="outline">30 seconds</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Activity:</span>
                <span className="text-sm font-mono">
                  {lastActivity.toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The inactivity timer is active on this
                page. Try staying inactive for 10 minutes to see the dialog, or
                use the test buttons below.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5 text-green-500" />
              Test Activity Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Click these buttons to simulate user activity and reset the timer:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleMouseMove}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MousePointer className="h-4 w-4" />
                Mouse Move
              </Button>

              <Button
                onClick={handleKeyPress}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Keyboard className="h-4 w-4" />
                Key Press
              </Button>

              <Button
                onClick={handleClick}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Hand className="h-4 w-4" />
                Click/Touch
              </Button>

              <Button
                onClick={handleScroll}
                variant="outline"
                className="flex items-center gap-2"
              >
                <MousePointer className="h-4 w-4" />
                Scroll
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activityLog.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No activity logged yet. Try the test buttons above or interact
                with the page.
              </p>
            ) : (
              activityLog.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className="text-sm font-mono">{log}</span>
                  <Badge variant="secondary" className="text-xs">
                    #{activityLog.length - index}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-semibold">Testing the Inactivity Timer:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
              <li>Stay inactive on this page for 10 minutes</li>
              <li>
                The inactivity dialog will appear with a 30-second countdown
              </li>
              <li>Choose "Continue Session" to reset the timer</li>
              <li>Or choose "Sign Out" to log out immediately</li>
            </ol>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">Activity Events Monitored:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Mouse movements</li>
              <li>Keyboard presses</li>
              <li>Mouse clicks and touch events</li>
              <li>Scroll events</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
