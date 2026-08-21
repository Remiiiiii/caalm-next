"use client";

import {
	BookOpen,
	CircleHelp,
	Columns3Cog,
	Mail,
	MessageCircleQuestionMark,
	MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import AdjustPlanDialog from "@/components/sidebar/AdjustPlanDialog";
import {
	AppDropdownMenuContent,
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NavigationItem } from "@/constants/navigation-permissions";
import { useBillingSubscription } from "@/hooks/useBillingSubscription";
import { useOrgPlanSummary } from "@/hooks/useOrgPlanSummary";
import { normalizePricingTier } from "@/lib/billing/entitlements";
import { cn } from "@/lib/utils";

type SidebarUserCardProps = {
	name?: string;
	email: string;
	settingsItems: NavigationItem[];
	compact?: boolean;
};

const HELP_LINKS = [
	{ href: "/docs", label: "CAALM Docs", icon: BookOpen },
	{ href: "/help", label: "Get help", icon: MessageCircleQuestionMark },
	{ href: "/contact", label: "Contact Us", icon: Mail },
] as const;

export default function SidebarUserCard({
	name,
	email,
	settingsItems,
	compact = false,
}: SidebarUserCardProps) {
	const { label, isLoading, tier } = useOrgPlanSummary();
	useBillingSubscription();
	const [planOpen, setPlanOpen] = useState(false);
	const displayName = name?.trim() || "Account";
	const planTier = normalizePricingTier(tier);
	const upgradeLabel =
		planTier === "growth"
			? "Upgrade to Enterprise"
			: planTier === "enterprise"
				? "Adjust plan"
				: "Upgrade to Growth";

	const menu = (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Account menu"
					className={cn(
						"inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-600 transition-colors duration-200",
						"hover:bg-white/70 hover:text-slate-800",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
						compact ? "h-10 w-10" : "h-7 w-7",
					)}
				>
					<MoreHorizontal className={compact ? "h-5 w-5" : "h-4 w-4"} />
				</button>
			</DropdownMenuTrigger>
			<AppDropdownMenuContent
				side={compact ? "right" : "top"}
				align={compact ? "end" : "end"}
				className="w-56 overflow-visible"
				contentClassName="px-1 pb-1 pt-4"
			>
				<DropdownMenuLabel className="truncate px-2 py-1.5 text-xs font-normal text-slate-600">
					{email || "No email on file"}
				</DropdownMenuLabel>
				<DropdownMenuItem
					className="mx-1 mb-1 mt-0.5 cursor-pointer justify-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-3 py-2 text-sm font-medium text-slate-800 focus:bg-blue-50"
					onSelect={() => setPlanOpen(true)}
				>
					<Columns3Cog className="h-4 w-4 text-[#0f5384]" />
					{upgradeLabel}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{settingsItems.length > 0 ? (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="shad-dropdown-item cursor-pointer gap-2">
							<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center">
								<Image
									src="/assets/icons/settings.svg"
									alt=""
									width={14}
									height={14}
									className="h-3.5 w-3.5 object-contain grayscale"
								/>
							</span>
							<span className="text-slate-800">Settings</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent
							sideOffset={2}
							className="z-100 min-w-48 border border-white/30 bg-white/95 p-1 text-slate-700 shadow-md"
						>
							{settingsItems.map((item) =>
								item.url ? (
									<DropdownMenuItem key={item.url} asChild>
										<Link
											href={item.url}
											className="cursor-pointer px-2 py-1.5 text-sm text-slate-800"
										>
											{item.name}
										</Link>
									</DropdownMenuItem>
								) : null,
							)}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				) : null}
				<DropdownMenuSub>
					<DropdownMenuSubTrigger className="shad-dropdown-item cursor-pointer gap-2">
						<span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200/70 text-slate-700">
							<CircleHelp className="h-3.5 w-3.5" />
						</span>
						<span className="text-slate-800">Help</span>
					</DropdownMenuSubTrigger>
					<DropdownMenuSubContent
						sideOffset={2}
						className="z-100 min-w-48 border border-white/30 bg-white/95 p-1 text-slate-700 shadow-md"
					>
						{HELP_LINKS.map((item) => {
							const Icon = item.icon;
							return (
								<DropdownMenuItem key={item.href} asChild>
									<Link
										href={item.href}
										className="cursor-pointer gap-2 px-2 py-1.5 text-sm text-slate-800"
									>
										<Icon className="h-4 w-4 text-slate-600" />
										{item.label}
									</Link>
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuSubContent>
				</DropdownMenuSub>
			</AppDropdownMenuContent>
		</DropdownMenu>
	);

	return (
		<>
			{compact ? (
				<div className="mt-auto flex justify-center pb-1">{menu}</div>
			) : (
				<div className="sidebar-user-info">
					<div className="min-w-0 w-full">
						<p className="truncate text-xs font-semibold leading-tight text-slate-700">
							{displayName}
						</p>
						<div className="flex items-center gap-1">
							<p className="min-w-0 flex-1 truncate text-xs leading-tight text-slate-600">
								{isLoading ? "Loading plan…" : label}
							</p>
							{menu}
						</div>
					</div>
				</div>
			)}
			<AdjustPlanDialog open={planOpen} onOpenChange={setPlanOpen} />
		</>
	);
}
