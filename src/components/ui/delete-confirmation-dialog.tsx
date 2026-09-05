"use client";

import { AlertTriangle, Trash2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type DeleteListItem = {
	id?: string;
	name: string;
	subtitle?: string;
	status?: string;
	statusLabel?: string;
	statusClassName?: string;
};

interface DeleteConfirmationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description?: string;
	itemName?: string;
	items?: Array<string | DeleteListItem>;
	itemNoun?: string;
	requireConfirmation?: boolean;
	confirmationLabel?: string;
	onConfirm: () => void;
	onCancel?: () => void;
	isLoading?: boolean;
	confirmLabel?: string;
	closeOnConfirm?: boolean;
}

function normalizeItems(
	items?: Array<string | DeleteListItem>,
	itemName?: string,
): DeleteListItem[] {
	if (items && items.length > 0) {
		return items.map((item) =>
			typeof item === "string" ? { name: item } : item,
		);
	}
	if (itemName) return [{ name: itemName }];
	return [];
}

function statusBadgeClasses(status?: string): string {
	const map: Record<string, string> = {
		active: "bg-green/10 text-green border-green/20",
		"pending-review": "bg-orange/10 text-orange border-orange/20",
		"action-required": "bg-red/10 text-red border-red/20",
		inactive: "bg-slate-100 text-slate-600 border-slate-200",
		expired: "bg-red/10 text-red border-red/20",
		draft: "bg-slate-100 text-slate-600 border-slate-200",
		suspended: "bg-orange/10 text-orange border-orange/20",
	};
	return map[status || ""] || "bg-slate-100 text-slate-600 border-slate-200";
}

function formatStatusLabel(status?: string, explicit?: string): string {
	if (explicit) return explicit;
	if (!status) return "";
	const labels: Record<string, string> = {
		"pending-review": "Pending Review",
		"action-required": "Action Required",
		active: "Active",
		inactive: "Inactive",
		expired: "Expired",
		draft: "Draft",
		suspended: "Suspended",
	};
	return labels[status] || status;
}

export function DeleteConfirmBody({
	description,
	itemName,
	items,
	itemNoun = "item",
	requireConfirmation = false,
	confirmationLabel,
	confirmed,
	onConfirmedChange,
}: {
	description?: string;
	itemName?: string;
	items?: Array<string | DeleteListItem>;
	itemNoun?: string;
	requireConfirmation?: boolean;
	confirmationLabel?: string;
	confirmed: boolean;
	onConfirmedChange: (checked: boolean) => void;
}) {
	const list = normalizeItems(items, itemName);
	const count = list.length;
	const nounLabel = `${count} ${itemNoun}${count === 1 ? "" : "s"} selected`;

	return (
		<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
			{description ? (
				<p className="text-sm text-slate-600">{description}</p>
			) : null}

			{count > 0 ? (
				<div className="space-y-2">
					<p className="text-sm font-medium text-slate-700">{nounLabel}</p>
					<ul className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
						{list.map((item, index) => {
							const statusLabel = formatStatusLabel(
								item.status,
								item.statusLabel,
							);
							return (
								<li
									key={`${item.id || item.name}-${index}`}
									className={cn(
										"flex items-start justify-between gap-3 px-3 py-3",
										index > 0 && "border-t border-slate-200",
									)}
								>
									<div className="min-w-0">
										<p className="truncate text-sm font-semibold text-slate-700">
											{item.name}
										</p>
										{item.subtitle ? (
											<p className="mt-0.5 truncate text-xs text-slate-500">
												{item.subtitle}
											</p>
										) : null}
									</div>
									{statusLabel ? (
										<span
											className={cn(
												"inline-block shrink-0 px-2 py-0.5 text-xs rounded-full font-medium border",
												item.statusClassName ||
													statusBadgeClasses(item.status),
											)}
										>
											{statusLabel}
										</span>
									) : null}
								</li>
							);
						})}
					</ul>
				</div>
			) : null}

			{requireConfirmation ? (
				<label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red/20 bg-red/10 p-3 text-sm text-slate-700 transition-colors duration-200 hover:bg-red/15">
					<Checkbox
						checked={confirmed}
						onCheckedChange={(value) => onConfirmedChange(value === true)}
						className="mt-0.5 border-red/40 data-[state=checked]:border-red data-[state=checked]:bg-red data-[state=checked]:text-white"
					/>
					<span>
						{confirmationLabel ||
							`I understand this will permanently delete the listed ${itemNoun}${count === 1 ? "" : "s"} and cannot be undone.`}
					</span>
				</label>
			) : null}
		</div>
	);
}

export const DeleteConfirmationDialog: React.FC<
	DeleteConfirmationDialogProps
> = ({
	open,
	onOpenChange,
	title,
	description,
	itemName,
	items,
	itemNoun,
	requireConfirmation = false,
	confirmationLabel,
	onConfirm,
	onCancel,
	isLoading = false,
	confirmLabel,
	closeOnConfirm = true,
}) => {
	const [confirmed, setConfirmed] = useState(false);

	useEffect(() => {
		if (!open) {
			setConfirmed(false);
		}
	}, [open]);

	const handleConfirm = () => {
		onConfirm();
		if (closeOnConfirm) {
			onOpenChange(false);
		}
	};

	const confirmDisabled = isLoading || (requireConfirmation && !confirmed);
	const list = normalizeItems(items, itemName);
	const count = list.length;
	const noun = itemNoun || "item";
	const defaultConfirmLabel =
		count > 0
			? `Delete ${count} ${noun}${count === 1 ? "" : "s"}`
			: `Delete ${noun}s`;

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) onCancel?.();
				onOpenChange(next);
			}}
		>
			<DialogContent
				className="flex max-h-[90vh] w-[calc(100%-1.5rem)] max-w-[600px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl sm:w-full"
				variant="destructive"
				showCloseButton
			>
				{/* Professional cap + default CAALM dialog header */}
				<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />

				<div className="glass-dialog-wizard-header mt-4">
					<div className="flex items-center gap-3 px-6">
						<AlertTriangle
							className="h-5 w-5 shrink-0 text-[#0f5384]"
							aria-hidden
						/>
						<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
							{title}
						</DialogTitle>
					</div>
				</div>

				<DeleteConfirmBody
					description={description}
					itemName={itemName}
					items={items}
					itemNoun={noun}
					requireConfirmation={requireConfirmation}
					confirmationLabel={confirmationLabel}
					confirmed={confirmed}
					onConfirmedChange={setConfirmed}
				/>

				<div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={confirmDisabled}
						className="delete-btn cursor-pointer gap-2 px-3 sm:px-4"
					>
						<Trash2 className="h-4 w-4 shrink-0" />
						{isLoading ? "Deleting..." : confirmLabel || defaultConfirmLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};
