"use client";

import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { FormattedDate } from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import { convertFileSize } from "@/lib/utils";
import type { License } from "@/types/licenses";
import LicenseActionDropdown from "./LicenseActionDropdown";

function statusBadge(
	status: string | undefined,
	licenseExpiryDate?: string,
): React.ReactNode {
	const isExpired =
		status?.toLowerCase() === "expired" ||
		(licenseExpiryDate && new Date(licenseExpiryDate) < new Date());

	if (isExpired) {
		return (
			<span className="inline-block px-1.5 py-0.5 border border-red/20 bg-red/10 text-red text-xs rounded-full font-medium">
				Expired
			</span>
		);
	}

	switch (status) {
		case "pending-review":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-orange/20 bg-orange/10 text-orange text-xs rounded-full font-medium">
					Pending Review
				</span>
			);
		case "action-required":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-red/20 bg-red/10 text-red text-xs rounded-full font-medium">
					Action Required
				</span>
			);
		case "active":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-green/20 bg-green/10 text-green text-xs rounded-full font-medium">
					Active
				</span>
			);
		case "inactive":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
					Inactive
				</span>
			);
		case "suspended":
			return (
				<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-slate-100 text-slate-700 text-xs rounded-full font-medium">
					Suspended
				</span>
			);
		default:
			return (
				<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-full font-medium">
					{status || "Unknown"}
				</span>
			);
	}
}

function MetaRow({
	label,
	children,
	emphasize,
}: {
	label: string;
	children: React.ReactNode;
	emphasize?: "danger" | "warning";
}) {
	const valueClass =
		emphasize === "danger"
			? "text-[#E5252A] font-semibold"
			: emphasize === "warning"
				? "text-orange font-semibold"
				: "text-slate-700 font-medium";

	return (
		<div className="flex items-start justify-between gap-3 min-w-0 py-1.5 border-b border-slate-200/60 last:border-b-0">
			<span className="text-xs sm:text-sm text-slate-500 shrink-0 pt-0.5">
				{label}
			</span>
			<div
				className={`min-w-0 text-right text-xs sm:text-sm wrap-anywhere ${valueClass}`}
			>
				{children}
			</div>
		</div>
	);
}

interface LicenseCardProps {
	license: License;
	onClick?: () => void;
	onRefresh?: () => void;
	onLicenseRemoved?: (licenseId: string) => void;
}

export default function LicenseCard({
	license,
	onClick,
	onRefresh,
	onLicenseRemoved,
}: LicenseCardProps) {
	const [uploaderName, setUploaderName] = useState<string | null>(null);
	const [loadingUploader, setLoadingUploader] = useState(false);
	const [assignedNames, setAssignedNames] = useState<string[]>([]);
	const [loadingAssigned, setLoadingAssigned] = useState(false);

	useEffect(() => {
		const createdBy = license.createdBy;
		if (!createdBy) {
			setUploaderName(null);
			return;
		}
		setLoadingUploader(true);
		fetchUserNamesByIds([createdBy])
			.then((users) => {
				const user =
					users?.find(
						(u) => u?.$id === createdBy || u?.accountId === createdBy,
					) ?? users?.[0];
				setUploaderName(user?.fullName ?? "Unknown");
			})
			.catch(() => setUploaderName("Unknown"))
			.finally(() => setLoadingUploader(false));
	}, [license.createdBy]);

	const managerIds = Array.isArray(license.assignedManagers)
		? license.assignedManagers
		: license.assignedManagers
			? [license.assignedManagers]
			: [];

	useEffect(() => {
		if (managerIds.length === 0) {
			setAssignedNames([]);
			return;
		}
		setLoadingAssigned(true);
		fetchUserNamesByIds(managerIds)
			.then((users) => {
				const names = managerIds.map(
					(id) =>
						users?.find((u) => u?.$id === id || u?.accountId === id)
							?.fullName ?? id,
				);
				setAssignedNames(names);
			})
			.catch(() => setAssignedNames(managerIds))
			.finally(() => setLoadingAssigned(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps -- stable string key for id list
	}, [managerIds.join(",")]);

	const handleCardClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onClick?.();
	};

	const expiryDate = license.licenseExpiryDate || license.expirationDate;
	const issueDate = license.issueDate || license.purchaseDate;
	const divisionLabel =
		license.division || license.department
			? String(license.division || license.department).replace(/-/g, " ")
			: null;

	const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
	const daysUntilExpiry = expiryDate
		? Math.ceil(
				(new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
			)
		: null;
	const isExpiringSoon =
		!isExpired &&
		daysUntilExpiry != null &&
		daysUntilExpiry >= 0 &&
		daysUntilExpiry <= 90;

	return (
		<div
			className="glass-card interactive-glass-card relative flex h-full w-full min-w-0 flex-col gap-3 p-4 sm:p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 transition-all duration-200"
			data-equal-height-card
			onClick={handleCardClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onClick?.();
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div className="glass-card-cap" />

			{/* Header: PDF + actions */}
			<div className="flex items-start justify-between gap-3 mt-2 min-w-0">
				<Thumbnail
					type="application/pdf"
					extension="pdf"
					url={license.licenseUrl ?? ""}
					className="size-12 sm:size-14 shrink-0"
					imageClassName="!size-8 sm:!size-9"
				/>
				<div
					className="flex flex-col items-end gap-1.5 shrink-0"
					onClick={(e) => e.stopPropagation()}
					onKeyDown={(e) => e.stopPropagation()}
				>
					<LicenseActionDropdown
						license={license}
						onRefresh={onRefresh}
						onLicenseRemoved={onLicenseRemoved}
					/>
					{license.fileSize != null && license.fileSize > 0 && (
						<span className="text-[10px] text-slate-500 tabular-nums">
							{convertFileSize({ sizeInBytes: license.fileSize })}
						</span>
					)}
				</div>
			</div>

			{/* Title + status */}
			<div className="min-w-0 space-y-2">
				<p className="subtitle-2 line-clamp-2 wrap-break-word text-slate-700">
					{license.licenseName}
				</p>
				<div className="flex items-center gap-2 flex-wrap">
					{statusBadge(license.status, expiryDate)}
					{divisionLabel && (
						<span className="inline-block px-1.5 py-0.5 border border-slate-200 bg-white/50 text-slate-600 text-xs rounded-full font-medium capitalize">
							{divisionLabel}
						</span>
					)}
				</div>
			</div>

			{/* Flat meta rows (Remote / Etsy pattern) */}
			<div className="min-w-0 rounded-lg bg-white/40 border border-white/50 px-3 py-1">
				{license.licenseNumber && (
					<MetaRow label="License #">{license.licenseNumber}</MetaRow>
				)}
				{issueDate && (
					<MetaRow label="Issued">
						<FormattedDate date={issueDate} className="text-inherit" />
					</MetaRow>
				)}
				{expiryDate && (
					<MetaRow
						label={isExpired ? "Expired" : "Expires"}
						emphasize={
							isExpired ? "danger" : isExpiringSoon ? "warning" : undefined
						}
					>
						<FormattedDate date={expiryDate} className="text-inherit" />
					</MetaRow>
				)}
				{(managerIds.length > 0 || loadingAssigned) && (
					<MetaRow label="Assigned">
						{loadingAssigned ? (
							<span className="inline-flex items-center gap-1.5 justify-end">
								<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
								Loading...
							</span>
						) : assignedNames.length > 0 ? (
							assignedNames.join(", ")
						) : (
							"—"
						)}
					</MetaRow>
				)}
			</div>

			{/* Footer */}
			<p className="caption mt-auto line-clamp-1 wrap-break-word text-slate-500">
				By:{" "}
				{loadingUploader ? (
					<span className="inline-flex items-center gap-1 align-middle">
						<Loader2 className="h-3 w-3 animate-spin shrink-0" />
						Loading...
					</span>
				) : (
					(uploaderName ?? (license.createdBy ? "Unknown" : "—"))
				)}
			</p>
		</div>
	);
}
