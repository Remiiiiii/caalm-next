/**
 * Utility functions for license upload form
 */

// Parse comma-separated string into array
export const parseListInput = (value?: string): string[] | undefined => {
  if (!value || value.trim().length === 0) return undefined;
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

// Parse currency string to number
export const parseCurrencyInput = (value?: string): number | undefined => {
  if (!value || value.trim().length === 0) return undefined;
  const num = parseFloat(value.replace(/[$,]/g, ''));
  return isNaN(num) ? undefined : num;
};

// Parse integer string to number
export const parseIntegerInput = (value?: string): number | undefined => {
  if (!value || value.trim().length === 0) return undefined;
  const num = parseInt(value, 10);
  return isNaN(num) ? undefined : num;
};

// Sanitize string (trim and return undefined if empty)
export const sanitizeString = (value?: string): string | undefined => {
  return value && value.trim().length > 0 ? value.trim() : undefined;
};

// Format date for display
export const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString();
};

// Format time ago
export const formatTimeAgo = (date: Date | string): string => {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};
