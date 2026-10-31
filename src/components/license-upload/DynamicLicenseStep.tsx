/**
 * Generic renderer for a type-driven license step. Reads field metadata
 * from licenseTypeConfigs.ts and never special-cases a field by name — this
 * is what lets the wizard support 9 license types without a hardcoded field
 * list per type in JSX.
 */

"use client";

import type { UseFormReturn } from "react-hook-form";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
	toIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
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
import { Textarea } from "@/components/ui/textarea";
import type {
	LicenseFieldDef,
	LicenseTypeStep,
} from "@/lib/licenses/licenseTypeConfigs";
import type { LicenseUploadFormData } from "./schema";

export interface DynamicLicenseStepProps {
	step: LicenseTypeStep;
	form: UseFormReturn<LicenseUploadFormData>;
}

function DynamicField({
	field: fieldDef,
	form,
}: {
	field: LicenseFieldDef;
	form: UseFormReturn<LicenseUploadFormData>;
}) {
	const name = fieldDef.name as keyof LicenseUploadFormData;
	const hasOtherOption = fieldDef.options?.some((o) => o.value === "Other");
	const currentValue = form.watch(name);
	const showOtherInput =
		fieldDef.type === "select" && hasOtherOption && currentValue === "Other";

	return (
		<>
			<FormField
				control={form.control}
				name={name}
				render={({ field }) => (
					<FormItem>
						<FormLabel className="text-sm text-slate-700 mb-1 block">
							{fieldDef.label}{" "}
							{fieldDef.required && <span className="text-red">*</span>}
						</FormLabel>
						<FormControl>
							{fieldDef.type === "select" ? (
								<Select
									onValueChange={field.onChange}
									value={(field.value as string) || ""}
								>
									<SelectTrigger className="bg-white border-slate-300">
										<SelectValue
											placeholder={`Select ${fieldDef.label.toLowerCase()}`}
										/>
									</SelectTrigger>
									<SelectContent>
										{fieldDef.options?.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : fieldDef.type === "date" ? (
								<CaalmDatePicker
									value={
										field.value instanceof Date
											? toIsoDateLocal(field.value)
											: ""
									}
									onChange={(iso) =>
										field.onChange(iso ? parseIsoDateLocal(iso) : undefined)
									}
									className="border-slate-300"
								/>
							) : fieldDef.type === "textarea" ? (
								<Textarea
									placeholder={fieldDef.label}
									className="resize-none bg-white border-slate-300"
									rows={3}
									{...field}
									value={(field.value as string) || ""}
								/>
							) : (
								<Input
									placeholder={fieldDef.label}
									{...field}
									value={(field.value as string) || ""}
									className="bg-white border-slate-300"
								/>
							)}
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			{showOtherInput && (
				<FormField
					control={form.control}
					name={name}
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-sm text-slate-700 mb-1 block">
								{fieldDef.label} — custom value
							</FormLabel>
							<FormControl>
								<Input
									placeholder={`Enter custom ${fieldDef.label.toLowerCase()}`}
									onChange={(e) => field.onChange(e.target.value)}
									value={
										field.value === "Other" ? "" : (field.value as string) || ""
									}
									className="bg-white border-slate-300"
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
		</>
	);
}

export default function DynamicLicenseStep({
	step,
	form,
}: DynamicLicenseStepProps) {
	return (
		<div className="space-y-3.5">
			<p className="text-sm text-slate-500">{step.description}</p>
			<div className="responsive-form-grid">
				{step.fields.map((fieldDef) => (
					<DynamicField key={fieldDef.name} field={fieldDef} form={form} />
				))}
			</div>
		</div>
	);
}
