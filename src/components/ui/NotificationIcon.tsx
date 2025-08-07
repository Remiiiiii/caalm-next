import React from 'react';
import {
  Calendar,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Users,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  Info,
  Bell,
} from 'lucide-react';

interface NotificationIconProps {
  icon: string;
  className?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  RefreshCw,
  Shield,
  AlertTriangle,
  FileText,
  Users,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle,
  Info,
  Bell,
};

export const NotificationIcon: React.FC<NotificationIconProps> = ({
  icon,
  className = 'w-4 h-4',
}) => {
  const IconComponent = iconMap[icon] || Bell;

  return <IconComponent className={className} />;
};

export default NotificationIcon;
