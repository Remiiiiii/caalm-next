import type { UIFileDoc } from "@/types/files";

/**
 * Helper functions and mock data for ContractStatusPieChart tests
 */

export function createMockContract(
	overrides: Partial<UIFileDoc> = {},
): UIFileDoc {
	const now = new Date();
	const defaultExpiry = new Date(now.getTime() + 200 * 24 * 60 * 60 * 1000);

	return {
		$id: `contract-${Math.random().toString(36).slice(2, 11)}`,
		$createdAt: new Date().toISOString(),
		$updatedAt: new Date().toISOString(),
		$permissions: [],
		$collectionId: "contracts",
		$databaseId: "default-db",
		$sequence: 0,
		type: "contract",
		extension: "pdf",
		url: "",
		name: "Test Contract",
		size: 0,
		owner: "user-1",
		users: [],
		contractName: "Test Contract",
		status: "active",
		contractExpiryDate: defaultExpiry.toISOString(),
		isExpired: false,
		...overrides,
	} as UIFileDoc;
}

export function createActiveContract(
	daysUntilExpiry: number = 200,
	overrides: Partial<UIFileDoc> = {},
): UIFileDoc {
	const expiryDate = new Date(
		Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000,
	);

	return createMockContract({
		status: "active",
		contractExpiryDate: expiryDate.toISOString(),
		isExpired: false,
		...overrides,
	});
}

export function createExpiringContract(
	daysUntilExpiry: number = 30,
	overrides: Partial<UIFileDoc> = {},
): UIFileDoc {
	const expiryDate = new Date(
		Date.now() + daysUntilExpiry * 24 * 60 * 60 * 1000,
	);

	return createMockContract({
		status: "active",
		contractExpiryDate: expiryDate.toISOString(),
		isExpired: false,
		...overrides,
	});
}

export function createCompletedContract(
	overrides: Partial<UIFileDoc> = {},
): UIFileDoc {
	return createMockContract({
		status: "inactive",
		isExpired: false,
		...overrides,
	});
}

export function createExpiredContract(
	daysAgo: number = 10,
	overrides: Partial<UIFileDoc> = {},
): UIFileDoc {
	const expiryDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

	return createMockContract({
		status: "expired",
		contractExpiryDate: expiryDate.toISOString(),
		isExpired: true,
		...overrides,
	});
}
