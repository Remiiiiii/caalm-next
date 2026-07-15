/**
 * Centralized cache key management for the application
 * Prevents cache key collisions and ensures consistency
 */

import * as crypto from "node:crypto";

export const CACHE_KEYS = {
	// Dashboard
	dashboard: {
		unified: (orgId: string, userId: string) =>
			`dashboard:unified:${orgId}:${userId}`,
		department: (orgId: string, userId: string, division: string) =>
			`dashboard:department:${orgId}:${userId}:${division}`,
		stats: (orgId: string) => `dashboard:stats:${orgId}`,
		invitations: (orgId: string) => `dashboard:invitations:${orgId}`,
		files: (orgId?: string, limit?: number) =>
			orgId
				? `dashboard:files:${orgId}:${limit || 10}`
				: `dashboard:files:${limit || 10}`,
	},

	// Analytics
	analytics: {
		unified: (userId: string) => `analytics:unified:${userId}`,
		admin: () => `analytics:admin`,
		department: (deptId: string) => `analytics:dept:${deptId}`,
		contracts: (department: string) => `analytics:contracts:${department}`,
		stats: (department: string) => `analytics:stats:${department}`,
		performance: (department: string) => `analytics:performance:${department}`,
		compliance: (department: string) => `analytics:compliance:${department}`,
	},

	// Calendar
	calendar: {
		events: (year: number, month: number, userId?: string) =>
			userId
				? `calendar:events:${userId}:${year}:${month}`
				: `calendar:events:${year}:${month}`,
		event: (eventId: string) => `calendar:event:${eventId}`,
		shared: (userId: string, orgId: string) =>
			`calendar:shared:${userId}:${orgId}`,
		holidays: (year: number, month: number) =>
			`calendar:holidays:${year}:${month}`,
	},

	// Notifications
	notifications: {
		user: (userId: string) => `notifications:user:${userId}`,
		stats: (userId: string) => `notifications:stats:${userId}`,
		unreadCount: (userId: string) => `notifications:unread:${userId}`,
		types: () => `notifications:types`,
		settings: (userId: string) => `notifications:settings:${userId}`,
	},

	// Contracts
	contracts: {
		all: () => `contracts:all`,
		user: (userId: string) => `contracts:user:${userId}`,
		expirations: () => `contracts:expirations`,
		drafts: (ownerId: string) => `contracts:drafts:${ownerId}`,
		database: (limit: number, offset: number) =>
			`contracts:database:${limit}:${offset}`,
		details: (contractId: string) => `contracts:details:${contractId}`,
		manager: (userId: string) => `contracts:manager:${userId}`,
	},

	// Licenses
	licenses: {
		all: () => `licenses:all`,
		expiring: (days: number) => `licenses:expiring:${days}`,
		database: (limit: number, offset: number) =>
			`licenses:database:${limit}:${offset}`,
		details: (licenseId: string) => `licenses:details:${licenseId}`,
		reports: (type: string) => `licenses:reports:${type}`,
	},

	// Reports
	reports: {
		user: (userId: string) => `reports:user:${userId}`,
		templates: () => `reports:templates`,
		report: (reportId: string) => `reports:report:${reportId}`,
	},

	// Users
	users: {
		all: () => `users:all`,
		uninvited: () => `users:uninvited`,
		search: (query: string) => `users:search:${query}`,
		byIds: (userIds: string[]) => {
			// Create a consistent cache key by sorting and hashing the IDs
			const sortedIds = [...userIds].sort().join(",");
			// Use a hash for very long arrays to avoid key length issues
			if (sortedIds.length > 200) {
				const hash = crypto.createHash("md5").update(sortedIds).digest("hex");
				return `users:byIds:${hash}`;
			}
			return `users:byIds:${sortedIds}`;
		},
		single: (userId: string) => `users:single:${userId}`,
		byAccountId: (accountId: string) => `users:byAccountId:${accountId}`,
		byEmail: (email: string) => `users:byEmail:${email.toLowerCase()}`,
		byFullName: (fullName: string) => `users:byFullName:${fullName}`,
		roleByUserId: (userId: string, orgId?: string) =>
			orgId ? `users:role:${userId}:${orgId}` : `users:role:${userId}`,
		roleNameByUserId: (userId: string, orgId?: string) =>
			orgId ? `users:roleName:${userId}:${orgId}` : `users:roleName:${userId}`,
	},

	// Recent Activities
	recentActivities: {
		list: (limit?: number) =>
			limit ? `recent-activities:${limit}` : `recent-activities`,
	},

	// Audit Logs
	audits: {
		logs: (filters: string) => `audits:logs:${filters}`,
		stats: () => `audits:stats`,
		complianceStatus: (userId: string) => `audits:compliance-status:${userId}`,
	},

	// Search
	search: {
		global: (query: string) => `search:global:${query}`,
		suggestions: (query: string) => `search:suggestions:${query}`,
	},

	// RBAC - Permissions and Roles
	rbac: {
		permissions: (userId: string, orgId?: string) =>
			`rbac:permissions:${userId}${orgId ? `:${orgId}` : ""}`,
		userRoles: (userId: string, orgId?: string) =>
			`rbac:userRoles:${userId}${orgId ? `:${orgId}` : ""}`,
		defaultOrg: (userId: string) => `rbac:defaultOrg:${userId}`,
		userWithRoles: (userId: string) => `rbac:userWithRoles:${userId}`,
		check: (userId: string, orgId?: string) =>
			orgId ? `rbac:check:${userId}:${orgId}` : `rbac:check:${userId}`,
	},

	// Storage
	storage: {
		usage: () => `storage:usage`,
	},

	// IT Metrics
	it: {
		storageMetrics: () => `it:storage-metrics`,
	},

	// Weather
	weather: {
		byCoords: (lat: string, lon: string) => `weather:coords:${lat}:${lon}`,
		byCity: (city: string) => `weather:city:${city.toLowerCase()}`,
	},
} as const;

/**
 * Cache TTLs in seconds
 */
export const CACHE_TTLS = {
	short: 120, // 2 minutes - for frequently changing data
	medium: 300, // 5 minutes - for moderately changing data
	long: 600, // 10 minutes - for slowly changing data
	veryLong: 900, // 15 minutes - for rarely changing data
	static: 3600, // 1 hour - for static/rarely changing data
} as const;

/**
 * Get TTL for a specific cache key type
 */
export const getTTLForRoute = (route: string): number => {
	const ttlMap: Record<string, number> = {
		// Dashboard
		"dashboard/unified": CACHE_TTLS.veryLong,
		"dashboard/department": CACHE_TTLS.short, // 2 minutes
		"dashboard/stats": CACHE_TTLS.medium, // 5 minutes
		"dashboard/invitations": CACHE_TTLS.medium, // 5 minutes
		"dashboard/files": CACHE_TTLS.medium, // 5 minutes

		// Analytics
		"analytics/unified": CACHE_TTLS.veryLong,
		"analytics/admin": CACHE_TTLS.veryLong,
		"analytics/contracts": CACHE_TTLS.veryLong, // 15 minutes
		"analytics/stats": CACHE_TTLS.veryLong, // 15 minutes
		"analytics/performance": CACHE_TTLS.veryLong, // 15 minutes
		"analytics/compliance": CACHE_TTLS.veryLong, // 15 minutes

		// Calendar
		"calendar/events": CACHE_TTLS.medium,
		"calendar/shared": CACHE_TTLS.medium,
		"calendar/holidays": CACHE_TTLS.static, // 1 hour

		// Notifications
		notifications: CACHE_TTLS.short,
		"notifications/stats": CACHE_TTLS.medium,
		"notifications/types": CACHE_TTLS.veryLong, // 15 minutes
		"notifications/settings": CACHE_TTLS.long, // 10 minutes

		// Contracts
		contracts: CACHE_TTLS.long,
		"contracts/all": CACHE_TTLS.long, // 10 minutes
		"contracts/database": CACHE_TTLS.long, // 10 minutes
		"contracts/details": CACHE_TTLS.medium, // 5 minutes
		"contracts/manager": CACHE_TTLS.medium, // 5 minutes
		"contracts/check-expirations": CACHE_TTLS.static,
		"contracts/drafts": CACHE_TTLS.medium,

		// Licenses
		licenses: CACHE_TTLS.long,
		"licenses/all": CACHE_TTLS.long, // 10 minutes
		"licenses/database": CACHE_TTLS.long, // 10 minutes
		"licenses/details": CACHE_TTLS.medium, // 5 minutes
		"licenses/expiring": CACHE_TTLS.medium, // 5 minutes
		"licenses/reports": CACHE_TTLS.veryLong, // 15 minutes

		// Reports
		reports: CACHE_TTLS.veryLong, // 15 minutes

		// Users
		users: CACHE_TTLS.veryLong,
		"users/uninvited": CACHE_TTLS.veryLong, // 15 minutes
		"users/get-by-ids": CACHE_TTLS.long,
		"users/role": CACHE_TTLS.veryLong, // 15 minutes
		"users/role-name": CACHE_TTLS.veryLong, // 15 minutes

		// Recent Activities
		"recent-activities": CACHE_TTLS.short, // 2 minutes

		// Audits
		"audits/logs": CACHE_TTLS.medium,
		"audits/stats": CACHE_TTLS.long, // 10 minutes

		// RBAC
		"rbac/permissions": CACHE_TTLS.veryLong,
		"rbac/userRoles": CACHE_TTLS.veryLong,
		"rbac/defaultOrg": CACHE_TTLS.static,
		"rbac/check": CACHE_TTLS.veryLong, // 15 minutes

		// Storage
		"storage/usage": CACHE_TTLS.medium, // 5 minutes

		// IT
		"it/storage-metrics": CACHE_TTLS.medium, // 5 minutes

		// Weather
		weather: CACHE_TTLS.long, // 10 minutes
	};

	return ttlMap[route] || CACHE_TTLS.medium;
};
