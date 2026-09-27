/**
 * Hook for managing license managers and department filtering
 * Defers data fetching until dialog is opened
 */

import { useCallback, useEffect, useState } from "react";
import {
	getAllManagers,
	getUsersByDepartment,
} from "@/lib/actions/database.actions";
import {
	type AssigneeSource,
	pickAssigneeIds,
} from "@/lib/assignments/resolve-default-assignee";
import type { Manager } from "../types";

export function useManagers(
	isDialogOpen: boolean,
	fallbackUser?: { $id: string; fullName: string; email?: string },
) {
	const [availableManagers, setAvailableManagers] = useState<Manager[]>([]);
	const [filteredManagers, setFilteredManagers] = useState<Manager[]>([]);
	const [selectedManagers, setSelectedManagers] = useState<string[]>([]);
	const [assigneeSource, setAssigneeSource] =
		useState<AssigneeSource>("selected");

	const fetchManagers = useCallback(async () => {
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
	}, []);

	useEffect(() => {
		if (isDialogOpen && availableManagers.length === 0) {
			void fetchManagers();
		}
	}, [isDialogOpen, availableManagers.length, fetchManagers]);

	const fetchDepartmentManagers = useCallback(
		async (department: string, division?: string) => {
			try {
				const departmentManagers = department
					? await getUsersByDepartment(department)
					: [];
				const typedDept = (departmentManagers || []).map(
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
				const pick = pickAssigneeIds({
					divisionCandidates: typedDept,
					departmentCandidates: typedDept,
					orgCandidates: availableManagers,
					fallbackUser,
					division,
				});
				const display =
					typedDept.length > 0
						? typedDept
						: (pick.managers as Manager[]);
				setFilteredManagers(display);
				setAssigneeSource(pick.source);
				setSelectedManagers(pick.ids);
			} catch (error) {
				console.error("Failed to fetch department managers:", error);
				if (fallbackUser?.$id) {
					setFilteredManagers([
						{
							$id: fallbackUser.$id,
							fullName: fallbackUser.fullName || "You",
							email: fallbackUser.email || "",
						},
					]);
					setSelectedManagers([fallbackUser.$id]);
					setAssigneeSource("uploader");
				} else {
					setFilteredManagers([]);
					setSelectedManagers([]);
				}
			}
		},
		[availableManagers, fallbackUser],
	);

	return {
		availableManagers,
		filteredManagers,
		selectedManagers,
		setSelectedManagers,
		fetchManagers,
		fetchDepartmentManagers,
		assigneeSource,
	};
}
