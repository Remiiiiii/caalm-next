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
    url: ['/dashboard/executive', '/dashboard/manager', '/dashboard/admin'],
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

// Organizational Hierarchy Types
export type UserDivision =
  | 'administration' // Reports to HR Department
  | 'c-suite' // Reports to Executive Department
  | 'management' // Reports to Operations Department
  | 'childwelfare' // Subdivision under Management
  | 'behavioralhealth' // Subdivision under Management
  | 'clinic' // Subdivision under Management
  | 'residential' // Subdivision under Management
  | 'cins-fins-snap'; // Subdivision under Management

export type ContractDepartment =
  | 'IT'
  | 'Finance'
  | 'HR'
  | 'Legal'
  | 'Operations'
  | 'Sales'
  | 'Marketing'
  | 'Executive'
  | 'Engineering';

// User Division to Parent Department Mapping
export const DIVISION_TO_DEPARTMENT: Record<UserDivision, string> = {
  administration: 'HR',
  'c-suite': 'Executive',
  management: 'Operations',
  childwelfare: 'Operations',
  behavioralhealth: 'Operations',
  clinic: 'Operations',
  residential: 'Operations',
  'cins-fins-snap': 'Operations',
};

// Contract Departments for upload form
export const CONTRACT_DEPARTMENTS: ContractDepartment[] = [
  'IT',
  'Finance',
  'HR',
  'Legal',
  'Operations',
  'Sales',
  'Marketing',
  'Executive',
  'Engineering',
];

// User Divisions for profile settings
export const USER_DIVISIONS: UserDivision[] = [
  'administration',
  'c-suite',
  'management',
  'childwelfare',
  'behavioralhealth',
  'clinic',
  'residential',
  'cins-fins-snap',
];

// Format division name for display
export const formatDivisionName = (division: UserDivision): string => {
  return division
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format department name for display
export const formatDepartmentName = (
  department: ContractDepartment
): string => {
  return department;
};

// Get parent department for a division
export const getParentDepartment = (division: UserDivision): string => {
  return DIVISION_TO_DEPARTMENT[division];
};

// Check if division is a management subdivision
export const isManagementSubdivision = (division: UserDivision): boolean => {
  return [
    'childwelfare',
    'behavioralhealth',
    'clinic',
    'residential',
    'cins-fins-snap',
  ].includes(division);
};
