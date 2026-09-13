"use client";

import { Plus, Trash2, UserRoundArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardContent, Card as GlassCard } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useToast } from "@/hooks/use-toast";
import type {
	ApprovalDelegation,
	DelegationEntityType,
} from "@/lib/approvals/approvalDelegations";

type DirectoryUser = {
	$id: string;
	accountId?: string | null;
	fullName: string;
	email: string;
};

const selectClass =
	"h-10 w-full rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700";

export function ApprovalDelegationsManager() {
	const { orgId } = useOrganization();
	const { toast } = useToast();
	const [delegations, setDelegations] = useState<ApprovalDelegation[]>([]);
	const [directory, setDirectory] = useState<DirectoryUser[]>([]);
	const [delegateUserId, setDelegateUserId] = useState("");
	const [entityType, setEntityType] = useState<DelegationEntityType>("both");
	const [startsAt, setStartsAt] = useState("");
	const [endsAt, setEndsAt] = useState("");

	const load = useCallback(async () => {
		if (!orgId) return;
		const res = await fetch(
			`/api/approvals/delegations?orgId=${encodeURIComponent(orgId)}`,
		);
		const json = await res.json();
		setDelegations(Array.isArray(json.delegations) ? json.delegations : []);
	}, [orgId]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (!orgId) return;
		void fetch("/api/users/directory", {
			headers: { "x-org-id": orgId },
		})
			.then(async (res) => {
				const body = await res.json().catch(() => []);
				const list = (
					Array.isArray(body) ? body : body.users || []
				) as DirectoryUser[];
				setDirectory(list.filter((row) => row.$id));
			})
			.catch(() => setDirectory([]));
	}, [orgId]);

	const nameForId = (id: string) => {
		const match = directory.find(
			(row) => row.accountId === id || row.$id === id,
		);
		return match
			? `${match.fullName}${match.email ? ` (${match.email})` : ""}`
			: id;
	};

	const save = async () => {
		if (!orgId || !delegateUserId || !startsAt || !endsAt) {
			toast({
				title: "Missing fields",
				description: "Delegate, start, and end are required.",
				variant: "destructive",
			});
			return;
		}
		const res = await fetch(
			`/api/approvals/delegations?orgId=${encodeURIComponent(orgId)}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					delegateUserId,
					entityType,
					startsAt: new Date(startsAt).toISOString(),
					endsAt: new Date(endsAt).toISOString(),
				}),
			},
		);
		const json = await res.json();
		if (!res.ok || !json.success) {
			toast({
				title: "Save failed",
				description: json.message || "Could not save delegation",
				variant: "destructive",
			});
			return;
		}
		setDelegateUserId("");
		await load();
	};

	return (
		<GlassCard className="glass-card">
			<div className="glass-card-cap" />
			<CardContent className="space-y-4 p-4 sm:p-6">
				<div>
					<p className="text-sm font-medium sidebar-gradient-text">
						Out-of-office delegates
					</p>
					<p className="text-xs text-slate-600">
						While you are away, your delegate is added to current approval
						steps (and applied by the nightly SLA cron).
					</p>
				</div>
				<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
					<div>
						<Label>Delegate</Label>
						<select
							className={selectClass}
							value={delegateUserId}
							onChange={(e) => setDelegateUserId(e.target.value)}
						>
							<option value="">Select a person…</option>
							{directory.map((user) => {
								const value = user.accountId || user.$id;
								return (
									<option key={user.$id} value={value}>
										{user.fullName} ({user.email})
									</option>
								);
							})}
						</select>
					</div>
					<div>
						<Label>Applies to</Label>
						<select
							className={selectClass}
							value={entityType}
							onChange={(e) =>
								setEntityType(e.target.value as DelegationEntityType)
							}
						>
							<option value="both">Contracts and licenses</option>
							<option value="contract">Contracts only</option>
							<option value="license">Licenses only</option>
						</select>
					</div>
					<div>
						<Label>Starts</Label>
						<Input
							type="datetime-local"
							className="border-[0.25px] border-slate-300"
							value={startsAt}
							onChange={(e) => setStartsAt(e.target.value)}
						/>
					</div>
					<div>
						<Label>Ends</Label>
						<Input
							type="datetime-local"
							className="border-[0.25px] border-slate-300"
							value={endsAt}
							onChange={(e) => setEndsAt(e.target.value)}
						/>
					</div>
				</div>
				<Button
					type="button"
					className="primary-btn px-3 sm:px-4"
					onClick={() => void save()}
				>
					<Plus className="h-4 w-4" />
					Add delegate window
				</Button>
				<ul className="space-y-2">
					{delegations.map((row) => (
						<li
							key={row.$id}
							className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
						>
							<p className="flex min-w-0 items-center gap-2 text-sm text-slate-700">
								<UserRoundArrowRight className="h-4 w-4 shrink-0 text-[#0f5384]" />
								<span className="truncate">
									{nameForId(row.delegateUserId)} · {row.entityType} ·{" "}
									{new Date(row.startsAt).toLocaleDateString()} –{" "}
									{new Date(row.endsAt).toLocaleDateString()}
								</span>
							</p>
							<Button
								type="button"
								variant="outline"
								className="delete-btn px-3"
								onClick={() => {
									void fetch(`/api/approvals/delegations/${row.$id}`, {
										method: "DELETE",
									}).then(() => load());
								}}
							>
								<Trash2 className="h-4 w-4" />
								Remove
							</Button>
						</li>
					))}
				</ul>
			</CardContent>
		</GlassCard>
	);
}
