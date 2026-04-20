"use server";

import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	getAllManagers as getAllManagersRBAC,
	getManagersByDepartment,
	getManagersByDivision,
} from "@/lib/utils/get-users-by-role";

const handleError = (error: unknown, message: string) => {
	console.log(error, message);
	throw error;
};

export const getContractDepartmentEnums = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		const attr = (await tablesDB.getColumn({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.contractsCollectionId,
			key: "department",
		})) as { elements?: string[] };
		return attr.elements || [];
	} catch (error) {
		handleError(error, "Failed to fetch contract department enums");
	}
};

export const getUserDivisionEnums = async () => {
	const { tablesDB } = await createAdminClient();
	try {
		const attr = (await tablesDB.getColumn({
			databaseId: appwriteConfig.databaseId,
			tableId: appwriteConfig.usersCollectionId,
			key: "division",
		})) as { elements?: string[] };
		return attr.elements || [];
	} catch (error) {
		handleError(error, "Failed to fetch user division enums");
	}
};

export const getUsersByDivision = async (division: string) => {
	try {
		return await getManagersByDivision(division);
	} catch (error) {
		handleError(error, "Failed to fetch users by division");
	}
};

export const getUsersByDepartment = async (department: string) => {
	try {
		return await getManagersByDepartment(department);
	} catch (error) {
		handleError(error, "Failed to fetch users by department");
	}
};

export const getAllManagers = async () => {
	try {
		return await getAllManagersRBAC();
	} catch (error) {
		handleError(error, "Failed to fetch all managers");
	}
};
