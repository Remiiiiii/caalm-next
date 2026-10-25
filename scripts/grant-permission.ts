import { createAdminClient } from "../src/lib/appwrite/admin";
import { appwriteConfig } from "../src/lib/appwrite/config";
import { Query } from "node-appwrite";

async function main() {
  const { tablesDB } = await createAdminClient();
  const databaseId = appwriteConfig.databaseId || "default-db";
  const permTableId = appwriteConfig.permissionsCollectionId || "685ed87c0009d8189fc8";

  // 1. Create the permission row if it doesn't exist
  try {
    await tablesDB.getRow({
      databaseId,
      tableId: permTableId,
      rowId: "perm_it_manage_incidents",
    });
    console.log("Permission row already exists");
  } catch {
    await tablesDB.createRow({
      databaseId,
      tableId: permTableId,
      rowId: "perm_it_manage_incidents",
      data: {
        key: "it.manage_incidents",
        name: "Manage Incidents",
        category: "it",
        description: "Acknowledge, assign, and resolve load-error incidents",
      },
    });
    console.log("Created permission: perm_it_manage_incidents");
  }

  // 2. Link to role_super_admin
  const existing = await tablesDB.listRows({
    databaseId,
    tableId: "role_permissions",
    queries: [
      Query.equal("roleId", "role_super_admin"),
      Query.equal("permissionId", "perm_it_manage_incidents"),
      Query.limit(1),
    ],
  });

  if (existing.rows.length > 0) {
    console.log("role_permissions link already exists");
  } else {
    await tablesDB.createRow({
      databaseId,
      tableId: "role_permissions",
      rowId: `rp_sa_manage_incidents_${Date.now()}`,
      data: {
        roleId: "role_super_admin",
        permissionId: "perm_it_manage_incidents",
      },
    });
    console.log("Linked perm_it_manage_incidents to role_super_admin");
  }
}

main().catch(console.error);
