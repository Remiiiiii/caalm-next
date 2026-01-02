/**
 * Permission Definitions
 * Global permission keys organized by category
 * These permissions are shared across all organizations
 */

export const PERMISSIONS = {
  // Calendar Permissions
  CALENDAR: {
    VIEW_OWN: 'calendar.view_own',
    VIEW_TEAM: 'calendar.view_team',
    VIEW_ALL: 'calendar.view_all',
    CREATE: 'calendar.create',
    EDIT_OWN: 'calendar.edit_own',
    EDIT_ALL: 'calendar.edit_all',
    DELETE_OWN: 'calendar.delete_own',
    DELETE_ALL: 'calendar.delete_all',
  },
  
  // Event Management Permissions
  EVENTS: {
    CREATE: 'events.create',
    INVITE: 'events.invite',
    APPROVE: 'events.approve',
    RESCHEDULE: 'events.reschedule',
    CANCEL: 'events.cancel',
  },
  
  // Contract Permissions
  CONTRACTS: {
    VIEW: 'contracts.view',
    CREATE: 'contracts.create',
    EDIT: 'contracts.edit',
    REVIEW: 'contracts.review',
    APPROVE: 'contracts.approve',
    SIGN: 'contracts.sign',
  },
  
  // Integration Permissions
  INTEGRATIONS: {
    OUTLOOK_CONNECT: 'integrations.outlook.connect',
    OUTLOOK_SYNC: 'integrations.outlook.sync',
    MANAGE: 'integrations.manage',
  },
  
  // User Management Permissions
  USERS: {
    VIEW: 'users.view',
    INVITE: 'users.invite',
    EDIT: 'users.edit',
    ASSIGN_ROLES: 'users.assign_roles',
    DEACTIVATE: 'users.deactivate',
  },
  
  // Organization Settings Permissions
  SETTINGS: {
    VIEW: 'settings.view',
    EDIT: 'settings.edit',
    BILLING: 'settings.billing',
    INTEGRATIONS: 'settings.integrations',
  },
  
  // AI Assistant Permissions
  AI: {
    CHAT: 'ai.chat',
    DOCUMENT_ANALYSIS: 'ai.document_analysis',
    MEETING_PREP: 'ai.meeting_prep',
  },
  
  // Audit Permissions
  AUDIT: {
    VIEW: 'audit.view',
    EXPORT: 'audit.export',
  },
  
  // IT/Software Engineering Permissions
  IT: {
    VIEW_RATE_LIMITS: 'it.view_rate_limits',
    VIEW_SYSTEM_LOGS: 'it.view_system_logs',
    MANAGE_API_KEYS: 'it.manage_api_keys',
    VIEW_ANALYTICS: 'it.view_analytics',
    MANAGE_DEPLOYMENTS: 'it.manage_deployments',
    VIEW_MONITORING: 'it.view_monitoring',
    MANAGE_CI_CD: 'it.manage_ci_cd',
    VIEW_SECURITY: 'it.view_security',
    MANAGE_DATABASE: 'it.manage_database',
    VIEW_INCIDENTS: 'it.view_incidents',
  },
} as const;

// Flatten all permissions into a single array
export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((category) =>
  Object.values(category)
) as string[];

// Permission metadata for seeding
export const PERMISSION_DEFINITIONS = [
  // Calendar
  { key: PERMISSIONS.CALENDAR.VIEW_OWN, name: 'View Own Calendar', category: 'calendar', description: 'View own calendar events' },
  { key: PERMISSIONS.CALENDAR.VIEW_TEAM, name: 'View Team Calendar', category: 'calendar', description: 'View team calendar events' },
  { key: PERMISSIONS.CALENDAR.VIEW_ALL, name: 'View All Calendars', category: 'calendar', description: 'View all organization calendars' },
  { key: PERMISSIONS.CALENDAR.CREATE, name: 'Create Calendar Events', category: 'calendar', description: 'Create new calendar events' },
  { key: PERMISSIONS.CALENDAR.EDIT_OWN, name: 'Edit Own Events', category: 'calendar', description: 'Edit own calendar events' },
  { key: PERMISSIONS.CALENDAR.EDIT_ALL, name: 'Edit All Events', category: 'calendar', description: 'Edit any calendar event' },
  { key: PERMISSIONS.CALENDAR.DELETE_OWN, name: 'Delete Own Events', category: 'calendar', description: 'Delete own calendar events' },
  { key: PERMISSIONS.CALENDAR.DELETE_ALL, name: 'Delete All Events', category: 'calendar', description: 'Delete any calendar event' },
  
  // Events
  { key: PERMISSIONS.EVENTS.CREATE, name: 'Create Events', category: 'events', description: 'Create new events' },
  { key: PERMISSIONS.EVENTS.INVITE, name: 'Invite Participants', category: 'events', description: 'Invite participants to events' },
  { key: PERMISSIONS.EVENTS.APPROVE, name: 'Approve Events', category: 'events', description: 'Approve event requests' },
  { key: PERMISSIONS.EVENTS.RESCHEDULE, name: 'Reschedule Events', category: 'events', description: 'Reschedule events' },
  { key: PERMISSIONS.EVENTS.CANCEL, name: 'Cancel Events', category: 'events', description: 'Cancel events' },
  
  // Contracts
  { key: PERMISSIONS.CONTRACTS.VIEW, name: 'View Contracts', category: 'contracts', description: 'View contracts' },
  { key: PERMISSIONS.CONTRACTS.CREATE, name: 'Create Contracts', category: 'contracts', description: 'Create new contracts' },
  { key: PERMISSIONS.CONTRACTS.EDIT, name: 'Edit Contracts', category: 'contracts', description: 'Edit contracts' },
  { key: PERMISSIONS.CONTRACTS.REVIEW, name: 'Review Contracts', category: 'contracts', description: 'Review and comment on contracts' },
  { key: PERMISSIONS.CONTRACTS.APPROVE, name: 'Approve Contracts', category: 'contracts', description: 'Approve contracts' },
  { key: PERMISSIONS.CONTRACTS.SIGN, name: 'Sign Contracts', category: 'contracts', description: 'Sign contracts' },
  
  // Integrations
  { key: PERMISSIONS.INTEGRATIONS.OUTLOOK_CONNECT, name: 'Connect Outlook', category: 'integrations', description: 'Connect Outlook account' },
  { key: PERMISSIONS.INTEGRATIONS.OUTLOOK_SYNC, name: 'Sync Outlook', category: 'integrations', description: 'Sync with Outlook' },
  { key: PERMISSIONS.INTEGRATIONS.MANAGE, name: 'Manage Integrations', category: 'integrations', description: 'Manage all integrations' },
  
  // Users
  { key: PERMISSIONS.USERS.VIEW, name: 'View Users', category: 'users', description: 'View user list' },
  { key: PERMISSIONS.USERS.INVITE, name: 'Invite Users', category: 'users', description: 'Invite new users' },
  { key: PERMISSIONS.USERS.EDIT, name: 'Edit Users', category: 'users', description: 'Edit user details' },
  { key: PERMISSIONS.USERS.ASSIGN_ROLES, name: 'Assign Roles', category: 'users', description: 'Assign roles to users' },
  { key: PERMISSIONS.USERS.DEACTIVATE, name: 'Deactivate Users', category: 'users', description: 'Deactivate users' },
  
  // Settings
  { key: PERMISSIONS.SETTINGS.VIEW, name: 'View Settings', category: 'settings', description: 'View organization settings' },
  { key: PERMISSIONS.SETTINGS.EDIT, name: 'Edit Settings', category: 'settings', description: 'Edit organization settings' },
  { key: PERMISSIONS.SETTINGS.BILLING, name: 'Manage Billing', category: 'settings', description: 'Manage billing' },
  { key: PERMISSIONS.SETTINGS.INTEGRATIONS, name: 'Configure Integrations', category: 'settings', description: 'Configure integrations' },
  
  // AI
  { key: PERMISSIONS.AI.CHAT, name: 'Use AI Chat', category: 'ai', description: 'Use AI chat feature' },
  { key: PERMISSIONS.AI.DOCUMENT_ANALYSIS, name: 'AI Document Analysis', category: 'ai', description: 'Use AI for document analysis' },
  { key: PERMISSIONS.AI.MEETING_PREP, name: 'AI Meeting Prep', category: 'ai', description: 'Get AI meeting preparation suggestions' },
  
  // Audit
  { key: PERMISSIONS.AUDIT.VIEW, name: 'View Audit Logs', category: 'audit', description: 'View audit logs' },
  { key: PERMISSIONS.AUDIT.EXPORT, name: 'Export Audit Logs', category: 'audit', description: 'Export audit logs' },
  
  // IT/Software Engineering
  { key: PERMISSIONS.IT.VIEW_RATE_LIMITS, name: 'View Rate Limits', category: 'it', description: 'Access to rate limit monitoring dashboard' },
  { key: PERMISSIONS.IT.VIEW_SYSTEM_LOGS, name: 'View System Logs', category: 'it', description: 'Access to system logs' },
  { key: PERMISSIONS.IT.MANAGE_API_KEYS, name: 'Manage API Keys', category: 'it', description: 'Manage API keys' },
  { key: PERMISSIONS.IT.VIEW_ANALYTICS, name: 'View Analytics', category: 'it', description: 'Access to analytics dashboard' },
  { key: PERMISSIONS.IT.MANAGE_DEPLOYMENTS, name: 'Manage Deployments', category: 'it', description: 'Manage deployments' },
  { key: PERMISSIONS.IT.VIEW_MONITORING, name: 'View Monitoring', category: 'it', description: 'View monitoring dashboards' },
  { key: PERMISSIONS.IT.MANAGE_CI_CD, name: 'Manage CI/CD', category: 'it', description: 'Manage CI/CD pipelines' },
  { key: PERMISSIONS.IT.VIEW_SECURITY, name: 'View Security', category: 'it', description: 'View security dashboard' },
  { key: PERMISSIONS.IT.MANAGE_DATABASE, name: 'Manage Database', category: 'it', description: 'Database administration' },
  { key: PERMISSIONS.IT.VIEW_INCIDENTS, name: 'View Incidents', category: 'it', description: 'View incident management' },
] as const;

export type PermissionKey = (typeof ALL_PERMISSIONS)[number];

