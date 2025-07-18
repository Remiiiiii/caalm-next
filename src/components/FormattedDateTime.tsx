import { cn, formatDate, formatDateTime } from '@/lib/utils';
import React from 'react';

export const FormattedDateTime = ({
  date,
  className,
}: {
  date: string;
  className?: string;
}) => {
  return (
    <p className={cn('body-1 text-light-200', className)}>
      {formatDateTime(date)}
    </p>
  );
};
export const FormattedDate = ({
  date,
  className,
}: {
  date: string;
  className?: string;
}) => {
  return (
    <p className={cn('body-2 text-light-200', className)}>{formatDate(date)}</p>
  );
};

export default FormattedDateTime;
