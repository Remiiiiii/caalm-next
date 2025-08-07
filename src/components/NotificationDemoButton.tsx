'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function NotificationDemoButton() {
  const [isLoading, setIsLoading] = useState(false);

  const triggerDemo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '🎭 Demo Notifications Triggered!',
          description:
            'Check your notification center to see all 11 notification types.',
        });
        console.log('✅ Demo Result:', data);
      } else {
        toast({
          title: '❌ Error',
          description: data.error || 'Failed to trigger demo notifications',
          variant: 'destructive',
        });
        console.error('❌ Demo Error:', data);
      }
    } catch (error) {
      toast({
        title: '❌ Error',
        description: 'Failed to trigger demo notifications',
        variant: 'destructive',
      });
      console.error('❌ Demo Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={triggerDemo}
      disabled={isLoading}
      variant="outline"
      className="bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border-blue-200 text-blue-700 hover:text-blue-800"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Triggering...
        </>
      ) : (
        <>🎭 Test All Notifications</>
      )}
    </Button>
  );
}
