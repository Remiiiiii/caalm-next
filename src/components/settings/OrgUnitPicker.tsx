"use client";

import { useMemo } from "react";
import useSWR from "swr";
import {
	CONTRACT_DEPARTMENTS,
	DIVISION_TO_DEPARTMENT,
	USER_DIVISIONS,
	formatDivisionName,
	type UserDivision,
} from "../../../constants";
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
import { cn } from "@/lib/utils";

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
	divisionOptional = false,
	layout = "stacked",
	departmentRequired = false,
}: {
	orgId: string;
	departmentCode: string;
	divisionCode: string;
	onDepartmentChange: (code: string) => void;
	onDivisionChange: (code: string) => void;
	disabled?: boolean;
	/** When true, division is not required and empty divisions show helper copy. */
	divisionOptional?: boolean;
	/** stacked: 2-col grid. inline: children participate in a parent grid (use display:contents). */
	layout?: "stacked" | "inline";
	departmentRequired?: boolean;
}) {
	const url = orgId
		? `/api/org-units?orgId=${encodeURIComponent(orgId)}`
		: null;
	const { data, error, isLoading } = useSWR<UnitsResponse>(url, fetcher);
	const apiUnits = data?.data?.units || [];

	const catalogUnits = useMemo((): OrgUnit[] => {
		const deptUnits: OrgUnit[] = CONTRACT_DEPARTMENTS.map((code, index) => ({
			$id: `catalog-dept-${code}`,
			orgId,
			type: "department",
			parentId: null,
			code,
			name: code,
			active: true,
			sortOrder: index,
		}));
		const divUnits: OrgUnit[] = USER_DIVISIONS.map((code, index) => ({
			$id: `catalog-div-${code}`,
			orgId,
			type: "division",
			parentId: `catalog-dept-${DIVISION_TO_DEPARTMENT[code as UserDivision]}`,
			code,
			name: formatDivisionName(code as UserDivision),
			active: true,
			sortOrder: index,
		}));
		return [...deptUnits, ...divUnits];
	}, [orgId]);

	const units =
		apiUnits.length > 0 ? apiUnits : !isLoading ? catalogUnits : [];

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
		<div
			className={cn(
				layout === "inline"
					? "contents"
					: "grid grid-cols-1 sm:grid-cols-2 gap-4",
			)}
		>
			<div className="min-w-0 space-y-2">
				<Label
					htmlFor="org-unit-department"
					className={cn(
						"flex items-center gap-1.5",
						layout === "inline" && "text-xs font-semibold text-slate-700",
					)}
				>
					Department
					{departmentRequired && (
						<span className="font-bold text-red" aria-hidden>
							*
						</span>
					)}
				</Label>
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
						className="bg-white cursor-pointer min-w-0"
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
				{error && apiUnits.length === 0 && !isLoading && (
					<p className="text-[11px] text-slate-500">
						Using default department list. Org structure sync is temporarily
						unavailable.
					</p>
				)}
			</div>
			<div className="min-w-0 space-y-2">
				<Label
					htmlFor="org-unit-division"
					className={cn(
						layout === "inline" && "text-xs font-semibold text-slate-700",
					)}
				>
					Division
				</Label>
				<Select
					value={divisionCode || undefined}
					onValueChange={onDivisionChange}
					disabled={disabled || isLoading || !selectedDept || divisions.length === 0}
				>
					<SelectTrigger
						id="org-unit-division"
						className="bg-white cursor-pointer min-w-0"
					>
						<SelectValue
							placeholder={
								!selectedDept
									? "Select department first"
									: divisions.length === 0
										? "No division for this department"
										: "Select division"
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
				{layout === "stacked" && selectedDept && divisionOptional && (
					<p className="text-[11px] text-slate-500">
						Division is optional. Selecting {selectedDept.name} in Department is
						enough to send the invite.
					</p>
				)}
			</div>
		</div>
	);
}
