/**
 * Script to create role_permission mappings
 * Run with: pnpm tsx scripts/create-role-permissions.ts
 */

import { PERMISSIONS } from '../src/constants/permissions';

// Permission key to permission ID mapping (based on the IDs we created)
const PERMISSION_ID_MAP: Record<string, string> = {
  'calendar.view_own': 'perm_calendar_view_own',
  'calendar.view_team': 'perm_calendar_view_team',
  'calendar.view_all': 'perm_calendar_view_all',
  'calendar.create': 'perm_calendar_create',
  'calendar.edit_own': 'perm_calendar_edit_own',
  'calendar.edit_all': 'perm_calendar_edit_all',
  'calendar.delete_own': 'perm_calendar_delete_own',
  'calendar.delete_all': 'perm_calendar_delete_all',
  'events.create': 'perm_events_create',
  'events.invite': 'perm_events_invite',
  'events.approve': 'perm_events_approve',
  'events.reschedule': 'perm_events_reschedule',
  'events.cancel': 'perm_events_cancel',
  'contracts.view': 'perm_contracts_view',
  'contracts.create': 'perm_contracts_create',
  'contracts.edit': 'perm_contracts_edit',
  'contracts.review': 'perm_contracts_review',
  'contracts.approve': 'perm_contracts_approve',
  'contracts.sign': 'perm_contracts_sign',
  'integrations.outlook.connect': 'perm_integrations_outlook_connect',
  'integrations.outlook.sync': 'perm_integrations_outlook_sync',
  'integrations.manage': 'perm_integrations_manage',
  'users.view': 'perm_users_view',
  'users.invite': 'perm_users_invite',
  'users.edit': 'perm_users_edit',
  'users.assign_roles': 'perm_users_assign_roles',
  'users.deactivate': 'perm_users_deactivate',
  'settings.view': 'perm_settings_view',
  'settings.edit': 'perm_settings_edit',
  'settings.billing': 'perm_settings_billing',
  'settings.integrations': 'perm_settings_integrations',
  'ai.chat': 'perm_ai_chat',
  'ai.document_analysis': 'perm_ai_document_analysis',
  'ai.meeting_prep': 'perm_ai_meeting_prep',
  'audit.view': 'perm_audit_view',
  'audit.export': 'perm_audit_export',
  'licenses.view': 'perm_licenses_view',
  'licenses.create': 'perm_licenses_create',
  'licenses.edit': 'perm_licenses_edit',
  'licenses.delete': 'perm_licenses_delete',
  'licenses.allocate': 'perm_licenses_allocate',
  'licenses.renew': 'perm_licenses_renew',
};

// Role ID mapping
const ROLE_ID_MAP: Record<string, string> = {
  'Super Admin': 'role_super_admin',
  'Organization Admin': 'role_org_admin',
  'Department Manager': 'role_dept_manager',
  'Scheduler': 'role_scheduler',
  'Reviewer': 'role_reviewer',
  'Viewer': 'role_viewer',
};

// All permissions
const ALL_PERMISSIONS = Object.values(PERMISSIONS).flatMap((category) =>
  Object.values(category)
) as string[];

// Role permission assignments
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'Super Admin': ALL_PERMISSIONS,
  'Organization Admin': ALL_PERMISSIONS,
  'Department Manager': [
    PERMISSIONS.CALENDAR.VIEW_TEAM,
    PERMISSIONS.CALENDAR.EDIT_ALL,
    PERMISSIONS.EVENTS.APPROVE,
    PERMISSIONS.EVENTS.RESCHEDULE,
    PERMISSIONS.CONTRACTS.REVIEW,
    PERMISSIONS.CONTRACTS.APPROVE,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.INVITE,
  ],
  'Scheduler': [
    PERMISSIONS.CALENDAR.VIEW_OWN,
    PERMISSIONS.CALENDAR.CREATE,
    PERMISSIONS.CALENDAR.EDIT_OWN,
    PERMISSIONS.EVENTS.CREATE,
    PERMISSIONS.EVENTS.INVITE,
  ],
  'Reviewer': [
    PERMISSIONS.CALENDAR.VIEW_TEAM,
    PERMISSIONS.EVENTS.APPROVE,
    PERMISSIONS.CONTRACTS.VIEW,
    PERMISSIONS.CONTRACTS.REVIEW,
  ],
  'Viewer': [
    PERMISSIONS.CALENDAR.VIEW_OWN,
    PERMISSIONS.CONTRACTS.VIEW,
  ],
};

// Generate MCP tool calls
console.log('// Role Permission Mappings to create:\n');

let mappingCount = 0;
for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
  const roleId = ROLE_ID_MAP[roleName];
  if (!roleId) {
    console.error(`Role ID not found for: ${roleName}`);
    continue;
  }

  for (const permissionKey of permissionKeys) {
    const permissionId = PERMISSION_ID_MAP[permissionKey];
    if (!permissionId) {
      console.error(`Permission ID not found for: ${permissionKey}`);
      continue;
    }

    mappingCount++;
    console.log(
      `mcp_caalm_databases_create_document(`,
      `database_id=685ed87c0009d8189fc7,`,
      `collection_id=role_permissions,`,
      `document_id=rp_${roleId}_${permissionId},`,
      `data={'roleId': '${roleId}', 'permissionId': '${permissionId}'}`
    );
    console.log(')');
    console.log('');
  }
}

console.log(`\n// Total mappings to create: ${mappingCount}`);

