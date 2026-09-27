/** NPO tables that must appear in tenant export/delete (10.4 / 10.5). */
export const NPO_TENANT_DATA_EXPORT_KEYS = [
	"constituents",
	"gifts",
	"volunteerHours",
	"constituentSegments",
	"constituentWealthScreens",
	"constituentRelationships",
] as const;

export type NpoTenantDataExportKey = (typeof NPO_TENANT_DATA_EXPORT_KEYS)[number];
