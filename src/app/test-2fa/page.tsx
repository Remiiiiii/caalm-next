'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import TwoFactorModal from '@/components/TwoFactorModal';
import TwoFactorVerificationModal from '@/components/TwoFactorVerificationModal';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, RefreshCw, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';

interface TestUser {
  id: string;
  email: string;
  name: string;
  has2FA: boolean;
}

interface SetupData {
  uri: string;
  secret: string;
  factorId: string;
}

export default function Test2FAPage() {
  const [showSetup, setShowSetup] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showQRSetup, setShowQRSetup] = useState(false);
  const [users, setUsers] = useState<TestUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<TestUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'success'>('qr');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/test-users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        if (data.users.length > 0 && !selectedUser) {
          setSelectedUser(data.users[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [selectedUser, toast]);

  // Create a new test user
  const createTestUser = async () => {
    if (!newUserEmail || !newUserName) {
      toast({
        title: 'Error',
        description: 'Please provide both email and name',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          name: newUserName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUsers((prev) => [...prev, data.user]);
        setSelectedUser(data.user);
        setNewUserEmail('');
        setNewUserName('');
        toast({
          title: 'Success',
          description: 'Test user created successfully',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error creating test user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create test user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code using qrcode library
  const generateQRCode = async (data: string) => {
    try {
      const dataUrl = await QRCode.toDataURL(data, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  // Start 2FA setup process
  const start2FASetup = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data.data);
        setSetupStep('qr');
        setShowQRSetup(true);
        // Generate QR code
        await generateQRCode(data.data.uri);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error starting 2FA setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to start 2FA setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Verify 2FA setup
  const verify2FASetup = async () => {
    if (!setupData || !verificationCode) {
      toast({
        title: 'Error',
        description: 'Please enter a verification code',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/2fa/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factorId: setupData.factorId,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupStep('success');
        toast({
          title: 'Success',
          description: '2FA setup completed successfully',
        });
        // Refresh users to update 2FA status
        setTimeout(() => {
          fetchUsers();
          setShowQRSetup(false);
          setSetupData(null);
          setVerificationCode('');
          setSetupStep('qr');
        }, 2000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error verifying 2FA setup:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify 2FA setup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSetupSuccess = () => {
    console.log('2FA Setup completed successfully');
    setShowSetup(false);
    // Refresh users to update 2FA status
    fetchUsers();
  };

  const handleVerificationSuccess = () => {
    console.log('2FA Verification completed successfully');
    setShowVerification(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">2FA Flow Test</h1>

      {/* User Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Test User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Choose User:
              </label>
              <Select
                value={selectedUser?.id || ''}
                onValueChange={(value) => {
                  const user = users.find((u) => u.id === value);
                  setSelectedUser(user || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email}) -{' '}
                      {user.has2FA ? 'Has 2FA' : 'No 2FA'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={fetchUsers} disabled={loading}>
                Refresh Users
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create New Test User */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Test User</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email:</label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Name:</label>
              <Input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Test User"
              />
            </div>
            <Button onClick={createTestUser} disabled={loading}>
              Create Test User
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2FA Testing */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle>2FA Testing for {selectedUser.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Current Status: {selectedUser.has2FA ? 'Has 2FA' : 'No 2FA'}
                </h3>
              </div>

              <div className="flex gap-4 flex-wrap">
                {/* Setup Options - Show for all users for testing */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Setup Options:
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowSetup(true)}
                      className="bg-blue-500 hover:bg-blue-600"
                      disabled={loading}
                    >
                      Test 2FA Setup Flow (Modal)
                    </Button>
                    <Button
                      onClick={start2FASetup}
                      className="bg-purple-500 hover:bg-purple-600"
                      disabled={loading}
                    >
                      Test 2FA Setup Flow (Inline)
                    </Button>
                  </div>
                </div>

                {/* Verification Options - Show for all users for testing */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Verification Options:
                  </h4>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowVerification(true)}
                      className="bg-green-500 hover:bg-green-600"
                      disabled={loading}
                    >
                      Test 2FA Verification Flow
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inline QR Code Setup */}
      {showQRSetup && setupData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              Two-Factor Authentication Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            {setupStep === 'qr' && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="inline-block p-4 bg-white rounded-lg border">
                    {qrCodeDataUrl ? (
                      <Image
                        src={qrCodeDataUrl}
                        alt="2FA QR Code"
                        width={200}
                        height={200}
                        className="rounded"
                      />
                    ) : (
                      <div className="w-[200px] h-[200px] bg-gray-100 rounded flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Or manually enter this secret key:
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {showSecret && (
                    <div className="p-3 bg-gray-100 rounded font-mono text-sm break-all">
                      {setupData.secret}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600 text-center">
                    After scanning the QR code, enter the 6-digit verification
                    code:
                  </p>
                  <InputOTP
                    maxLength={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={verify2FASetup}
                    disabled={verificationCode.length !== 6 || loading}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Complete Setup'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowQRSetup(false);
                      setSetupData(null);
                      setVerificationCode('');
                      setSetupStep('qr');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {setupStep === 'success' && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  2FA Setup Complete!
                </h3>
                <p className="text-sm text-gray-600">
                  Two-factor authentication has been successfully set up.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      {showSetup && selectedUser && (
        <TwoFactorModal
          email={selectedUser.email}
          userId={selectedUser.id}
          isOpen={showSetup}
          onClose={() => setShowSetup(false)}
          onSuccess={handleSetupSuccess}
        />
      )}

      {showVerification && selectedUser && (
        <TwoFactorVerificationModal
          userId={selectedUser.id}
          email={selectedUser.email}
          onSuccess={handleVerificationSuccess}
          onClose={() => setShowVerification(false)}
        />
      )}
    </div>
  );
}
