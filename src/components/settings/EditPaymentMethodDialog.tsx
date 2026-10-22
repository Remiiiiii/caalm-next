"use client";

import { ChevronDown, ChevronUp, CreditCard, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { PaymentMethodRow } from "@/components/settings/PaymentMethodsSection";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface EditPaymentMethodDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	method: PaymentMethodRow | null;
	saving?: boolean;
	onSave: (values: { expMonth: number; expYear: number }) => void;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
	const value = String(index + 1);
	return {
		value,
		label: new Date(2000, index, 1).toLocaleString(undefined, {
			month: "long",
		}),
	};
});

const MAX_YEAR = 2100;

function clampYear(value: number, minYear: number) {
	return Math.min(MAX_YEAR, Math.max(minYear, value));
}

export default function EditPaymentMethodDialog({
	open,
	onOpenChange,
	method,
	saving,
	onSave,
}: EditPaymentMethodDialogProps) {
	const [expMonth, setExpMonth] = useState("");
	const [expYear, setExpYear] = useState("");

	const minYear = useMemo(() => new Date().getFullYear(), []);

	useEffect(() => {
		if (!method) return;
		setExpMonth(method.expMonth ? String(method.expMonth) : "");
		setExpYear(method.expYear ? String(method.expYear) : "");
	}, [method]);

	const parsedYear = Number.parseInt(expYear, 10);
	const hasValidYear = Number.isFinite(parsedYear);
	const canDecrementYear = hasValidYear && parsedYear > minYear;
	const canIncrementYear = !hasValidYear || parsedYear < MAX_YEAR;

	const setYearValue = (nextYear: number) => {
		setExpYear(String(clampYear(nextYear, minYear)));
	};

	const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setExpYear(event.target.value);
	};

	const handleYearBlur = () => {
		if (!expYear.trim()) return;
		const year = Number.parseInt(expYear, 10);
		if (!Number.isFinite(year)) {
			setExpYear(String(minYear));
			return;
		}
		setYearValue(year);
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const month = Number.parseInt(expMonth, 10);
		const year = Number.parseInt(expYear, 10);
		if (!month || !year) return;
		onSave({ expMonth: month, expYear: year });
	};

	const description = method
		? `Update the expiration date for the card ending in ${method.last4}.`
		: "Update the expiration month and year for this payment method.";

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			size="form"
			className="max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[480px] sm:w-full"
			pending={saving}
			icon={<CreditCard className="h-5 w-5" aria-hidden />}
			title="Update payment method"
			description={description}
			footer={
				<>
					<Button
						type="button"
						variant="outline"
						className="rounded-full border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
						disabled={saving}
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						type="submit"
						form="edit-payment-method-form"
						className="btn-primary px-3 sm:px-4"
						disabled={saving || !expMonth || !expYear}
					>
						<Save className="h-4 w-4" aria-hidden />
						{saving ? "Updating…" : "Update"}
					</Button>
				</>
			}
		>
			<form
				id="edit-payment-method-form"
				onSubmit={handleSubmit}
				className="pb-1"
			>
				<div className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
					<div className="space-y-2">
						<Label
							htmlFor="pm-exp-month"
							className="text-sm font-medium text-slate-700"
						>
							Month
						</Label>
						<Select value={expMonth} onValueChange={setExpMonth} required>
							<SelectTrigger
								id="pm-exp-month"
								className="h-10 w-full cursor-pointer"
							>
								<SelectValue placeholder="Enter expiry month" />
							</SelectTrigger>
							<SelectContent>
								{MONTH_OPTIONS.map((month) => (
									<SelectItem
										key={month.value}
										value={month.value}
										className="cursor-pointer"
									>
										{month.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label
							htmlFor="pm-exp-year"
							className="text-sm font-medium text-slate-700"
						>
							Year
						</Label>
						<div className="relative overflow-hidden rounded-md border-[0.25px] border-slate-200 bg-white focus-within:border-[#078FAB] focus-within:ring-1 focus-within:ring-[#078FAB]">
							<Input
								id="pm-exp-year"
								type="number"
								inputMode="numeric"
								min={minYear}
								max={MAX_YEAR}
								step={1}
								value={expYear}
								onChange={handleYearChange}
								onBlur={handleYearBlur}
								placeholder="2029"
								className={cn(
									"h-10 border-0 bg-transparent pr-12 shadow-none focus-visible:border-0 focus-visible:ring-0",
									"[appearance:textfield]",
									"[&::-webkit-inner-spin-button]:appearance-none",
									"[&::-webkit-outer-spin-button]:appearance-none",
								)}
								required
							/>
							<div className="absolute inset-y-0 right-0 flex w-10 flex-col border-l border-slate-200">
								<button
									type="button"
									className="flex flex-1 cursor-pointer items-center justify-center text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
									onClick={() => {
										const base = Number.isFinite(parsedYear)
											? parsedYear
											: minYear;
										setYearValue(base + 1);
									}}
									disabled={!canIncrementYear}
									aria-label="Increase year"
								>
									<ChevronUp className="h-4 w-4" aria-hidden />
								</button>
								<div className="h-px bg-slate-200" />
								<button
									type="button"
									className="flex flex-1 cursor-pointer items-center justify-center text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
									onClick={() => {
										const base = Number.isFinite(parsedYear)
											? parsedYear
											: minYear + 1;
										setYearValue(base - 1);
									}}
									disabled={!canDecrementYear}
									aria-label="Decrease year"
								>
									<ChevronDown className="h-4 w-4" aria-hidden />
								</button>
							</div>
						</div>
					</div>
				</div>
			</form>
		</AppDialog>
	);
}
