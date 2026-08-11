"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { OrgUnit } from "@/lib/database/schemas/org-units.schema";
import { fetcher } from "@/lib/swr-config";

type UnitsResponse = { success: boolean; data: { units: OrgUnit[] } };

/**
 * Cascading department → division picker backed by /api/org-units.
 */
export function OrgUnitPicker({
	orgId,
	departmentCode,
	divisionCode,
	onDepartmentChange,
	onDivisionChange,
	disabled,
}: {
	orgId: string;
	departmentCode: string;
	divisionCode: string;
	onDepartmentChange: (code: string) => void;
	onDivisionChange: (code: string) => void;
	disabled?: boolean;
}) {
	const url = orgId
		? `/api/org-units?orgId=${encodeURIComponent(orgId)}`
		: null;
	const { data, isLoading } = useSWR<UnitsResponse>(url, fetcher);
	const units = data?.data?.units || [];

	const departments = useMemo(
		() =>
			units
				.filter((u) => u.type === "department" && u.active)
				.sort((a, b) => a.name.localeCompare(b.name)),
		[units],
	);

	const selectedDept = departments.find((d) => d.code === departmentCode);

	const divisions = useMemo(() => {
		if (!selectedDept) return [];
		return units
			.filter(
				(u) =>
					u.active &&
					u.parentId === selectedDept.$id &&
					(u.type === "division" || u.type === "program" || u.type === "team"),
			)
			.sort((a, b) => a.name.localeCompare(b.name));
	}, [units, selectedDept]);

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div className="space-y-2">
				<Label htmlFor="org-unit-department">Department</Label>
				<Select
					value={departmentCode || undefined}
					onValueChange={(value) => {
						onDepartmentChange(value);
						onDivisionChange("");
					}}
					disabled={disabled || isLoading}
				>
					<SelectTrigger
						id="org-unit-department"
						className="bg-white cursor-pointer"
					>
						<SelectValue
							placeholder={isLoading ? "Loading…" : "Select department"}
						/>
					</SelectTrigger>
					<SelectContent>
						{departments.map((d) => (
							<SelectItem key={d.$id} value={d.code}>
								{d.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label htmlFor="org-unit-division">Division</Label>
				<Select
					value={divisionCode || undefined}
					onValueChange={onDivisionChange}
					disabled={disabled || isLoading || !selectedDept}
				>
					<SelectTrigger
						id="org-unit-division"
						className="bg-white cursor-pointer"
					>
						<SelectValue
							placeholder={
								!selectedDept ? "Select department first" : "Select division"
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{divisions.map((d) => (
							<SelectItem key={d.$id} value={d.code}>
								{d.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
