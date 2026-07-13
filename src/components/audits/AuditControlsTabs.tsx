"use client";

import {
	BadgeCheck,
	FileText,
	Scale,
	Shield,
	Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuditDomainTabContent } from "@/components/audits/AuditDomainTabContent";
import { AuditGlobalFilters } from "@/components/audits/AuditGlobalFilters";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
	AUDIT_CONTROL_TABS,
	type AuditControlDomain,
	type AuditPeriod,
} from "@/lib/audits/types";

const TAB_ICONS: Record<AuditControlDomain, typeof Shield> = {
	regulatory: Scale,
	contracts: FileText,
	licenses: BadgeCheck,
	documents: FileText,
	governance: Users,
};

const VALID_TABS = AUDIT_CONTROL_TABS.map((t) => t.id);

export function AuditControlsTabs() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { toast } = useToast();

	const tabParam = searchParams?.get("tab") as AuditControlDomain | null;
	const [activeTab, setActiveTab] = useState<AuditControlDomain>(
		tabParam && VALID_TABS.includes(tabParam) ? tabParam : "regulatory",
	);
	const [period, setPeriod] = useState<AuditPeriod>("30d");
	const [search, setSearch] = useState("");

	useEffect(() => {
		if (tabParam && VALID_TABS.includes(tabParam)) {
			setActiveTab(tabParam);
		}
	}, [tabParam]);

	const handleTabChange = useCallback(
		(value: string) => {
			const next = value as AuditControlDomain;
			setActiveTab(next);
			const params = new URLSearchParams(searchParams?.toString() ?? "");
			params.set("tab", next);
			router.replace(`/audits/status?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	const handleExport = () => {
		toast({
			title: "Export started",
			description: "Board-ready compliance report export is being prepared.",
		});
	};

	return (
		<div className="space-y-6">
			<AuditGlobalFilters
				period={period}
				onPeriodChange={setPeriod}
				search={search}
				onSearchChange={setSearch}
				onExport={handleExport}
			/>

			<Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
				<TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6 bg-white border border-slate-200 h-auto gap-1 p-1">
					{AUDIT_CONTROL_TABS.map((tab) => {
						const Icon = TAB_ICONS[tab.id];
						const isActive = activeTab === tab.id;
						return (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="flex items-center gap-2 tabs-underline py-2.5 [&[data-state=active]>span]:sidebar-gradient-text"
							>
								<Icon
									className={`w-4 h-4 ${isActive ? "text-[#0f5384]" : "text-slate-500"}`}
								/>
								<span className="text-xs sm:text-sm">{tab.label}</span>
							</TabsTrigger>
						);
					})}
				</TabsList>

				{AUDIT_CONTROL_TABS.map((tab) => (
					<TabsContent key={tab.id} value={tab.id} className="mt-0">
						<AuditDomainTabContent
							domain={tab.id}
							period={period}
							search={search}
						/>
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
