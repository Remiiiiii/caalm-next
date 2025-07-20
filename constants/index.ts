import {
  Database,
  Bell,
  GitBranch,
  BarChart3,
  Lock,
  Calendar,
  FileCheck,
  Users2,
} from 'lucide-react';

export const navItems = [
  {
    name: 'Dashboard',
    icon: '/assets/icons/dashboard.svg',
    url: ['/dashboard/executive', '/dashboard/manager', '/dashboard/hr'],
  },
  {
    name: 'Documents',
    icon: '/assets/icons/documents.svg',
    url: '/documents',
  },
  {
    name: 'Images',
    icon: '/assets/icons/images.svg',
    url: '/images',
  },
  {
    name: 'Media',
    icon: '/assets/icons/video.svg',
    url: '/media',
  },
  {
    name: 'Others',
    icon: '/assets/icons/others.svg',
    url: '/others',
  },
];

export const actionsDropdownItems = [
  {
    label: 'Assign',
    icon: '/assets/icons/assign.svg',
    value: 'assign',
  },
  {
    label: 'Delete',
    icon: '/assets/icons/delete.svg',
    value: 'delete',
  },
  {
    label: 'Details',
    icon: '/assets/icons/info.svg',
    value: 'details',
  },
  {
    label: 'Download',
    icon: '/assets/icons/download.svg',
    value: 'download',
  },
  {
    label: 'Rename',
    icon: '/assets/icons/edit.svg',
    value: 'rename',
  },
  {
    label: 'Review',
    icon: '/assets/icons/review.svg',
    value: 'review',
  },
  {
    label: 'Share',
    icon: '/assets/icons/share.svg',
    value: 'share',
  },
  {
    label: 'Status',
    icon: '/assets/icons/contract-status.svg',
    value: 'status',
  },
];

export const sortTypes = [
  {
    label: 'Date created (newest)',
    value: '$createdAt-desc',
  },
  {
    label: 'Created Date (oldest)',
    value: '$createdAt-asc',
  },
  {
    label: 'Name (A-Z)',
    value: 'name-asc',
  },
  {
    label: 'Name (Z-A)',
    value: 'name-desc',
  },
  {
    label: 'Size (Highest)',
    value: 'size-desc',
  },
  {
    label: 'Size (Lowest)',
    value: 'size-asc',
  },
];

export const features = [
  {
    icon: Database,
    title: 'Centralized Document Storage',
    description:
      'Secure cloud-based repository with advanced search, tagging, and version control.',
  },
  {
    icon: Bell,
    title: 'Automated Deadline Alerts',
    description:
      'Proactive notifications for renewals, audits, and key compliance milestones.',
  },
  {
    icon: GitBranch,
    title: 'Collaboration Tools',
    description:
      'Multi-user review, approval workflows, and real-time collaboration features.',
  },
  {
    icon: BarChart3,
    title: 'Reporting & Analytics',
    description:
      'Real-time dashboards for compliance status, risk assessment, and pending actions.',
  },
  {
    icon: Lock,
    title: 'Enterprise Security',
    description:
      'Role-based access controls, encryption, and comprehensive audit trails.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description:
      'Intelligent calendar integration with automated reminder escalation.',
  },
  {
    icon: FileCheck,
    title: 'Compliance Tracking',
    description:
      'Monitor regulatory requirements and maintain certification records.',
  },
  {
    icon: Users2,
    title: 'Team Management',
    description:
      'Assign responsibilities, track progress, and manage team workflows.',
  },
];

export const avatarPlaceholderUrl =
  'https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Department type - will be populated from database
export type Department = string;

// Helper function to format department names for display
export const formatDepartmentName = (department: string): string => {
  return department
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
