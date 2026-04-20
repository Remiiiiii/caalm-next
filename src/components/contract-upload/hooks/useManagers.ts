/**
 * Hook for managing contract managers and department filtering
 * Defers data fetching until dialog is opened
 */

import { useEffect, useState } from "react";
import {
	getAllManagers,
	getUsersByDepartment,
} from "@/lib/actions/database.actions";
import type { Manager } from "../types";

export function useManagers(isDialogOpen: boolean) {
	const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
	const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
	const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
	const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

	// Fetch all managers when dialog opens (deferred loading)
	useEffect(() => {
		if (isDialogOpen && availableManagers.length === 0) {
			fetchManagers();
		}
	}, [isDialogOpen, availableManagers.length, fetchManagers]);

	const fetchManagers = async () => {
		try {
			const managers = await getAllManagers();
			if (managers) {
				const typedManagers = managers.map(
					(manager: {
						$id: string;
						fullName?: string;
						email?: string;
						division?: string;
					}) => ({
						$id: manager.$id,
						fullName: manager.fullName || "Unknown",
						email: manager.email || "",
						division: manager.division,
					}),
				);
				setAvailableManagers(typedManagers);
				setFilteredManagers([]);
			}
		} catch (error) {
			console.error("Failed to fetch managers:", error);
		}
	};

	const fetchDepartmentManagers = async (department: string) => {
		try {
			const departmentManagers = await getUsersByDepartment(department);
			if (departmentManagers && departmentManagers.length > 0) {
				const typedManagers = departmentManagers.map(
					(manager: {
						$id: string;
						fullName?: string;
						email?: string;
						division?: string;
					}) => ({
						$id: manager.$id,
						fullName: manager.fullName || "Unknown",
						email: manager.email || "",
						division: manager.division,
					}),
				);
				setFilteredManagers(typedManagers);
				// Clear selected managers when department changes
				setSelectedManagers([]);
			} else {
				// No managers found in this department
				setFilteredManagers([]);
				setSelectedManagers([]);
			}
		} catch (error) {
			console.error("Failed to fetch department managers:", error);
		}
	};

	return {
		availableManagers,
		filteredManagers,
		selectedManagers,
		setSelectedManagers,
		selectedApprovers,
		setSelectedApprovers,
		fetchManagers,
		fetchDepartmentManagers,
	};
}
