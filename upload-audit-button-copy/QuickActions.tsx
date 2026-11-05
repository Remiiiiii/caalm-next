"use client";

import type { Models } from "appwrite";
import { Calendar, ChartLine, ClipboardCheck } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import ReportGenerator from "@/components/ReportGenerator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserRoles } from "@/hooks/useUserRoles";
import { cn } from "@/lib/utils";

const ContractUploadForm = dynamic(
	() => import("@/components/ContractUploadForm"),
	{ ssr: false, loading: () => null },
);

const LicenseUploadForm = dynamic(() => import("@/components/license-upload"), {
	ssr: false,
	loading: () => null,
});

interface QuickActionsProps {
	user?:
		| (Models.User<Models.Preferences> & {
				division?: string;
		  })
		| null;
}

function ActionTooltip({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>{children}</TooltipTrigger>
				<TooltipContent className="text-xs">{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

type QuickAction = "contract" | "license" | "audit" | "schedule" | "report";

const QuickActions = ({ user }: QuickActionsProps) => {
	const [reportOpen, setReportOpen] = useState(false);
	const [activeAction, setActiveAction] = useState<QuickAction>("contract");
	const { roles: userRoles } = useUserRoles();

	const isITUser = useMemo(
		() => userRoles.some((r) => r.roleName === "IT"),
		[userRoles],
	);

	return (
		<div className="segmented-toggle">
			{!isITUser && user && (
				<ContractUploadForm
					ownerId={user.$id}
					accountId={user.$id}
					iconOnly
					active={activeAction === "contract"}
					onTriggerClick={() => setActiveAction("contract")}
					onSuccess={() => {}}
				/>
			)}
			{!isITUser && (
				<>
					<LicenseUploadForm
						ownerId={user?.$id || ""}
						accountId={user?.$id || ""}
						iconOnly
						active={activeAction === "license"}
						onTriggerClick={() => setActiveAction("license")}
						onSuccess={() => {}}
					/>
					<ActionTooltip label="Upload Audit">
						<button
							type="button"
							className={cn(
								"segmented-toggle-item px-2.5",
								activeAction === "audit" && "segmented-toggle-item-active",
							)}
							aria-label="Audit"
							onClick={() => setActiveAction("audit")}
						>
							<ClipboardCheck className="h-4 w-4 shrink-0" aria-hidden />
						</button>
					</ActionTooltip>
				</>
			)}
			<ActionTooltip label="Schedule Review">
				<button
					type="button"
					className={cn(
						"segmented-toggle-item px-2.5",
						activeAction === "schedule" && "segmented-toggle-item-active",
					)}
					aria-label="Schedule"
					onClick={() => setActiveAction("schedule")}
				>
					<Calendar className="h-4 w-4 shrink-0" aria-hidden />
				</button>
			</ActionTooltip>
			<ActionTooltip label="Generate Report">
				<button
					type="button"
					className={cn(
						"segmented-toggle-item px-2.5",
						activeAction === "report" && "segmented-toggle-item-active",
					)}
					aria-label="Report"
					onClick={() => {
						setActiveAction("report");
						setReportOpen(true);
					}}
				>
					<ChartLine className="h-4 w-4 shrink-0" aria-hidden />
				</button>
			</ActionTooltip>
			<ReportGenerator
				open={reportOpen}
				onClose={() => setReportOpen(false)}
				department={user?.division}
				user={user}
			/>
		</div>
	);
};

export default QuickActions;
