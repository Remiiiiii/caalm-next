'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ProfileSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    division: 'Administration',
    role: 'Manager',
  });
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      // TODO: Implement profile update logic with Appwrite
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-medium text-navy">
          Personal Information
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="fullName" className="text-sm text-light-200">
            Full Name
          </Label>
          <Input
            id="fullName"
            value={formData.fullName ? ` ${formData.fullName.replace(/^ /, '')}` : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/^ /, '');
              handleInputChange('fullName', value);
            }}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm text-light-200">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email ? ` ${formData.email.replace(/^ /, '')}` : ''}
            onChange={(e) => {
              const value = e.target.value.replace(/^ /, '');
              handleInputChange('email', value);
            }}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="division" className="text-sm text-light-200">
            Division
          </Label>
          <Input
            id="division"
            value={formData.division}
            onChange={(e) => handleInputChange('division', e.target.value)}
            className="mt-1"
            disabled
          />
        </div>

        <div>
          <Label htmlFor="role" className="text-sm text-light-200">
            Role
          </Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className="mt-1"
            disabled
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={isLoading}
        className="w-full bg-blue-500 hover:bg-blue-600"
      >
        <Save className="h-4 w-4 mr-2" />
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </div>
  );
};

export default ProfileSettings;
