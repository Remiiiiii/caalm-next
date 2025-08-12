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
    <span className={cn('body-1 text-slate-700', className)}>
      {formatDateTime(date)}
    </span>
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
    <span className={cn('body-2 text-slate-700', className)}>
      {formatDate(date)}
    </span>
  );
};

export default FormattedDateTime;
