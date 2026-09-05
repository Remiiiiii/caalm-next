import type { NextRequest } from "next/server";
import { Query } from "node-appwrite";
import { PERMISSIONS } from "@/constants/permissions";
import { createAdminClient } from "@/lib/appwrite/admin";
import { appwriteConfig } from "@/lib/appwrite/config";
import { requirePermission } from "@/lib/rbac/middleware";
import { CACHE_KEYS, CACHE_TTLS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

interface ContractStats {
	totalContracts: number;
	totalBudget: number;
	activeContracts: number;
	expiredContracts: number;
	pendingContracts: number;
	totalLicenses: number;
	activeLicenses: number;
	expiredLicenses: number;
	complianceRate: number;
	staffCount: number;
}

interface DepartmentAnalytics {
	name: string;
	divisions: {
		id: string;
		name: string;
		description: string;
		stats: ContractStats;
	}[];
	totalStats: ContractStats;
}

export async function GET(request: NextRequest) {
	try {
		const permissionCheck = await requirePermission(request, {
			permission: [PERMISSIONS.SETTINGS.VIEW, PERMISSIONS.AUDIT.VIEW],
		});
		if (permissionCheck) {
			return permissionCheck;
		}

		// Check cache first for lightning-fast response
		const cacheKey = CACHE_KEYS.analytics.admin(); // Reuse admin cache key since data is the same
		const cachedData = await CacheManager.withCache(
			"analytics/organization",
			cacheKey,
			async () => {
				const { tablesDB } = await createAdminClient();

				const [allContracts, allLicenses, allUsers] = await Promise.all([
					tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.contractsCollectionId,
						queries: [
							Query.limit(2000),
							Query.select([
								"department",
								"division",
								"amount",
								"status",
								"compliance",
							]),
						],
					}),
					tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.licensesCollectionId,
						queries: [Query.limit(2000)],
					}),
					tablesDB.listRows({
						databaseId: appwriteConfig.databaseId,
						tableId: appwriteConfig.usersCollectionId,
						queries: [
							Query.limit(2000),
							Query.equal("status", "active"),
							Query.select(["division"]),
						],
					}),
				]);

				// Group contracts by department and division
				const contractsByDepartment: Record<string, any[]> = {};
				const contractsByDivision: Record<string, any[]> = {};

				allContracts.rows.forEach((contract: any) => {
					const department = contract.department as string;
					const division = contract.division as string;

					if (department) {
						if (!contractsByDepartment[department]) {
							contractsByDepartment[department] = [];
						}
						contractsByDepartment[department].push(contract);
					}

					if (division) {
						if (!contractsByDivision[division]) {
							contractsByDivision[division] = [];
						}
						contractsByDivision[division].push(contract);
					}
				});

				// Group users by division
				const usersByDivision: Record<string, any[]> = {};
				allUsers.rows.forEach((user: any) => {
					const division = user.division as string;
					if (division) {
						if (!usersByDivision[division]) {
							usersByDivision[division] = [];
						}
						usersByDivision[division].push(user);
					}
				});

				// Calculate stats for a given contracts array
				const licensesByDepartment: Record<string, any[]> = {};
				const licensesByDivision: Record<string, any[]> = {};
				allLicenses.rows.forEach((license: any) => {
					const department = license.department as string;
					const division = license.division as string;
					if (department) {
						if (!licensesByDepartment[department]) {
							licensesByDepartment[department] = [];
						}
						licensesByDepartment[department].push(license);
					}
					if (division) {
						if (!licensesByDivision[division]) {
							licensesByDivision[division] = [];
						}
						licensesByDivision[division].push(license);
					}
				});

				const licenseCounts = (licenses: any[]) => ({
					totalLicenses: licenses.length,
					activeLicenses: licenses.filter(
						(l) => String(l.status).toLowerCase() === "active",
					).length,
					expiredLicenses: licenses.filter(
						(l) => String(l.status).toLowerCase() === "expired",
					).length,
				});

				const calculateStats = (
					contracts: any[],
					licenses: any[] = [],
				): ContractStats => {
					const totalContracts = contracts.length;
					const totalBudget = contracts.reduce((sum, contract) => {
						const amount =
							typeof contract.amount === "number" ? contract.amount : 0;
						return sum + amount;
					}, 0);

					const activeContracts = contracts.filter(
						(c) => c.status === "active" || c.status === "Active",
					).length;
					const expiredContracts = contracts.filter(
						(c) => c.status === "expired" || c.status === "Expired",
					).length;
					const pendingContracts = contracts.filter(
						(c) =>
							c.status === "pending" ||
							c.status === "Pending" ||
							c.status === "pending-review",
					).length;

					const compliantContracts = contracts.filter(
						(c) =>
							c.compliance === "compliant" || c.compliance === "up-to-date",
					).length;
					const complianceRate =
						totalContracts > 0
							? Math.round((compliantContracts / totalContracts) * 100)
							: 0;

					return {
						totalContracts,
						totalBudget,
						activeContracts,
						expiredContracts,
						pendingContracts,
						...licenseCounts(licenses),
						complianceRate,
						staffCount: 0, // Will be set separately
					};
				};

				// Department configuration with divisions
				const departmentConfig: Record<
					string,
					{
						name: string;
						divisions: { id: string; name: string; description: string }[];
					}
				> = {
					IT: {
						name: "IT",
						divisions: [
							{
								id: "support",
								name: "Support",
								description: "Technical support and network services",
							},
							{
								id: "help-desk",
								name: "Help Desk",
								description: "IT support and help desk services",
							},
						],
					},
					Finance: {
						name: "Finance",
						divisions: [
							{
								id: "accounting",
								name: "Accounting",
								description: "Financial accounting and reporting",
							},
						],
					},
					Administration: {
						name: "Administration",
						divisions: [
							{
								id: "hr",
								name: "Human Resources",
								description: "Human resources administration",
							},
						],
					},
					Legal: {
						name: "Legal",
						divisions: [],
					},
					Operations: {
						name: "Operations",
						divisions: [
							{
								id: "behavioral-health",
								name: "Behavioral Health",
								description: "Behavioral health services and outcomes",
							},
							{
								id: "child-welfare",
								name: "Child Welfare",
								description: "Child welfare services and program metrics",
							},
							{
								id: "clinic",
								name: "Clinic",
								description: "Clinical services and patient outcomes",
							},
							{
								id: "cfs",
								name: "CFS",
								description: "CFS program analytics and performance",
							},
							{
								id: "residential",
								name: "Residential",
								description: "Residential services and facility metrics",
							},
						],
					},
					Sales: {
						name: "Sales",
						divisions: [],
					},
					Marketing: {
						name: "Marketing",
						divisions: [],
					},
					Executive: {
						name: "Executive",
						divisions: [
							{
								id: "c-suite",
								name: "C-Suite",
								description: "Executive leadership and management",
							},
						],
					},
					Engineering: {
						name: "Engineering",
						divisions: [],
					},
				};

				// Process each department
				const departmentsData: DepartmentAnalytics[] = [];

				Object.entries(departmentConfig).forEach(([deptKey, deptConfig]) => {
					const departmentContracts = contractsByDepartment[deptKey] || [];
					const departmentLicenses = licensesByDepartment[deptKey] || [];
					const departmentStats = calculateStats(
						departmentContracts,
						departmentLicenses,
					);

					// Division IDs now match database division names directly
					const dbDivisionMap: Record<string, string> = {
						"child-welfare": "child-welfare",
						"behavioral-health": "behavioral-health",
						cfs: "cfs",
						residential: "residential",
						clinic: "clinic",
						support: "support",
						"help-desk": "help-desk",
						hr: "hr",
						"c-suite": "c-suite",
						accounting: "accounting",
					};

					// Calculate department staff count from all its divisions
					let departmentStaffCount = 0;
					const divisions = deptConfig.divisions.map((division) => {
						const dbDivision = dbDivisionMap[division.id] || division.id;
						const divisionContracts = contractsByDivision[dbDivision] || [];
						const divisionLicenses = licensesByDivision[dbDivision] || [];
						const divisionStats = calculateStats(
							divisionContracts,
							divisionLicenses,
						);
						const divisionStaffCount = usersByDivision[dbDivision]?.length || 0;
						divisionStats.staffCount = divisionStaffCount;
						departmentStaffCount += divisionStaffCount;

						return {
							id: division.id,
							name: division.name,
							description: division.description,
							stats: divisionStats,
						};
					});

					departmentStats.staffCount = departmentStaffCount;

					departmentsData.push({
						name: deptConfig.name,
						divisions,
						totalStats: departmentStats,
					});
				});

				// Calculate overall totals across all departments
				const totalContracts = allContracts.total;
				const totalBudget = allContracts.rows.reduce(
					(sum: number, contract: any) => {
						const amount =
							typeof contract.amount === "number" ? contract.amount : 0;
						return sum + amount;
					},
					0,
				);
				const totalActiveStaff = allUsers.total;

				const overall = calculateStats(
					allContracts.rows,
					allLicenses.rows,
				);
				const totalStats = {
					totalContracts,
					totalBudget,
					totalActiveStaff,
					complianceRate: overall.complianceRate,
					totalLicenses: overall.totalLicenses,
					expiredLicenses: overall.expiredLicenses,
					activeLicenses: overall.activeLicenses,
				};

				return {
					departments: departmentsData,
					totalStats,
				};
			},
			CACHE_TTLS.veryLong,
		);

		// Return cached or fresh data with cache headers
		return Response.json(
			{
				success: true,
				data: cachedData,
			},
			{
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
					"X-Cache": "HIT",
				},
			},
		);
	} catch (error: any) {
		console.error("Organization analytics error:", {
			error: error?.message || "Unknown error",
			stack: error?.stack,
			timestamp: new Date().toISOString(),
		});
		return Response.json(
			{
				success: false,
				error: error?.message || "Failed to fetch organization analytics",
				timestamp: new Date().toISOString(),
			},
			{ status: 500 },
		);
	}
}
