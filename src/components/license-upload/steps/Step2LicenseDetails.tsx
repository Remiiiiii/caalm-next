/**
 * Step 2: License Details Form
 */

"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import {
	AiFilledLabelHint,
	aiFieldItemClassName,
} from "@/components/contract-upload/AiExtractionReview";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CATEGORIES, COMPLIANCE_STATUSES, LICENSE_TYPES } from "../constants";
import type { LicenseUploadFormData } from "../schema";
import type { Manager } from "../types";

const CURRENCY_CODES = ["USD", "EUR", "GBP", "CAD", "MXN", "JPY", "AUD"];

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

function formatDateValue(value: unknown): string | null {
	if (!value) return null;
	const date =
		value instanceof Date
			? value
			: typeof value === "string" || typeof value === "number"
				? new Date(value)
				: null;
	if (!date || Number.isNaN(date.getTime())) return null;
	try {
		return format(date, "PPP");
	} catch {
		return null;
	}
}

export interface Step2LicenseDetailsProps {
	form: UseFormReturn<LicenseUploadFormData>;
	departments: string[];
	filteredManagers: Manager[];
	selectedManagers: string[];
	setSelectedManagers: (ids: string[]) => void;
	fetchDepartmentManagers: (department: string) => Promise<void>;
	aiFilledFields?: string[];
	fieldConfidence?: Record<string, number>;
}

export default function Step2LicenseDetails({
	form,
	departments,
	filteredManagers,
	selectedManagers,
	setSelectedManagers,
	fetchDepartmentManagers,
	aiFilledFields = [],
	fieldConfidence = {},
}: Step2LicenseDetailsProps) {
	const selectedDepartment = form.watch("department");
	const category = form.watch("category");
	const showVendorProduct =
		category !== "certificate" && category !== "insurance";

	const aiClass = (name: string) =>
		aiFieldItemClassName(name, aiFilledFields, fieldConfidence);

	const AiHint = ({ name }: { name: string }) => (
		<AiFilledLabelHint
			fieldName={name}
			aiFilledFields={aiFilledFields}
			fieldConfidence={fieldConfidence}
		/>
	);

	return (
		<div className="space-y-6">
			{/* 1. License identity */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					License identity
				</h3>
				<FormField
					control={form.control}
					name="licenseName"
					render={({ field }) => (
						<div
							className={cn(
								"bg-slate-50 rounded-lg p-4 border border-slate-200",
								aiClass("licenseName"),
							)}
						>
							<FormItem>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									License Name <span className="text-red">*</span>
									<AiHint name="licenseName" />
								</FormLabel>
								<FormControl>
									<Input
										placeholder="Enter license name"
										{...field}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						</div>
					)}
				/>

				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="licenseNumber"
						render={({ field }) => (
							<FormItem className={cn(aiClass("licenseNumber"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									License Number
									<AiHint name="licenseNumber" />
								</FormLabel>
								<FormControl>
									<Input
										placeholder="License number"
										{...field}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="status"
						render={() => (
							<FormItem>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Status after submit
								</FormLabel>
								<div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-700">
									Pending Review — becomes Active only after approval
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="licenseType"
						render={({ field }) => (
							<FormItem className={cn(aiClass("licenseType"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									License Type <span className="text-red">*</span>
									<AiHint name="licenseType" />
								</FormLabel>
								<Select onValueChange={field.onChange} value={field.value}>
									<FormControl>
										<SelectTrigger className="bg-white border-slate-300">
											<SelectValue placeholder="Select type" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{LICENSE_TYPES.map((type) => (
											<SelectItem key={type} value={type}>
												{formatLabel(type)}
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
						name="category"
						render={({ field }) => (
							<FormItem className={cn(aiClass("category"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Category
									<AiHint name="category" />
								</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value || ""}
								>
									<FormControl>
										<SelectTrigger className="bg-white border-slate-300">
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{CATEGORIES.map((cat) => (
											<SelectItem key={cat} value={cat}>
												{formatLabel(cat)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			{/* 2. Authority & term */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					Authority &amp; term
				</h3>
				<div
					className={cn(
						"bg-slate-50 rounded-lg p-4 border border-slate-200",
						aiClass("issuingAuthority"),
					)}
				>
					<FormField
						control={form.control}
						name="issuingAuthority"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Issuing Authority <span className="text-red">*</span>
									<AiHint name="issuingAuthority" />
								</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g. FL Dept. of Children and Families"
										{...field}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="issueDate"
						render={({ field }) => (
							<FormItem className={cn(aiClass("issueDate"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Issue Date
									<AiHint name="issueDate" />
								</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className="w-full justify-start text-left font-normal bg-white border-slate-300"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{(() => {
													const label = formatDateValue(field.value);
													return label ? (
														label
													) : (
														<span>Pick a date</span>
													);
												})()}
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={field.onChange}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="licenseExpiryDate"
						render={({ field }) => (
							<FormItem className={cn(aiClass("licenseExpiryDate"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Expiry Date <span className="text-red">*</span>
									<AiHint name="licenseExpiryDate" />
								</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className="w-full justify-start text-left font-normal bg-white border-slate-300"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{(() => {
													const label = formatDateValue(field.value);
													return label ? (
														label
													) : (
														<span>Pick a date</span>
													);
												})()}
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={field.onChange}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="renewalDate"
						render={({ field }) => (
							<FormItem className={cn(aiClass("renewalDate"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Renewal Due Date
									<AiHint name="renewalDate" />
								</FormLabel>
								<Popover>
									<PopoverTrigger asChild>
										<FormControl>
											<Button
												variant="outline"
												className="w-full justify-start text-left font-normal bg-white border-slate-300"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
												{(() => {
													const label = formatDateValue(field.value);
													return label ? (
														label
													) : (
														<span>Pick a date</span>
													);
												})()}
											</Button>
										</FormControl>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value}
											onSelect={field.onChange}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			{/* Vendor & Product (hidden for certificate/insurance) */}
			{showVendorProduct && (
				<section className="space-y-3">
					<h3 className="text-sm font-semibold sidebar-gradient-text">
						Vendor &amp; product
					</h3>
					<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
						<FormField
							control={form.control}
							name="vendor"
							render={({ field }) => (
								<FormItem className={cn(aiClass("vendor"))}>
									<FormLabel className="text-sm text-slate-700 mb-1 block">
										Vendor
										<AiHint name="vendor" />
									</FormLabel>
									<FormControl>
										<Input
											placeholder="Vendor name"
											{...field}
											className="bg-white border-slate-300"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="product"
							render={({ field }) => (
								<FormItem className={cn(aiClass("product"))}>
									<FormLabel className="text-sm text-slate-700 mb-1 block">
										Product
										<AiHint name="product" />
									</FormLabel>
									<FormControl>
										<Input
											placeholder="Product name"
											{...field}
											className="bg-white border-slate-300"
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</section>
			)}

			{/* 3. Financial */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					Financial
				</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="cost"
						render={({ field }) => (
							<FormItem className={cn(aiClass("cost"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Cost
									<AiHint name="cost" />
								</FormLabel>
								<FormControl>
									<Input
										type="text"
										placeholder="0.00"
										{...field}
										value={field.value || ""}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="currencyCode"
						render={({ field }) => (
							<FormItem className={cn(aiClass("currencyCode"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Currency
									<AiHint name="currencyCode" />
								</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value || "USD"}
								>
									<FormControl>
										<SelectTrigger className="bg-white border-slate-300">
											<SelectValue />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{CURRENCY_CODES.map((code) => (
											<SelectItem key={code} value={code}>
												{code}
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
						name="quantity"
						render={({ field }) => (
							<FormItem className={cn(aiClass("quantity"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Quantity / capacity
									<AiHint name="quantity" />
								</FormLabel>
								<FormControl>
									<Input
										type="text"
										placeholder="0"
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
			</section>

			{/* 4. Organization */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					Organization
				</h3>
				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="division"
						render={({ field }) => (
							<FormItem className={cn(aiClass("division"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Division
									<AiHint name="division" />
								</FormLabel>
								<Select
									onValueChange={field.onChange}
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
									Department
								</FormLabel>
								<Select
									onValueChange={(value) => {
										field.onChange(value);
										fetchDepartmentManagers(value);
										setSelectedManagers([]);
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

				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="subDepartment"
						render={({ field }) => (
							<FormItem className={cn(aiClass("subDepartment"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Sub-department
									<AiHint name="subDepartment" />
								</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g. Residential Stabilization Unit"
										{...field}
										value={field.value || ""}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="businessUnit"
						render={({ field }) => (
							<FormItem className={cn(aiClass("businessUnit"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Business unit
									<AiHint name="businessUnit" />
								</FormLabel>
								<FormControl>
									<Input
										placeholder="e.g. Community-Based Care — South Region"
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

				<div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormLabel className="text-sm text-slate-700 mb-1 block">
						Assigned To
					</FormLabel>
					{!selectedDepartment ? (
						<p className="text-sm text-slate-500">
							Select a department first to see managers.
						</p>
					) : filteredManagers.length === 0 ? (
						<p className="text-sm text-slate-500">
							No managers in the selected department.
						</p>
					) : (
						<Select
							value={selectedManagers[0] || ""}
							onValueChange={(value) =>
								setSelectedManagers(value ? [value] : [])
							}
						>
							<SelectTrigger className="bg-white border-slate-300 mt-1">
								<SelectValue placeholder="Select manager" />
							</SelectTrigger>
							<SelectContent>
								{filteredManagers.map((manager) => (
									<SelectItem key={manager.$id} value={manager.$id}>
										{manager.fullName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			</section>

			{/* 5. Compliance & renewal */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					Compliance &amp; renewal
				</h3>
				<div className="responsive-form-grid bg-slate-50 rounded-lg p-4 border border-slate-200">
					<FormField
						control={form.control}
						name="compliance"
						render={({ field }) => (
							<FormItem className={cn(aiClass("compliance"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Compliance
									<AiHint name="compliance" />
								</FormLabel>
								<Select
									onValueChange={field.onChange}
									value={field.value || ""}
								>
									<FormControl>
										<SelectTrigger className="bg-white border-slate-300">
											<SelectValue placeholder="Select compliance" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{COMPLIANCE_STATUSES.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
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
						name="renewalNoticeDays"
						render={({ field }) => (
							<FormItem className={cn(aiClass("renewalNoticeDays"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Renewal Notice (Days)
									<AiHint name="renewalNoticeDays" />
								</FormLabel>
								<FormControl>
									<Input
										type="text"
										placeholder="30"
										{...field}
										value={field.value || ""}
										className="bg-white border-slate-300"
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="autoRenew"
						render={({ field }) => (
							<FormItem className={cn("space-y-2", aiClass("autoRenew"))}>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Auto-Renew
									<AiHint name="autoRenew" />
								</FormLabel>
								<FormControl>
									<Switch
										checked={field.value}
										onCheckedChange={field.onChange}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			{/* 6. Notes & description */}
			<section className="space-y-3">
				<h3 className="text-sm font-semibold sidebar-gradient-text">
					Notes &amp; description
				</h3>
				<div
					className={cn(
						"bg-slate-50 rounded-lg p-4 border border-slate-200",
						aiClass("description"),
					)}
				>
					<FormField
						control={form.control}
						name="description"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Description
									<AiHint name="description" />
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Enter license description..."
										className="resize-none bg-white border-slate-300"
										rows={4}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<div
					className={cn(
						"bg-slate-50 rounded-lg p-4 border border-slate-200",
						aiClass("notes"),
					)}
				>
					<FormField
						control={form.control}
						name="notes"
						render={({ field }) => (
							<FormItem>
								<FormLabel className="text-sm text-slate-700 mb-1 block">
									Notes
									<AiHint name="notes" />
								</FormLabel>
								<FormControl>
									<Textarea
										placeholder="Inspection notes, renewal reminders…"
										className="resize-none bg-white border-slate-300"
										rows={3}
										{...field}
										value={field.value || ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>
		</div>
	);
}
