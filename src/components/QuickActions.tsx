"use client";

import type { Models } from "appwrite";
import { Calendar, TrendingUp } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import ReportGenerator from "@/components/ReportGenerator";
import { Button } from "@/components/ui/button";
import { useUserRoles } from "@/hooks/useUserRoles";

const ContractUploadForm = dynamic(
	() => import("@/components/ContractUploadForm"),
	{ ssr: false, loading: () => null },
);

const LicenseUploadForm = dynamic(() => import("@/components/license-upload"), {
	ssr: false,
	loading: () => null,
});

const quickActionBtn =
	"primary-btn h-9 px-3.5 sm:px-4 shadow-drop-1 text-xs sm:text-sm whitespace-nowrap gap-1.5 [&_svg]:size-3.5";

interface QuickActionsProps {
	user?:
		| (Models.User<Models.Preferences> & {
				division?: string;
		  })
		| null;
}

const QuickActions = ({ user }: QuickActionsProps) => {
	const [reportOpen, setReportOpen] = useState(false);
	const { roles: userRoles } = useUserRoles();

	const isITUser = useMemo(() => {
		return userRoles.some((r) => r.roleName === "IT");
	}, [userRoles]);

	return (
		<div className="quick-actions-container flex min-w-0 w-full items-center gap-1 overflow-x-auto pb-1 sm:gap-1.5 sm:pb-0">
			{!isITUser && user && (
				<ContractUploadForm
					ownerId={user.$id}
					accountId={user.$id}
					triggerLabel="Upload Contract"
					className={quickActionBtn}
					onSuccess={() => {
						console.log("Contract uploaded successfully");
					}}
				/>
			)}
			{!isITUser && (
				<>
					<LicenseUploadForm
						ownerId={user?.$id || ""}
						accountId={user?.$id || ""}
						triggerLabel="Upload License"
						className={quickActionBtn}
						onSuccess={() => {
							console.log("License uploaded successfully");
						}}
					/>
					<Button className={quickActionBtn} title="Upload Audit">
						<Calendar className="size-3.5" />
						Audit
					</Button>
				</>
			)}
			<Button className={quickActionBtn} title="Schedule Review">
				<Calendar className="size-3.5" />
				Schedule
			</Button>
			<Button
				className={quickActionBtn}
				title="Generate Report"
				onClick={() => setReportOpen(true)}
			>
				<TrendingUp className="size-3.5" />
				Report
			</Button>
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
