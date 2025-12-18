/**
 * SMS Form Submissions Schema
 * Stores user submissions for SMS notification opt-in form
 */

export interface SmsFormSubmission {
  $id: string;
  user_id: string; // Links to user's $id (document ID)
  account_id?: string; // Links to user's accountId (Appwrite Auth ID)
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string; // Optional phone number from form
  submitted_at: string; // ISO 8601 datetime
  verified: boolean; // Whether the submission has been verified
}

export const SMS_FORM_SUBMISSIONS_ATTRIBUTES = [
  {
    key: 'user_id',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'account_id',
    type: 'string' as const,
    size: 255,
    required: false,
  },
  {
    key: 'first_name',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'last_name',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'email',
    type: 'string' as const,
    size: 255,
    required: true,
  },
  {
    key: 'phone_number',
    type: 'string' as const,
    size: 50,
    required: false,
  },
  {
    key: 'submitted_at',
    type: 'datetime' as const,
    required: true,
  },
  {
    key: 'verified',
    type: 'boolean' as const,
    required: true,
    default: true, // Self-submitted forms are verified by default
  },
] as const;
