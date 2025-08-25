'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const SMSTestComponent = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [twilioStatus, setTwilioStatus] = useState<{
    configured: boolean;
    accountInfo?: {
      sid: string;
      status: string;
      balance: string;
    };
    error?: string;
  } | null>(null);
  const { toast } = useToast();

  const checkTwilioStatus = async () => {
    try {
      const response = await fetch('/api/notifications/test-sms');
      const data = await response.json();
      setTwilioStatus(data);
    } catch (error) {
      console.error('Error checking Twilio status:', error);
      setTwilioStatus({
        configured: false,
        error: 'Failed to check Twilio status',
      });
    }
  };

  const sendTestSMS = async () => {
    if (!phoneNumber || !message) {
      toast({
        title: 'Error',
        description: 'Please enter both phone number and message',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Test SMS sent successfully!',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to send SMS',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test SMS',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>SMS Test</CardTitle>
        <CardDescription>Test Twilio SMS functionality</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Button
            onClick={checkTwilioStatus}
            variant="outline"
            className="w-full"
          >
            Check Twilio Status
          </Button>

          {twilioStatus && (
            <div className="mt-2 p-2 text-sm rounded border">
              {twilioStatus.configured ? (
                <div className="text-green-600">
                  ✅ Twilio is configured
                  {twilioStatus.accountInfo && (
                    <div className="mt-1 text-xs text-gray-600">
                      Account: {twilioStatus.accountInfo.sid}
                      <br />
                      Status: {twilioStatus.accountInfo.status}
                      <br />
                      Balance: {twilioStatus.accountInfo.balance}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-red-600">
                  ❌ Twilio not configured
                  {twilioStatus.error && (
                    <div className="text-xs">{twilioStatus.error}</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1234567890"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Input
            id="message"
            type="text"
            placeholder="Test message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <Button
          onClick={sendTestSMS}
          disabled={isLoading || !twilioStatus?.configured}
          className="w-full"
        >
          {isLoading ? 'Sending...' : 'Send Test SMS'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default SMSTestComponent;
