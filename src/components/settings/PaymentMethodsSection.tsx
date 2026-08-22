"use client";

import {
	ArrowLeftRight,
	Ban,
	CreditCard,
	Info,
	MoreHorizontal,
	Pencil,
	Plus,
	Star,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import EditPaymentMethodDialog from "@/components/settings/EditPaymentMethodDialog";
import CardBrandIcon from "@/components/billing/CardBrandIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingSpinner } from "@/components/ui/loading";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	DATA_TABLE_BODY_ROW_BASE,
	DATA_TABLE_HEADER_CELL,
	DATA_TABLE_HEADER_ROW,
} from "@/lib/ui/data-table-styles";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface PaymentMethodRow {
	id: string;
	brand: string;
	last4: string;
	expMonth: number;
	expYear: number;
	name: string | null;
	isDefault: boolean;
}

interface PaymentMethodsSectionProps {
	orgId: string;
	orgName: string;
	hasUpcomingInvoice?: boolean;
	paymentMethods: PaymentMethodRow[];
	loading?: boolean;
	error?: string | null;
	onRefresh: (options?: { silent?: boolean }) => void | Promise<void>;
	onPaymentMethodUpdated?: (method: PaymentMethodRow) => void;
	onPaymentMethodsReplace?: (methods: PaymentMethodRow[]) => void;
	onPaymentMethodRemoved?: (paymentMethodId: string) => void;
	onAddPaymentMethod: () => void | Promise<void>;
	onReplacePaymentMethod: (paymentMethodId: string) => void | Promise<void>;
	adding?: boolean;
	replacingId?: string | null;
	actionError?: string | null;
}

function formatBrand(brand: string): string {
	if (!brand) return "Card";
	return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatExpiration(expMonth: number, expYear: number): string {
	if (!expMonth || !expYear) return "—";
	return `${expMonth}/${expYear}`;
}

const defaultPaymentMethodBadgeClassName =
	"inline-flex items-center rounded-xl border border-blue/20 bg-blue/10 px-2 py-1 text-xs font-medium text-blue";

export default function PaymentMethodsSection({
	orgId,
	orgName,
	hasUpcomingInvoice = false,
	paymentMethods,
	loading,
	error,
	onRefresh,
	onPaymentMethodUpdated,
	onPaymentMethodsReplace,
	onPaymentMethodRemoved,
	onAddPaymentMethod,
	onReplacePaymentMethod,
	adding,
	replacingId,
	actionError,
}: PaymentMethodsSectionProps) {
	const { toast } = useToast();
	const [editOpen, setEditOpen] = useState(false);
	const [removeOpen, setRemoveOpen] = useState(false);
	const [removeBlockedOpen, setRemoveBlockedOpen] = useState(false);
	const [selectedMethod, setSelectedMethod] = useState<PaymentMethodRow | null>(
		null,
	);
	const [saving, setSaving] = useState(false);
	const [removing, setRemoving] = useState(false);
	const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
	const [localError, setLocalError] = useState<string | null>(null);

	const openEdit = (method: PaymentMethodRow) => {
		setSelectedMethod(method);
		setLocalError(null);
		setEditOpen(true);
	};

	const openRemove = (method: PaymentMethodRow) => {
		setSelectedMethod(method);
		setLocalError(null);
		if (method.isDefault && hasUpcomingInvoice) {
			setRemoveBlockedOpen(true);
			return;
		}
		setRemoveOpen(true);
	};

	const handleSaveEdit = async (values: {
		expMonth: number;
		expYear: number;
	}) => {
		if (!selectedMethod) return;
		try {
			setSaving(true);
			setLocalError(null);
			const res = await fetch(
				`/api/billing/payment-methods/${selectedMethod.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"x-org-id": orgId,
					},
					body: JSON.stringify({
						orgId,
						expMonth: values.expMonth,
						expYear: values.expYear,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Could not update payment method");
			}
			const updated = data.paymentMethod as PaymentMethodRow;
			onPaymentMethodUpdated?.(updated);
			setEditOpen(false);
			toast({
				title: "Payment method updated",
				description: `Card ending in ${updated.last4} expires ${formatExpiration(updated.expMonth, updated.expYear)}.`,
			});
		} catch (caught: unknown) {
			const message =
				caught instanceof Error
					? caught.message
					: "Could not update payment method";
			setLocalError(message);
		} finally {
			setSaving(false);
		}
	};

	const handleRemove = async () => {
		if (!selectedMethod) return;
		try {
			setRemoving(true);
			setLocalError(null);
			const res = await fetch(
				`/api/billing/payment-methods/${selectedMethod.id}?orgId=${encodeURIComponent(orgId)}`,
				{
					method: "DELETE",
					headers: { "x-org-id": orgId },
				},
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Could not remove payment method");
			}
			const removedId = selectedMethod.id;
			onPaymentMethodRemoved?.(removedId);
			setRemoveOpen(false);
			toast({
				title: "Payment method removed",
				description: `Card ending in ${selectedMethod.last4} was removed.`,
			});
			await onRefresh({ silent: true });
		} catch (caught: unknown) {
			const message =
				caught instanceof Error
					? caught.message
					: "Could not remove payment method";
			setLocalError(message);
		} finally {
			setRemoving(false);
		}
	};

	const handleSetDefault = async (method: PaymentMethodRow) => {
		try {
			setSettingDefaultId(method.id);
			setLocalError(null);
			const res = await fetch(
				`/api/billing/payment-methods/${method.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
						"x-org-id": orgId,
					},
					body: JSON.stringify({
						orgId,
						setDefault: true,
					}),
				},
			);
			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Could not set default payment method");
			}
			const methods = (data.paymentMethods || []) as PaymentMethodRow[];
			onPaymentMethodsReplace?.(methods);
			toast({
				title: "Default payment method updated",
				description: `${formatBrand(method.brand)} ending in ${method.last4} is now default.`,
			});
		} catch (caught: unknown) {
			const message =
				caught instanceof Error
					? caught.message
					: "Could not set default payment method";
			setLocalError(message);
			toast({
				title: "Could not update default",
				description: message,
				variant: "destructive",
			});
		} finally {
			setSettingDefaultId(null);
		}
	};

	const displayError = actionError || localError;

	return (
		<>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
						<div>
							<p className="text-sm font-medium sidebar-gradient-text">
								Payment methods
							</p>
							<p className="mt-1 text-xs text-slate-600">
								View or update your organization payment methods here.
							</p>
						</div>

						<div className="space-y-4">
							{loading && (
								<div className="flex justify-center py-8">
									<LoadingSpinner size="sm" label="Loading payment methods…" />
								</div>
							)}

							{!loading && error ? (
								<p className="py-4 text-sm text-red">{error}</p>
							) : null}

							{!loading && !error && paymentMethods.length === 0 ? (
								<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
									<div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-light-400/50">
										<CreditCard
											className="h-4 w-4 text-slate-500"
											strokeWidth={1.75}
										/>
									</div>
									<p className="text-sm font-semibold text-slate-700">
										No payment methods on file
									</p>
									<p className="mt-1 text-xs text-slate-600">
										Add a card when you subscribe or with the button below.
									</p>
								</div>
							) : null}

							{!loading && !error && paymentMethods.length > 0 ? (
								<div className="overflow-x-auto rounded-lg border border-slate-200">
									<Table>
										<TableHeader>
											<TableRow className={DATA_TABLE_HEADER_ROW}>
												<TableHead className={DATA_TABLE_HEADER_CELL}>
													Credit card
												</TableHead>
												<TableHead className={DATA_TABLE_HEADER_CELL}>
													Name
												</TableHead>
												<TableHead className={DATA_TABLE_HEADER_CELL}>
													Expiration
												</TableHead>
												<TableHead
													className={cn(DATA_TABLE_HEADER_CELL, "w-12")}
												>
													<span className="sr-only">Actions</span>
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{paymentMethods.map((method) => (
												<TableRow
													key={method.id}
													className={cn(DATA_TABLE_BODY_ROW_BASE)}
												>
													<TableCell className="text-sm text-slate-700">
														<div className="flex items-center gap-2">
															<CardBrandIcon brand={method.brand} />
															<span>
																{formatBrand(method.brand)} ending in{" "}
																{method.last4}
															</span>
															{method.isDefault ? (
																<span
																	className={defaultPaymentMethodBadgeClassName}
																>
																	Default
																</span>
															) : null}
														</div>
													</TableCell>
													<TableCell className="text-sm text-slate-700">
														{method.name || "—"}
													</TableCell>
													<TableCell className="text-sm text-slate-700">
														{formatExpiration(
															method.expMonth,
															method.expYear,
														)}
													</TableCell>
													<TableCell className="text-right">
														<DropdownMenu modal={false}>
															<DropdownMenuTrigger asChild>
																<button
																	type="button"
																	aria-label={`Actions for card ending in ${method.last4}`}
																	disabled={loading}
																	className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
																>
																	<MoreHorizontal className="h-4 w-4" />
																</button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end" className="w-44">
																<DropdownMenuItem
																	className="cursor-pointer gap-2"
																	onSelect={() => openEdit(method)}
																>
																	<Pencil className="h-4 w-4 text-slate-600" />
																	Edit
																</DropdownMenuItem>
																{paymentMethods.length > 1 &&
																!method.isDefault ? (
																	<DropdownMenuItem
																		className="cursor-pointer gap-2"
																		onSelect={() =>
																			void handleSetDefault(method)
																		}
																		disabled={settingDefaultId === method.id}
																	>
																		<Star className="h-4 w-4 text-slate-600" />
																		Set as default
																	</DropdownMenuItem>
																) : null}
																<DropdownMenuItem
																	className="cursor-pointer gap-2"
																	onSelect={() =>
																		onReplacePaymentMethod(method.id)
																	}
																	disabled={replacingId === method.id}
																>
																	<ArrowLeftRight className="h-4 w-4 text-slate-600" />
																	Replace
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	className="cursor-pointer gap-2 text-red focus:text-red"
																	onSelect={() => openRemove(method)}
																>
																	<Trash2 className="h-4 w-4" />
																	Remove
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							) : null}

							{displayError ? (
								<p className="text-sm text-red">{displayError}</p>
							) : null}

							<div className="flex items-center justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									className="primary-btn px-3 sm:px-4"
									onClick={onAddPaymentMethod}
									disabled={adding || loading}
								>
									<Plus className="h-4 w-4" />
									Add a backup payment method
								</Button>
								<TooltipProvider delayDuration={200}>
									<Tooltip>
										<TooltipTrigger asChild>
											<button
												type="button"
												aria-label="Backup payment method info"
												className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
											>
												<Info className="h-4 w-4" />
											</button>
										</TooltipTrigger>
										<TooltipContent
											side="top"
											align="end"
											className="max-w-xs border-slate-200 bg-slate-700 px-3 py-2 text-xs leading-relaxed text-white"
										>
											If your default payment fails, your backup method will be
											charged automatically.
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<EditPaymentMethodDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				method={selectedMethod}
				saving={saving}
				onSave={handleSaveEdit}
			/>

			<Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
				<DialogContent
					className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[480px] flex-col overflow-hidden p-0 shadow-xl sm:w-full"
					variant="destructive"
				>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<Trash2 className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Remove payment method?
							</DialogTitle>
						</div>
					</div>

					<div className="glass-dialog-body-padded">
						<p className="text-sm text-slate-700">
							{selectedMethod
								? `This removes the ${formatBrand(selectedMethod.brand)} card ending in ${selectedMethod.last4}.`
								: "This card will be removed from your organization."}
						</p>
						{selectedMethod ? (
							<Card className="glass-card mt-4">
								<div className="glass-card-cap" />
								<CardContent className="flex items-center gap-3 p-4 sm:p-5">
									<CardBrandIcon brand={selectedMethod.brand} />
									<div className="min-w-0">
										<p className="text-sm font-medium text-slate-700">
											{formatBrand(selectedMethod.brand)} ending in{" "}
											{selectedMethod.last4}
										</p>
										<p className="text-xs text-slate-600">
											{selectedMethod.name || "No cardholder name"} · Expires{" "}
											{formatExpiration(
												selectedMethod.expMonth,
												selectedMethod.expYear,
											)}
										</p>
									</div>
									{selectedMethod.isDefault ? (
										<span
											className={cn(
												"ml-auto",
												defaultPaymentMethodBadgeClassName,
											)}
										>
											Default
										</span>
									) : null}
								</CardContent>
							</Card>
						) : null}
						{localError ? (
							<p className="mt-3 text-sm text-red">{localError}</p>
						) : null}
					</div>

					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500" />
						<div className="flex items-center gap-3">
							<Button
								type="button"
								variant="outline"
								className="primary-btn px-3 sm:px-4"
								onClick={() => setRemoveOpen(false)}
								disabled={removing}
							>
								<Ban className="h-4 w-4" aria-hidden />
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								className="rounded-full px-3 sm:px-4"
								disabled={removing}
								onClick={() => void handleRemove()}
							>
								<Trash2 className="h-4 w-4" aria-hidden />
								{removing ? "Removing…" : "Remove"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={removeBlockedOpen} onOpenChange={setRemoveBlockedOpen}>
				<DialogContent
					className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[480px] flex-col overflow-hidden p-0 shadow-xl sm:w-full"
					variant="destructive"
				>
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="glass-dialog-wizard-header mt-4">
						<div className="flex items-center gap-3 px-6">
							<Info className="h-5 w-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Unable to delete payment method
							</DialogTitle>
						</div>
					</div>
					<div className="glass-dialog-body-padded">
						<DialogDescription className="text-sm leading-relaxed text-slate-600">
							The default payment method cannot be removed as{" "}
							<span className="font-semibold text-slate-700">{orgName}</span> has
							an upcoming invoice. To proceed, set a backup or add a new default
							payment method.
						</DialogDescription>
					</div>
					<div className="glass-dialog-alert-footer">
						<div className="text-xs text-slate-500" />
						<Button
							type="button"
							variant="outline"
							className="primary-btn px-3 sm:px-4"
							onClick={() => setRemoveBlockedOpen(false)}
						>
							<Ban className="h-4 w-4" aria-hidden />
							Cancel
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
