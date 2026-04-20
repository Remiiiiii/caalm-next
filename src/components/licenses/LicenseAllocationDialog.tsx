"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
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
		<Dialog open={open} onOpenChange={setOpen}>
			{!isControlled && (
				<DialogTrigger asChild>
					<Button variant="outline" className="primary-btn">
						<Users className="h-4 w-4 mr-2" />
						Allocate
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl bg-white">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<Users className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Allocate License
						</DialogTitle>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						{license.licenseName}
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50">
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
										<FormLabel>
											Assign to Departments (comma-separated)
										</FormLabel>
										<FormControl>
											<Input
												placeholder="Engineering, Sales"
												{...field}
												onChange={(e) =>
													field.onChange(
														e.target.value
															? e.target.value
																	.split(",")
																	.map((dept) => dept.trim())
															: [],
													)
												}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</form>
					</Form>
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
					<div className="text-xs text-slate-500">
						Allocate licenses to users or departments
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							className="primary-btn px-3 sm:px-4"
							onClick={form.handleSubmit(onSubmit)}
							disabled={isSubmitting}
						>
							{isSubmitting && (
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
							)}
							Allocate
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
