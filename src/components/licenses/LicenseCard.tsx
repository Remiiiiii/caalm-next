"use client";

import { Building2, Calendar, Loader2, ScrollText } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { FormattedDate } from "@/components/FormattedDateTime";
import Thumbnail from "@/components/Thumbnail";
import { fetchUserNamesByIds } from "@/lib/actions/user.actions";
import { convertFileSize } from "@/lib/utils";
import type { License } from "@/types/licenses";
import LicenseActionDropdown from "./LicenseActionDropdown";

// Match contract card status badge styling from Card.tsx
function statusBadge(
	status: string | undefined,
	licenseExpiryDate?: string,
): React.ReactNode {
	const isExpired =
		status?.toLowerCase() === "expired" ||
		(licenseExpiryDate && new Date(licenseExpiryDate) < new Date());

	if (isExpired) {
		return (
			<span className="inline-block px-2 py-1 border-2 border-purple-600 bg-purple-50 text-purple-900 text-xs rounded-xl font-medium mr-auto">
				Expired
			</span>
		);
	}

	switch (status) {
		case "pending-review":
			return (
				<span className="inline-block px-2 py-1 border-2 border-amber-400 bg-[#FFEA99] text-[#E86100] text-xs rounded-xl font-medium mr-auto">
					Pending Review
				</span>
			);
		case "action-required":
			return (
				<span className="inline-block px-2 py-1 border-2 border-red-400 bg-destructive/10 text-destructive text-xs rounded-xl font-medium mr-auto">
					Action Required
				</span>
			);
		case "active":
			return (
				<span className="inline-block px-2 py-1 border-2 border-cyan-400 bg-[#B3EBF2] text-[#12477D] text-xs rounded-xl font-medium">
					Active
				</span>
			);
		case "inactive":
			return (
				<span className="inline-block px-2 py-1 border-2 border-slate-500 bg-[#D3D3D3] text-[#878787] text-xs rounded-xl font-medium mr-auto">
					Inactive
				</span>
			);
		default:
			return (
				<span className="inline-block px-2 py-1 border-2 border-slate-200 bg-slate-100 text-slate-800 text-xs rounded-xl font-medium">
					{status || "Unknown"}
				</span>
			);
	}
}

const detailBoxStyle = {
	background: "rgba(255, 255, 255, 0.3)",
	backdropFilter: "blur(8px)",
	WebkitBackdropFilter: "blur(8px)" as const,
	border: "1px solid rgba(255, 255, 255, 0.5)",
};

interface LicenseCardProps {
	license: License;
	onClick?: () => void;
	onRefresh?: () => void;
}

export default function LicenseCard({
	license,
	onClick,
	onRefresh,
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
	}, [managerIds.map, managerIds]);

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

	return (
		<div className="file-card relative" onClick={handleCardClick}>
			{/* Professional cap (same as contract card) */}
			<div
				className="absolute top-0 left-0 right-0 h-4 rounded-t-[18px]"
				style={{
					background: "rgba(214, 215, 216, 0.5)",
					backdropFilter: "blur(4px)",
					WebkitBackdropFilter: "blur(4px)",
				}}
			/>

			<div className="flex justify-between text-slate-700 mt-2">
				<Thumbnail
					type="application/pdf"
					extension="pdf"
					url={license.licenseUrl ?? ""}
					className="size-20"
					imageClassName="!size-11"
				/>
				<div className="flex flex-col items-end justify-between">
					<div onClick={(e) => e.stopPropagation()}>
						<LicenseActionDropdown license={license} onRefresh={onRefresh} />
					</div>
					<span
						className="inline-block px-2 py-1 text-slate-800 text-xs rounded-xl font-medium"
						style={detailBoxStyle}
					>
						{license.fileSize != null && license.fileSize > 0
							? convertFileSize({ sizeInBytes: license.fileSize })
							: "—"}
					</span>
				</div>
			</div>

			<div className="file-card-details">
				<p className="subtitle-2 line-clamp-1">{license.licenseName}</p>
				{(license.status || expiryDate) && (
					<>
						<div className="mb-1 flex items-center gap-2 flex-wrap">
							{statusBadge(license.status, expiryDate)}
						</div>
						<hr className="border-slate-200 my-1" />
					</>
				)}

				<div className="flex flex-col gap-3">
					{/* License number */}
					{license.licenseNumber && (
						<div className="rounded-lg p-2" style={detailBoxStyle}>
							<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
								<ScrollText className="h-4 w-4 text-slate-500 shrink-0" />
								<p className="body-2 text-slate-700 font-medium whitespace-nowrap">
									License number:
								</p>
								<div className="min-w-0 flex-1">
									<p className="body-2 text-slate-700 wrap-break-words">
										{license.licenseNumber}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Issued */}
					{issueDate && (
						<div className="rounded-lg p-2" style={detailBoxStyle}>
							<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
								<Calendar className="h-4 w-4 text-slate-500 shrink-0" />
								<p className="body-2 text-slate-700 font-medium whitespace-nowrap">
									Issued:
								</p>
								<div className="min-w-0 flex-1">
									<FormattedDate
										date={issueDate}
										className="body-2 text-slate-700 wrap-break-words"
									/>
								</div>
							</div>
						</div>
					)}

					{/* Expires */}
					{expiryDate &&
						(() => {
							const isExpired = new Date(expiryDate) < new Date();
							return (
								<div
									className="rounded-lg p-2"
									style={{
										background: "rgba(255, 255, 255, 0.3)",
										backdropFilter: "blur(8px)",
										WebkitBackdropFilter: "blur(8px)",
										border: "1px solid rgba(255, 255, 255, 0.5)",
									}}
								>
									<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
										<Calendar className="h-4 w-4 text-slate-500 shrink-0" />
										<p
											className={`body-2 font-medium whitespace-nowrap ${isExpired ? "text-[#E5252A]!" : "text-slate-700"}`}
										>
											{isExpired ? "Expired on:" : "Expires on:"}
										</p>
										<div className="min-w-0 flex-1">
											<FormattedDate
												date={expiryDate}
												className={`body-2 wrap-break-words ${isExpired ? "text-[#E5252A]!" : "text-slate-700"}`}
											/>
										</div>
									</div>
								</div>
							);
						})()}

					{/* Division */}
					{divisionLabel && (
						<div className="rounded-lg p-2" style={detailBoxStyle}>
							<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
								<Building2 className="h-4 w-4 text-slate-500 shrink-0" />
								<p className="body-2 text-slate-700 font-medium whitespace-nowrap">
									Division:
								</p>
								<div className="min-w-0 flex-1">
									<p className="body-2 text-slate-700 wrap-break-words capitalize">
										{divisionLabel}
									</p>
								</div>
							</div>
						</div>
					)}

					{/* Assigned To */}
					{(managerIds.length > 0 || loadingAssigned) && (
						<div className="rounded-lg p-2" style={detailBoxStyle}>
							<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
								<p className="body-2 text-slate-700 font-medium whitespace-nowrap">
									Assigned To:
								</p>
								<div className="min-w-0 flex-1">
									<p className="body-2 text-slate-700 wrap-break-words">
										{loadingAssigned ? (
											<span className="inline-flex items-center gap-1.5">
												<Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
												Loading...
											</span>
										) : assignedNames.length > 0 ? (
											assignedNames.join(", ")
										) : (
											"—"
										)}
									</p>
								</div>
							</div>
						</div>
					)}
				</div>

				<hr className="my-1 border-white/30" />
				<p className="caption line-clamp-1 text-light-200">
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
		</div>
	);
}
