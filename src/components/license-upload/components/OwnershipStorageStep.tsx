/**
 * Ownership & Storage step: division/department/responsible-owner (the
 * existing manager-cascade UI) plus file location. Kept as its own
 * component rather than a DynamicLicenseStep field, because the assignee
 * picker depends on a live department/division lookup, not static options.
 */

"use client";

import type { UseFormReturn } from "react-hook-form";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AssigneeSource } from "@/lib/assignments/resolve-default-assignee";
import { assigneeFallbackMessage } from "@/lib/assignments/resolve-default-assignee";
import type { LicenseUploadFormData } from "../schema";
import type { Manager } from "../types";

const DIVISIONS = [
	"administration",
	"c-suite",
	"management",
	"childwelfare",
	"behavioralhealth",
	"clinic",
	"residential",
	"cins-fins-snap",
];

function formatLabel(value: string) {
	return value.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export interface OwnershipStorageStepProps {
	form: UseFormReturn<LicenseUploadFormData>;
	departments: string[];
	filteredManagers: Manager[];
	selectedManagers: string[];
	setSelectedManagers: (ids: string[]) => void;
	fetchDepartmentManagers: (
		department: string,
		division?: string,
	) => Promise<void>;
	assigneeSource?: AssigneeSource;
}

export default function OwnershipStorageStep({
	form,
	departments,
	filteredManagers,
	selectedManagers,
	setSelectedManagers,
	fetchDepartmentManagers,
	assigneeSource = "selected",
}: OwnershipStorageStepProps) {
	const selectedDepartment = form.watch("department");
	const selectedDivision = form.watch("division");

	return (
		<div className="space-y-3.5">
			<div className="responsive-form-grid">
				<FormField
					control={form.control}
					name="division"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-sm text-slate-700 mb-1 block">
								Division <span className="text-red">*</span>
							</FormLabel>
							<Select
								onValueChange={(value) => {
									field.onChange(value);
									if (selectedDepartment) {
										void fetchDepartmentManagers(selectedDepartment, value);
									}
								}}
								value={field.value || ""}
							>
								<FormControl>
									<SelectTrigger className="bg-white border-slate-300">
										<SelectValue placeholder="Select division" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{DIVISIONS.map((div) => (
										<SelectItem key={div} value={div}>
											{formatLabel(div)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="department"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-sm text-slate-700 mb-1 block">
								Department <span className="text-red">*</span>
							</FormLabel>
							<Select
								onValueChange={(value) => {
									field.onChange(value);
									void fetchDepartmentManagers(value, selectedDivision);
								}}
								value={field.value || ""}
							>
								<FormControl>
									<SelectTrigger className="bg-white border-slate-300">
										<SelectValue placeholder="Select department" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									{departments.map((dept) => (
										<SelectItem key={dept} value={dept}>
											{dept}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<div>
				<FormLabel className="text-sm text-slate-700 mb-1 block">
					Responsible Owner <span className="text-red">*</span>
				</FormLabel>
				{!selectedDepartment ? (
					<p className="text-sm text-slate-500">
						Select a department and division first to see assignees.
					</p>
				) : (
					<>
						<Select
							value={selectedManagers[0] || ""}
							onValueChange={(value) =>
								setSelectedManagers(value ? [value] : [])
							}
						>
							<SelectTrigger className="bg-white border-[0.25px] border-slate-300 mt-1">
								<SelectValue placeholder="Select assignee" />
							</SelectTrigger>
							<SelectContent>
								{filteredManagers.map((manager) => (
									<SelectItem key={manager.$id} value={manager.$id}>
										{manager.fullName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{assigneeFallbackMessage(
							assigneeSource,
							filteredManagers.find((m) => m.$id === selectedManagers[0])
								?.fullName,
						) ? (
							<p className="text-xs text-slate-600 mt-2">
								{assigneeFallbackMessage(
									assigneeSource,
									filteredManagers.find((m) => m.$id === selectedManagers[0])
										?.fullName,
								)}
							</p>
						) : null}
					</>
				)}
			</div>

			<FormField
				control={form.control}
				name="fileLocation"
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-sm text-slate-700 mb-1 block">
							File Location
						</FormLabel>
						<FormControl>
							<Input
								placeholder="e.g. SharePoint / Compliance / Licenses"
								{...field}
								value={field.value || ""}
								className="bg-white border-slate-300"
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}
