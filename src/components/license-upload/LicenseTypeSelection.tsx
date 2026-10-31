/**
 * "Select License Type" screen — the wizard's mandatory first step.
 * Visually mirrors ContractUploadForm.tsx's "Select Contract Type" screen.
 */

"use client";

import {
	ArrowRight,
	Baby,
	BadgeCheck,
	Brain,
	Building2,
	CircleHelp,
	FileBadge,
	FolderOpen,
	Gift,
	HardHat,
	Info,
	MoveRight,
	ShieldCheck,
	Smile,
	Stethoscope,
} from "lucide-react";
import Image from "next/image";
import {
	isDemoLicenseTypeAllowed,
	LICENSE_TYPE_CONFIGS,
} from "@/lib/licenses/licenseTypeConfigs";
import { cn } from "@/lib/utils";

const TYPE_SELECT_LABEL =
	"mb-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400";
const TYPE_SELECT_ICON_TILE =
	"flex shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/[.12] bg-[#0f5384]/[.07]";
const AI_ASSISTANT_OPEN_CHIP_CLASS =
	"inline-flex h-10 items-center gap-2 rounded-full border border-white/45 bg-white/38 px-4 text-sm font-medium text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-[#0f5384]/35 hover:bg-white/50";

const ICONS: Record<string, any> = {
	Building2,
	Baby,
	Brain,
	Stethoscope,
	Smile,
	BadgeCheck,
	HardHat,
	ShieldCheck,
	Gift,
};

function getIconComponent(iconName: string) {
	return ICONS[iconName] || FileBadge;
}

export interface LicenseTypeSelectionProps {
	savedDraftsCount: number;
	onOpenDrafts: () => void;
	onSelectType: (typeId: string) => void;
	onOpenAssistant: () => void;
}

export default function LicenseTypeSelection({
	savedDraftsCount,
	onOpenDrafts,
	onSelectType,
	onOpenAssistant,
}: LicenseTypeSelectionProps) {
	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
			{/* Header */}
			<div className="shrink-0 border-b border-slate-200 px-6 pb-4 pt-[22px] pr-12">
				<div className="flex items-center gap-2.5">
					<div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] border border-[#0f5384]/15 bg-white">
						<ShieldCheck
							className="h-[17px] w-[17px] text-[#0f5384]"
							aria-hidden
						/>
					</div>
					<h2 className="text-[17px] font-bold leading-tight tracking-tight text-[#0f5384]">
						Select License Type
					</h2>
				</div>
				<p className="mt-1 pl-11 text-[12.5px] leading-normal text-slate-500">
					Choose the type of license or compliance record you want to upload.
					This will customize the form fields to match your specific record
					requirements.
				</p>
			</div>

			{/* Body */}
			<div className="min-h-0 flex-1 overflow-y-auto px-[22px] pb-1 pt-[18px]">
				<p className={TYPE_SELECT_LABEL}>Saved drafts</p>
				<div
					role="button"
					tabIndex={0}
					aria-label={`Drafts — ${savedDraftsCount === 0 ? "No drafts saved" : `${savedDraftsCount} draft${savedDraftsCount === 1 ? "" : "s"}`}`}
					className={cn(
						"group mb-[18px] flex cursor-pointer items-center gap-3.5 rounded-xl border-[1.5px] border-slate-200 bg-white/80 px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-200",
						"hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)]",
						"focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
					)}
					onClick={onOpenDrafts}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							onOpenDrafts();
						}
					}}
				>
					<div className={cn(TYPE_SELECT_ICON_TILE, "h-9 w-9")}>
						<FolderOpen
							className="h-[17px] w-[17px] text-[#0f5384]"
							aria-hidden
						/>
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-bold text-[#0f5384]">Drafts</p>
						<p className="text-xs leading-snug text-slate-500">
							Resume a license upload you started earlier and pick up where you
							left off without re-entering details
						</p>
					</div>
					<span className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-semibold text-slate-400">
						<Info className="h-3 w-3" aria-hidden />
						{savedDraftsCount === 0
							? "No drafts saved"
							: `${savedDraftsCount} draft${savedDraftsCount === 1 ? "" : "s"}`}
					</span>
				</div>

				<p className={TYPE_SELECT_LABEL}>License types</p>
				<div className="grid grid-cols-1 gap-3 pb-4 sm:grid-cols-2 lg:grid-cols-3">
					{LICENSE_TYPE_CONFIGS.map((type) => {
						const IconComponent = getIconComponent(type.icon);
						const disabled = !isDemoLicenseTypeAllowed(type.id);
						const totalSteps = type.steps.length + 2; // file upload + review
						return (
							<div
								key={type.id}
								role="button"
								tabIndex={disabled ? -1 : 0}
								aria-disabled={disabled}
								aria-label={`${type.label} — ${totalSteps} steps`}
								title={disabled ? "Coming soon" : undefined}
								className={cn(
									"group flex flex-col rounded-xl border-[1.5px] border-slate-200 bg-white/80 px-3.5 pb-3 pt-3.5 transition-[border-color,background-color,box-shadow] duration-200",
									disabled
										? "pointer-events-none cursor-not-allowed opacity-50"
										: "cursor-pointer hover:border-[#078fab] hover:bg-[#078fab]/[.04] hover:shadow-[0_2px_12px_rgba(7,143,171,0.10)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#078fab]",
								)}
								onClick={() => {
									if (disabled) return;
									onSelectType(type.id);
								}}
								onKeyDown={(e) => {
									if (disabled) return;
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										onSelectType(type.id);
									}
								}}
							>
								<div
									className={cn(
										TYPE_SELECT_ICON_TILE,
										"mb-2.5 h-8 w-8 rounded-lg",
									)}
								>
									<IconComponent
										className="h-4 w-4 text-[#0f5384]"
										aria-hidden
									/>
								</div>
								<h3 className="mb-[5px] text-[13.5px] font-bold leading-tight text-[#0f5384]">
									{type.label}
								</h3>
								<p className="flex-1 text-[11.5px] leading-normal text-slate-500">
									{type.description}
								</p>
								<div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2">
									<span className="text-[11px] font-semibold text-slate-400">
										{totalSteps} steps
									</span>
									<span
										className="flex h-5 w-5 items-center justify-center rounded-[5px] bg-[#078fab]/[.08] text-[#078fab] transition-[transform,background-color] duration-200 group-hover:translate-x-0.5 group-hover:bg-[#078fab]/[.16]"
										aria-hidden
									>
										<ArrowRight className="h-2.5 w-2.5" />
									</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* Footer */}
			<div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5.5 pb-3.5 pt-3">
				<p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
					<CircleHelp
						className="h-3.25 w-3.25 shrink-0 text-[#078fab]"
						aria-hidden
					/>
					Need help? Use the CAALM License Type Assistant to pick the best
					license type.
					<MoveRight className="h-3.5 w-3.5 text-[#078fab]" />
				</p>
				<button
					type="button"
					onClick={onOpenAssistant}
					className={cn(
						AI_ASSISTANT_OPEN_CHIP_CLASS,
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/30",
					)}
				>
					<Image
						src="/assets/icons/ai-icon.svg"
						alt=""
						width={22}
						height={22}
					/>
					<span className="text-xs font-semibold text-[#0f5384]">
						License Type assistant
					</span>
				</button>
			</div>
		</div>
	);
}
