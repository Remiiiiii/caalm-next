"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { LicenseAllocationInput } from "@/lib/api/licenses/schemas/license.schema";
import { licenseAllocationSchema } from "@/lib/api/licenses/schemas/license.schema";
import type { License } from "@/types/licenses";
import { CONTRACT_DEPARTMENTS } from "../../../constants";

interface LicenseAllocationDialogProps {
	license: License;
	onSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export default function LicenseAllocationDialog({
	license,
	onSuccess,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: LicenseAllocationDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled =
		controlledOpen !== undefined && controlledOnOpenChange !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const router = useRouter();

	const form = useForm<LicenseAllocationInput>({
		resolver: zodResolver(licenseAllocationSchema),
		defaultValues: {
			userIds: [],
			departments: [],
			quantity: 1,
		},
	});

	const onSubmit = async (data: LicenseAllocationInput) => {
		setIsSubmitting(true);
		try {
			const response = await fetch(`/api/licenses/${license.$id}/allocate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to allocate license");
			}

			toast({
				title: "Success",
				description: "License allocated successfully",
			});

			setOpen(false);
			form.reset();
			router.refresh();
			onSuccess?.();
		} catch (error) {
			console.error("Error allocating license:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to allocate license",
				variant: "destructive",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			{!isControlled ? (
				<Button
					variant="outline"
					className="btn-primary"
					onClick={() => setOpen(true)}
				>
					<Users className="mr-2 h-4 w-4" />
					Allocate
				</Button>
			) : null}
			<AppDialog
				open={open}
				onOpenChange={setOpen}
				size="form"
				className="max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full"
				pending={isSubmitting}
				icon={<Users className="h-5 w-5" />}
				title="Allocate License"
				description={license.licenseName}
				footer={
					<>
						<Button
							type="button"
							variant="outline"
							className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
							disabled={isSubmitting}
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="btn-primary px-3 sm:px-4"
							onClick={form.handleSubmit(onSubmit)}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Allocate
						</Button>
					</>
				}
			>
				<div className="pb-1">
					<p className="mb-4 text-xs text-slate-500">
						Allocate licenses to users or departments
					</p>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
								<p className="text-sm font-medium text-slate-700 mb-2">
									Available:{" "}
									{license.availableQuantity ?? license.quantity ?? 0}
								</p>
								<p className="text-xs text-slate-500">
									Total: {license.quantity ?? 0} licenses
								</p>
							</div>

							<FormField
								control={form.control}
								name="quantity"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Quantity to Allocate</FormLabel>
										<FormControl>
											<Input
												type="number"
												min={1}
												max={license.availableQuantity ?? license.quantity ?? 1}
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value ? parseInt(e.target.value, 10) : 1,
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="userIds"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											Assign to Users (User IDs, comma-separated)
										</FormLabel>
										<FormControl>
											<Input
												placeholder="user-id-1, user-id-2"
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? e.target.value.split(",").map((id) => id.trim())
															: [],
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="departments"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Assign to departments</FormLabel>
										<div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
											{CONTRACT_DEPARTMENTS.map((dept) => {
												const selected = field.value?.includes(dept) ?? false;
												return (
													<label
														key={dept}
														htmlFor={`allocate-dept-${dept}`}
														className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"
													>
														<Checkbox
															id={`allocate-dept-${dept}`}
															checked={selected}
															onCheckedChange={(checked) => {
																const current = field.value ?? [];
																field.onChange(
																	checked
																		? [...current, dept]
																		: current.filter((d) => d !== dept),
																);
															}}
														/>
														{dept}
													</label>
												);
											})}
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>
						</form>
					</Form>
				</div>
			</AppDialog>
		</>
	);
}
