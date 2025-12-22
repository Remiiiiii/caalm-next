'use client';

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Smartphone, Ban, Save, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SmsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onCancel: () => void;
}

export const SmsFormDialog: React.FC<SmsFormDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phoneNumber: '',
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Normalize phone number for comparison
  // Handles: (555) 123-4567 → +15551234567 or 5551234567 → +15551234567
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';

    // Extract all digits
    const digits = phone.replace(/\D/g, '');

    if (!digits) return '';

    // If 10 digits, add +1 prefix (US number)
    if (digits.length === 10) {
      return '+1' + digits;
    }

    // If 11 digits starting with 1, add + prefix
    if (digits.length === 11 && digits.startsWith('1')) {
      return '+' + digits;
    }

    // For any other format, just add + prefix
    return '+' + digits;
  };

  // Check if form is valid for submit button state
  const isFormValid = (): boolean => {
    const firstNameValid = formData.firstName.trim().length > 0;
    const lastNameValid = formData.lastName.trim().length > 0;
    const emailValid =
      formData.email.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim());
    // Normalize phone number and check if it's valid
    const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);
    const phoneValid =
      formData.phoneNumber.trim().length > 0 &&
      normalizedPhone.length >= 12 && // +1 + 10 digits = 12 characters minimum
      /^\+\d{10,15}$/.test(normalizedPhone);
    const consentValid = formData.consent === true;

    return (
      firstNameValid &&
      lastNameValid &&
      emailValid &&
      phoneValid &&
      consentValid
    );
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      // Normalize phone number and validate
      const normalizedPhone = normalizePhoneNumber(formData.phoneNumber);
      const phoneRegex = /^\+\d{10,15}$/;
      if (!phoneRegex.test(normalizedPhone)) {
        newErrors.phoneNumber =
          'Please enter a valid phone number (e.g., (555) 123-4567 or 5551234567)';
      }
    }

    if (!formData.consent) {
      newErrors.consent = 'You must agree to receive SMS notifications';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user?.$id) {
      toast({
        title: 'Error',
        description: 'User not found. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/sms-form-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.$id,
          accountId: user.$id, // Appwrite Auth user ID ($id) serves as accountId
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phoneNumber: normalizePhoneNumber(formData.phoneNumber),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form');
      }

      toast({
        title: 'Form Submitted',
        description: 'Your SMS notification preferences have been saved.',
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to submit SMS form:', error);
      toast({
        title: 'Error',
        description:
          error.message || 'Failed to submit form. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: user?.email || '',
      phoneNumber: '',
      consent: false,
    });
    setErrors({});
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
        {/* Professional Cap */}
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />

        {/* Header with gradient background */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
          <div className="flex items-center gap-3 px-6">
            <div>
              <AlertDialogTitle className="flex items-center gap-2 text-xl font-semibold sidebar-gradient-text py-2">
                <Smartphone className="w-5 h-5 text-[#0f5384]" />
                Receive Notifications From Caalm
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm ml-7 text-slate-600">
                Sign up here to receive SMS notifications from Caalm
              </AlertDialogDescription>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="space-y-4">
            <p className="text-xs text-slate-500 mb-4">
              <span className="text-red">*</span> Indicates required question
            </p>

            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First Name <span className="text-red">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className={`bg-white border-slate-300 ${
                  errors.firstName ? 'border-red-500' : ''
                }`}
                placeholder="Your answer"
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last Name <span className="text-red">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className={`bg-white border-slate-300 ${
                  errors.lastName ? 'border-red-500' : ''
                }`}
                placeholder="Your answer"
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className={`bg-white border-slate-300 ${
                  errors.email ? 'border-red-500' : ''
                }`}
                placeholder="Your answer"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                Phone Number <span className="text-red">*</span>
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                inputMode="tel"
                value={formData.phoneNumber}
                onChange={(e) => {
                  // Only allow digits, spaces, dashes, parentheses, and + sign
                  const value = e.target.value;
                  const allowedChars = /^[\d\s\-\(\)\+]*$/;
                  if (allowedChars.test(value) || value === '') {
                    setFormData({ ...formData, phoneNumber: value });
                    // Clear error when user starts typing
                    if (errors.phoneNumber) {
                      setErrors({ ...errors, phoneNumber: '' });
                    }
                  }
                }}
                className={`bg-white border-slate-300 ${
                  errors.phoneNumber ? 'border-red-500' : ''
                }`}
                placeholder="(555) 123-4567 or 5551234567"
              />
              <p className="text-xs text-slate-500">Enter your phone number</p>
              {errors.phoneNumber && (
                <p className="text-xs text-red-500">{errors.phoneNumber}</p>
              )}
            </div>

            {/* SMS Consent Checkbox */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor="consent"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Get SMS Notifications
                  </Label>
                  <p className="text-xs text-slate-600 leading-relaxed pb-1">
                    By clicking the checkbox above, you agree to receive SMS
                    notifications from Caalm. Message & Data Rates May Apply.
                    Message frequency varies. Text STOP to stop. For help,
                    contact support@caalmsolutions.com or visit{' '}
                    <a
                      href="https://www.caalmsolutions.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      https://www.caalmsolutions.com
                    </a>
                    .{' '}
                    <a
                      href="https://www.caalmsolutions.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Privacy Policy
                    </a>{' '}
                    <a
                      href="https://www.caalmsolutions.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Terms & Conditions
                    </a>
                  </p>
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Checkbox
                      id="consent"
                      checked={formData.consent}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, consent: checked === true })
                      }
                      className={`mt-1 ${
                        errors.consent ? 'border-red-500' : ''
                      }`}
                    />
                    Yes, Please send me app notifications via text messages.{' '}
                    <span className="text-red">*</span>
                  </p>
                  {errors.consent && (
                    <p className="text-xs text-red-500">{errors.consent}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Footer */}
        <div className="py-4 bg-slate-50 border-t border-slate-200 flex justify-center items-center gap-3">
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={submitting}
            className="primary-btn px-3 sm:px-4 flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={submitting || !isFormValid()}
            className="primary-btn px-3 sm:px-4 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
