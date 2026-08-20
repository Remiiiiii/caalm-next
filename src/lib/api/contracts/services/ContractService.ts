import { ID } from "node-appwrite";
import { getUserById } from "@/lib/actions/user.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";
import { ContractTypeMapper } from "./ContractTypeMapper";

/**
 * Contract Service
 * Handles contract creation and management operations
 */
export class ContractService {
	/**
	 * Map risk level to priority
	 */
	private static mapRiskToPriority(risk?: string): string {
		if (!risk) return "Medium";
		switch (risk) {
			case "critical":
				return "Urgent";
			case "high":
				return "High";
			case "low":
				return "Low";
			default:
				return "Medium";
		}
	}

	/**
	 * Map risk level to compliance status
	 */
	private static mapRiskToCompliance(risk?: string): string {
		if (!risk) return "action-required";
		switch (risk) {
			case "critical":
				return "non-compliant";
			case "high":
				return "action-required";
			case "low":
				return "up-to-date";
			default:
				return "action-required";
		}
	}

	/**
	 * Sanitize payload by removing empty values
	 */
	private static sanitizePayload<T extends Record<string, unknown>>(
		payload: T,
	): Partial<T> {
		return Object.fromEntries(
			Object.entries(payload).filter(([_, value]) => {
				if (Array.isArray(value)) {
					return value.length > 0;
				}
				return value !== undefined && value !== null && value !== "";
			}),
		) as Partial<T>;
	}

	/**
	 * Calculate days until expiry
	 */
	private static calculateDaysUntilExpiry(
		expiryDate: string,
	): number | undefined {
		if (!expiryDate) return undefined;
		try {
			// Parse date-only strings (YYYY-MM-DD) using local timezone to avoid timezone issues
			const expiryStr = expiryDate.split("T")[0];
			const [year, month, day] = expiryStr.split("-").map(Number);
			const expiry = new Date(year, month - 1, day);
			expiry.setHours(0, 0, 0, 0);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const timeDiff = expiry.getTime() - today.getTime();
			return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
		} catch (_error) {
			return undefined;
		}
	}

	/**
	 * Get assigned managers names from IDs
	 */
	private static async getAssignedManagersNames(
		managerIds: string[],
	): Promise<string[]> {
		if (managerIds.length === 0) return [];

		const managerNames: string[] = [];
		for (const managerId of managerIds) {
			try {
				const user = await getUserById(managerId);
				if (user?.fullName) {
					managerNames.push(user.fullName);
				} else {
					managerNames.push(managerId);
				}
			} catch (error) {
				console.error(`Failed to fetch manager ${managerId}:`, error);
				managerNames.push(managerId);
			}
		}
		return managerNames;
	}

	/**
	 * Create contract from form data
	 */
	static async createContract(ownerId: string, fileId: string, formData: any) {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.contractsCollectionId) {
			throw new Error("Database configuration missing");
		}

		const defaultOrg = await getUserDefaultOrganization(ownerId);
		if (!defaultOrg) {
			throw new Error("Could not determine user organization");
		}

		const { assertCanCreateContract } = await import(
			"@/lib/billing/planLimits"
		);
		await assertCanCreateContract(defaultOrg.orgId);

		const contractExpiryDate = formData.expiryDate
			? new Date(formData.expiryDate).toISOString().split("T")[0]
			: new Date().toISOString().split("T")[0];

		const status =
			formData.lifecycleStatus === "terminated"
				? "action-required"
				: "pending-review";

		const assignedManagers = await ContractService.getAssignedManagersNames(
			formData.assignedManagers || [],
		);

		const mappedContractType = ContractTypeMapper.map(formData.contractType);
		const daysUntilExpiry =
			ContractService.calculateDaysUntilExpiry(contractExpiryDate);

		const contractDocument = ContractService.sanitizePayload({
			contractName: formData.contractName,
			contractExpiryDate,
			status,
			startDate: formData.startDate
				? new Date(formData.startDate).toISOString()
				: undefined,
			executionDate: formData.executionDate
				? new Date(formData.executionDate).toISOString()
				: undefined,
			autoRenew: formData.autoRenew,
			renewalNoticeDays: formData.renewalNoticeDays
				? parseInt(formData.renewalNoticeDays, 10)
				: undefined,
			amount: formData.amount ? parseFloat(formData.amount) : undefined,
			currencyCode: formData.currencyCode || "USD",
			notToExceedAmount: formData.notToExceedAmount
				? parseFloat(formData.notToExceedAmount)
				: undefined,
			paymentTerms: formData.paymentTerms,
			paymentSchedule: formData.paymentSchedule,
			budgetCode: formData.budgetCode,
			costCenter: formData.costCenter,
			daysUntilExpiry,
			compliance:
				formData.compliance ??
				ContractService.mapRiskToCompliance(formData.riskLevel),
			assignedManagers,
			department: formData.assignToDepartment || formData.department,
			businessUnit: formData.businessUnit,
			subDepartment: formData.subDepartment,
			departmentOwner: formData.departmentOwner,
			contractType: mappedContractType,
			contractCategory: formData.contractCategory,
			vendor: formData.vendor ?? formData.counterpartyLegalName,
			contractNumber: formData.contractNumber,
			priority:
				formData.priority ??
				ContractService.mapRiskToPriority(formData.riskLevel),
			description: formData.description,
			contractOwnerId: formData.contractOwnerId || ownerId,
			lifecycleStatus: formData.lifecycleStatus || "draft",
			riskLevel: formData.riskLevel,
			fileId,
			fileRef: fileId,
			orgId: defaultOrg.orgId,
		});

		const contract = await tablesDB.createRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			rowId: ID.unique(),
			data: contractDocument,
		});

		return contract;
	}

	/**
	 * Update file row with contract metadata
	 */
	static async updateFileWithContractMetadata(fileId: string, contract: any) {
		const { tablesDB } = await createAdminClient();

		if (!appwriteConfig.databaseId || !appwriteConfig.filesCollectionId) {
			throw new Error("Database configuration missing");
		}

		const fileUpdateData = ContractService.sanitizePayload({
			contractId: contract.$id,
			contractExpiryDate: contract.contractExpiryDate,
			status: contract.status,
			contractName: contract.contractName,
			contractType: contract.contractType,
			amount: contract.amount,
			vendor: contract.vendor,
			contractNumber: contract.contractNumber,
			priority: contract.priority,
			compliance: contract.compliance,
			department: contract.department,
			assignedManagers: contract.assignedManagers,
		});

		await tablesDB.updateRow({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.filesCollectionId,
			rowId: fileId,
			data: fileUpdateData,
		});
	}
}
