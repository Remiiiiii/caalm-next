"use client";

import {
	ArrowLeft,
	Brain,
	GitMerge,
	HeartHandshake,
	Mail,
	MapPin,
	Phone,
	User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FundraisingIntelligenceTab } from "@/components/constituents/FundraisingIntelligenceTab";
import { HouseholdTab } from "@/components/constituents/HouseholdTab";
import { MergeConstituentsDialog } from "@/components/constituents/MergeConstituentsDialog";
import { TimelineTab } from "@/components/constituents/TimelineTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import type { Constituent } from "@/lib/constituents";
import {
	CONSTITUENT_DNC_BADGE_CLASS,
	constituentDisplayName,
	constituentTypeBadgeClass,
	constituentTypeLabel,
} from "@/lib/constituents/display";

function EmptyTab({
	icon: Icon,
	title,
	message,
}: {
	icon: typeof Brain;
	title: string;
	message: string;
}) {
	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<Icon className="h-8 w-8 text-[#0f5384]" />
			<p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
			<p className="mt-1 max-w-md text-xs text-slate-600">{message}</p>
		</div>
	);
}

function Field({ label, value }: { label: string; value?: string }) {
	return (
		<div>
			<p className="text-xs font-medium text-slate-500">{label}</p>
			<p className="mt-1 text-sm text-slate-700">{value || "—"}</p>
		</div>
	);
}

export function ConstituentProfile({
	constituent,
}: {
	constituent: Constituent;
}) {
	const { permissions } = usePermissions();
	const canManage = permissions.includes(PERMISSIONS.CONSTITUENTS.MANAGE);
	const canFundraising = permissions.includes(PERMISSIONS.AI.FUNDRAISING);
	const [mergeOpen, setMergeOpen] = useState(false);
	const name = constituentDisplayName(constituent);
	const address = [
		constituent.addressLine1,
		constituent.city,
		constituent.region,
		constituent.postalCode,
		constituent.country,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<div>
			<div className="mb-4 flex w-full items-center justify-start gap-4 self-start">
				<Link
					href="/constituents"
					className="inline-flex items-center gap-2 text-sm font-medium text-[#0f5384] hover:underline"
				>
					<ArrowLeft className="h-4 w-4" />
					Constituents
				</Link>
			</div>

			<div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="h1 capitalize sidebar-gradient-text">{name}</h1>
					<span
						className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${constituentTypeBadgeClass(constituent.type)}`}
					>
						{constituentTypeLabel(constituent.type)}
					</span>
					{constituent.doNotContact ? (
						<span
							className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium border ${CONSTITUENT_DNC_BADGE_CLASS}`}
						>
							Do not contact
						</span>
					) : null}
				</div>
				{canManage ? (
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => setMergeOpen(true)}
					>
						<GitMerge className="h-4 w-4" />
						Merge duplicate
					</Button>
				) : null}
			</div>

			<Card className="glass-card mb-6">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<p className="text-sm font-medium sidebar-gradient-text mb-4">
						Contact
					</p>
					<div className="grid grid-cols-2 gap-6">
						<div className="flex items-start gap-3">
							<Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
							<Field label="Email" value={constituent.email} />
						</div>
						<div className="flex items-start gap-3">
							<Phone className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
							<Field label="Phone" value={constituent.phone} />
						</div>
						<div className="flex items-start gap-3 col-span-2">
							<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
							<Field label="Address" value={address} />
						</div>
						<div className="flex items-start gap-3">
							<User className="mt-0.5 h-4 w-4 shrink-0 text-[#0f5384]" />
							<Field label="Type" value={constituentTypeLabel(constituent.type)} />
						</div>
					</div>
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6">
					<Tabs defaultValue="timeline">
						<TabsList>
							<TabsTrigger value="timeline">Timeline</TabsTrigger>
							<TabsTrigger value="household">Household</TabsTrigger>
							<TabsTrigger value="volunteer">Volunteer</TabsTrigger>
							{canFundraising ? (
								<TabsTrigger value="intelligence">Intelligence</TabsTrigger>
							) : null}
						</TabsList>
						<TabsContent value="timeline">
							<TimelineTab
								constituentId={constituent.$id}
								canManage={canManage}
							/>
						</TabsContent>
						<TabsContent value="household">
							<HouseholdTab
								constituentId={constituent.$id}
								canManage={canManage}
							/>
						</TabsContent>
						<TabsContent value="volunteer">
							<EmptyTab
								icon={HeartHandshake}
								title="No volunteer record yet"
								message="Shifts and approved hours will appear here."
							/>
						</TabsContent>
						{canFundraising ? (
							<TabsContent value="intelligence">
								<FundraisingIntelligenceTab constituentId={constituent.$id} />
							</TabsContent>
						) : null}
					</Tabs>
				</CardContent>
			</Card>

			<MergeConstituentsDialog
				open={mergeOpen}
				onOpenChange={setMergeOpen}
				winner={constituent}
				onMerged={() => {
					window.location.reload();
				}}
			/>
		</div>
	);
}
