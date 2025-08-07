import React from 'react';
// import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  type?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  priority = 'medium',
  // type,
  size = 'md',
  className,
}) => {
  if (!count || count === 0) return null;

  const getPriorityStyles = () => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500 text-white border-red-600';
      case 'high':
        return 'bg-[orange-500] text-white border-orange-600';
      case 'medium':
        return 'bg-[#F9AB72] text-white border-yellow-600';
      case 'low':
        return 'bg-green-500 text-white border-green-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 min-w-[1.25rem] h-5';
      case 'md':
        return 'text-xs px-2 py-1 min-w-[1.5rem] h-6';
      case 'lg':
        return 'text-sm px-2.5 py-1.5 min-w-[2rem] h-8';
      default:
        return 'text-xs px-2 py-1 min-w-[1.5rem] h-6';
    }
  };

  // const getIcon = () => {
  //   switch (type) {
  //     case 'compliance-alert':
  //     case 'contract-expiry':
  //       return <AlertTriangle className="w-3 h-3" />;
  //     case 'task-completed':
  //       return <CheckCircle className="w-3 h-3" />;
  //     case 'info':
  //       return <Info className="w-3 h-3" />;
  //     default:
  //       return <CheckCircle className="w-3 h-3" />;
  //   }
  // };

  const displayCount = count > 99 ? '99+' : (count || 0).toString();

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border-2 font-medium shadow-sm animate-pulse',
        getPriorityStyles(),
        getSizeStyles(),
        className
      )}
      title={`${count || 0} notification${(count || 0) !== 1 ? 's' : ''}`}
    >
      {/* {count <= 3 && <span className="mr-1">{getIcon()}</span>} */}
      {displayCount}
    </div>
  );
};

export default NotificationBadge;
