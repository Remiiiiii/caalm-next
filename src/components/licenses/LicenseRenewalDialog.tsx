"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Ban, Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { LicenseRenewalInput } from "@/lib/api/licenses/schemas/license.schema";
import { licenseRenewalSchema } from "@/lib/api/licenses/schemas/license.schema";
import type { License } from "@/types/licenses";

interface LicenseRenewalDialogProps {
	license: License;
	onSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export default function LicenseRenewalDialog({
	license,
	onSuccess,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: LicenseRenewalDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled =
		controlledOpen !== undefined && controlledOnOpenChange !== undefined;
	const open = isControlled ? controlledOpen : internalOpen;
	const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { toast } = useToast();
	const router = useRouter();

	const form = useForm<
		z.input<typeof licenseRenewalSchema>,
		unknown,
		LicenseRenewalInput
	>({
		resolver: zodResolver(licenseRenewalSchema),
		defaultValues: {
			renewalDate: new Date().toISOString().split("T")[0],
			cost: license.cost,
			currencyCode: license.currencyCode || "USD",
			extendExpiration: true,
		},
	});

	const onSubmit = async (data: LicenseRenewalInput) => {
		setIsSubmitting(true);
		try {
			const response = await fetch(`/api/licenses/${license.$id}/renew`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to renew license");
			}

			toast({
				title: "Success",
				description: "License renewed successfully",
			});

			setOpen(false);
			form.reset();
			router.refresh();
			onSuccess?.();
		} catch (error) {
			console.error("Error renewing license:", error);
			toast({
				title: "Error",
				description:
					error instanceof Error ? error.message : "Failed to renew license",
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
					<Button className="primary-btn">
						<RefreshCw className="h-4 w-4 mr-2" />
						Renew
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="flex max-h-[90vh] w-[calc(100%-1.5rem)] sm:w-full max-w-[600px] flex-col overflow-hidden p-0 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<RefreshCw className="w-5 h-5 text-[#0f5384]" />
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							Renew License
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
								<p className="text-sm font-medium text-slate-700 mb-1">
									Current Expiration: {license.expirationDate || "N/A"}
								</p>
								{license.cost && (
									<p className="text-xs text-slate-500">
										Current Cost:{" "}
										{new Intl.NumberFormat("en-US", {
											style: "currency",
											currency: license.currencyCode || "USD",
										}).format(license.cost)}
									</p>
								)}
							</div>

							<FormField
								control={form.control}
								name="renewalDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Renewal Date *</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="cost"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Renewal Cost</FormLabel>
											<FormControl>
												<Input
													type="number"
													placeholder="0.00"
													{...field}
													onChange={(e) =>
														field.onChange(
															e.target.value
																? parseFloat(e.target.value)
																: undefined,
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
									name="currencyCode"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Currency</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<FormField
								control={form.control}
								name="extendExpiration"
								render={({ field }) => (
									<FormItem className="flex items-center gap-2">
										<FormControl>
											<input
												type="checkbox"
												checked={field.value}
												onChange={field.onChange}
												className="rounded"
											/>
										</FormControl>
										<FormLabel>
											Extend expiration date based on renewal date
										</FormLabel>
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="notes"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Renewal Notes</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Additional notes about this renewal"
												rows={3}
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</form>
					</Form>
				</div>

				<div className="glass-dialog-alert-footer">
					<div className="text-xs text-slate-500">
						Renewal will be recorded in license history
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => setOpen(false)}
						>
							<Ban className="w-4 h-4" />
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
							Renew License
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
