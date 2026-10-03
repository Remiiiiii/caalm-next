"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ArrowRight,
	GripVertical,
	KeyRound,
	Loader2,
	Plus,
	Send,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import type {
	DonationPageConfigDraft,
	DonationPageConfigPayload,
	DonationPageConfigPublished,
	DonationPageConfigVersion,
} from "@/lib/give/donation-page-config/types";
import { MAX_SUGGESTED_AMOUNTS } from "@/lib/give/donation-page-config/validation";

function payloadFromDraft(draft: DonationPageConfigDraft): DonationPageConfigPayload {
	return JSON.parse(JSON.stringify(draft.payload)) as DonationPageConfigPayload;
}

function dollarsFromCents(cents: number): string {
	return String(cents / 100);
}

function centsFromDollars(value: string): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100);
}

export function DonationPageSettingsClient() {
	const { permissions } = usePermissions();
	const canEdit = permissions.includes(PERMISSIONS.DONATIONS.CONFIG_EDIT);
	const { toast } = useToast();

	const [draft, setDraft] = useState<DonationPageConfigDraft | null>(null);
	const [published, setPublished] = useState<DonationPageConfigPublished | null>(
		null,
	);
	const [versions, setVersions] = useState<DonationPageConfigVersion[]>([]);
	const [payload, setPayload] = useState<DonationPageConfigPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [publishing, setPublishing] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
	const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [draftRes, versionsRes] = await Promise.all([
				fetch("/api/give/donation-page-config/draft"),
				fetch("/api/give/donation-page-config/versions"),
			]);
			const draftJson = await draftRes.json();
			const versionsJson = await versionsRes.json();
			if (draftRes.ok) {
				setDraft(draftJson.draft);
				setPublished(draftJson.published ?? null);
				setPayload(payloadFromDraft(draftJson.draft));
				setLastSavedAt(draftJson.draft?.updatedAt ?? null);
			}
			if (versionsRes.ok) {
				setVersions(versionsJson.versions ?? []);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const hasUnpublishedChanges = useMemo(() => {
		if (!draft || !payload) return false;
		if (!published) return true;
		return (
			JSON.stringify(payload) !== JSON.stringify(published.payload) ||
			draft.updatedAt !== published.publishedAt
		);
	}, [draft, payload, published]);

	const persistDraft = useCallback(
		async (nextPayload: DonationPageConfigPayload, expectedVersion: number) => {
			if (!canEdit) return;
			setSaving(true);
			try {
				const res = await fetch("/api/give/donation-page-config/draft", {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ payload: nextPayload, expectedVersion }),
				});
				const json = await res.json();
				if (res.status === 409) {
					toast({
						title: "Draft changed elsewhere",
						description: "Reloading the latest draft.",
						variant: "destructive",
					});
					await load();
					return;
				}
				if (!res.ok) {
					toast({
						title: "Could not save",
						description: json.error ?? "Check your values and try again.",
						variant: "destructive",
					});
					return;
				}
				setDraft(json.draft);
				setPayload(payloadFromDraft(json.draft));
				setLastSavedAt(json.draft.updatedAt);
			} finally {
				setSaving(false);
			}
		},
		[canEdit, load, toast],
	);

	const scheduleSave = useCallback(
		(next: DonationPageConfigPayload) => {
			if (!canEdit || !draft) return;
			if (saveTimer.current) clearTimeout(saveTimer.current);
			saveTimer.current = setTimeout(() => {
				void persistDraft(next, draft.version);
			}, 800);
		},
		[canEdit, draft, persistDraft],
	);

	const updatePayload = (updater: (prev: DonationPageConfigPayload) => DonationPageConfigPayload) => {
		if (!payload || !canEdit) return;
		const next = updater(payload);
		setPayload(next);
		scheduleSave(next);
	};

	async function handlePublish() {
		if (!canEdit) return;
		setPublishing(true);
		try {
			const res = await fetch("/api/give/donation-page-config/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ changeSummary: "Published from settings" }),
			});
			const json = await res.json();
			if (!res.ok) {
				toast({
					title: "Publish failed",
					description: json.error ?? "Validation or server error",
					variant: "destructive",
				});
				return;
			}
			toast({ title: "Published", description: "The live donation page was updated." });
			await load();
		} finally {
			setPublishing(false);
		}
	}

	async function handlePreview() {
		const res = await fetch("/api/give/donation-page-config/preview", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({}),
		});
		const json = await res.json();
		if (!res.ok || !json.previewUrl) {
			toast({
				title: "Preview unavailable",
				description: json.error ?? "Could not create preview link",
				variant: "destructive",
			});
			return;
		}
		window.open(json.previewUrl, "_blank", "noopener,noreferrer");
	}

	async function handleRevert(versionNumber: number) {
		if (!canEdit) return;
		const res = await fetch("/api/give/donation-page-config/revert", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ targetVersionNumber: versionNumber }),
		});
		const json = await res.json();
		if (!res.ok) {
			toast({
				title: "Revert failed",
				description: json.error ?? "Could not revert",
				variant: "destructive",
			});
			return;
		}
		toast({ title: "Reverted", description: `Restored version ${versionNumber}.` });
		await load();
	}

	if (loading || !payload) {
		return (
			<p className="flex items-center gap-2 text-sm text-slate-600">
				<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
				Loading donation page settings…
			</p>
		);
	}

	const lowestCents = payload.amountsCents[0];
	const lowestKey = lowestCents ? String(lowestCents) : "2500";

	return (
		<div className="space-y-6">
			{hasUnpublishedChanges ? (
				<div className="rounded-lg border border-orange/20 bg-orange/10 px-4 py-3 text-sm text-slate-700">
					You have unpublished changes
					{lastSavedAt ? (
						<>
							{" "}
							— last saved{" "}
							{formatDistanceToNow(new Date(lastSavedAt), { addSuffix: true })}
						</>
					) : null}
					{saving ? " (saving…)" : null}
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-end gap-3">
				<Button
					type="button"
					variant="outline"
					className="border-[0.25px] border-slate-300"
					onClick={() => void handlePreview()}
				>
					Preview draft
					<ArrowRight className="h-4 w-4" />
				</Button>
				{canEdit ? (
					<Button
						type="button"
						className="primary-btn px-3 sm:px-4 bg-green text-white hover:bg-green/90"
						disabled={publishing || !hasUnpublishedChanges}
						onClick={() => void handlePublish()}
					>
						{publishing ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
						Publish changes
					</Button>
				) : (
					<span className="inline-flex items-center gap-1 text-xs text-slate-500">
						<KeyRound className="h-3.5 w-3.5" />
						View only — need donations.config.edit to publish
					</span>
				)}
			</div>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">
						Suggested amounts
					</p>
					<div className="space-y-2">
						{payload.amountsCents.map((cents, index) => (
							<div key={`amount-${index}`} className="flex items-center gap-2">
								<span className="text-sm text-slate-500">$</span>
								<Input
									className="border-[0.25px] border-slate-300 max-w-[120px]"
									value={dollarsFromCents(cents)}
									disabled={!canEdit}
									onChange={(e) => {
										const nextCents = centsFromDollars(e.target.value);
										updatePayload((prev) => {
											const amounts = [...prev.amountsCents];
											amounts[index] = nextCents;
											return { ...prev, amountsCents: amounts };
										});
									}}
								/>
								{canEdit && payload.amountsCents.length > 1 ? (
									<button
										type="button"
										className="cursor-pointer rounded-full p-1 text-slate-400 hover:bg-white/30 hover:text-slate-600"
										aria-label="Remove amount"
										onClick={() =>
											updatePayload((prev) => ({
												...prev,
												amountsCents: prev.amountsCents.filter((_, i) => i !== index),
											}))
										}
									>
										<X className="h-4 w-4" />
									</button>
								) : null}
							</div>
						))}
					</div>
					{canEdit && payload.amountsCents.length < MAX_SUGGESTED_AMOUNTS ? (
						<button
							type="button"
							className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
							onClick={() =>
								updatePayload((prev) => {
									const last = prev.amountsCents[prev.amountsCents.length - 1] ?? 2500;
									return {
										...prev,
										amountsCents: [...prev.amountsCents, last + 2500],
									};
								})
							}
						>
							<Plus className="mr-1 inline h-3.5 w-3.5" />
							Add amount
						</button>
					) : null}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">
						Fund designations
					</p>
					<div className="space-y-2">
						{payload.designations.map((label, index) => (
							<div key={`des-${index}`} className="flex items-center gap-2">
								<GripVertical className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
								<Input
									className="border-[0.25px] border-slate-300 flex-1"
									value={label}
									disabled={!canEdit}
									onChange={(e) =>
										updatePayload((prev) => {
											const designations = [...prev.designations];
											designations[index] = e.target.value;
											return { ...prev, designations };
										})
									}
								/>
							</div>
						))}
					</div>
					{canEdit ? (
						<button
							type="button"
							className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
							onClick={() =>
								updatePayload((prev) => ({
									...prev,
									designations: [...prev.designations, "New fund"],
								}))
							}
						>
							<Plus className="mr-1 inline h-3.5 w-3.5" />
							Add designation
						</button>
					) : null}
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-4">
					<p className="text-sm font-medium sidebar-gradient-text">
						Organization & legal
					</p>
					<div className="space-y-1.5">
						<Label htmlFor="donation-ein">EIN</Label>
						<Input
							id="donation-ein"
							className="border-[0.25px] border-slate-300 max-w-xs"
							value={payload.ein}
							disabled={!canEdit}
							onChange={(e) =>
								updatePayload((prev) => ({ ...prev, ein: e.target.value }))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="donation-impact">
							Impact statement (shown for lowest amount)
						</Label>
						<Textarea
							id="donation-impact"
							className="border-[0.25px] border-slate-300 min-h-[80px]"
							value={payload.impactStatements[lowestKey] ?? ""}
							disabled={!canEdit}
							onChange={(e) =>
								updatePayload((prev) => ({
									...prev,
									impactStatements: {
										...prev.impactStatements,
										[lowestKey]: e.target.value,
									},
								}))
							}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="donation-legal">Tax-deductibility disclosure</Label>
						<Textarea
							id="donation-legal"
							className="border-[0.25px] border-slate-300 min-h-[80px]"
							value={payload.legalText}
							disabled={!canEdit}
							onChange={(e) =>
								updatePayload((prev) => ({ ...prev, legalText: e.target.value }))
							}
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="p-4 sm:p-6 space-y-3">
					<p className="text-sm font-medium sidebar-gradient-text">Version history</p>
					{versions.length === 0 ? (
						<p className="text-sm text-slate-600">No published versions yet.</p>
					) : (
						<ul className="divide-y divide-slate-200">
							{versions.map((v) => (
								<li
									key={v.versionNumber}
									className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
								>
									<div>
										<p className="font-medium text-slate-700">
											{v.changeSummary || `Version ${v.versionNumber}`}
											{v.isLive ? (
												<span className="ml-2 inline-block rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
													Live
												</span>
											) : null}
										</p>
										<p className="text-xs text-slate-500 mt-0.5">
											Published by {v.publishedByName} ·{" "}
											{formatDistanceToNow(new Date(v.publishedAt), {
												addSuffix: true,
											})}
										</p>
									</div>
									{canEdit && !v.isLive ? (
										<button
											type="button"
											className="cursor-pointer text-sm font-medium text-[#0f5384] hover:underline"
											onClick={() => void handleRevert(v.versionNumber)}
										>
											Revert
										</button>
									) : null}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<p className="text-xs text-slate-500">
				Public page: configure your org give slug under{" "}
				<Link href="/settings/organization" className="text-[#0f5384] hover:underline">
					Organization settings
				</Link>
				.
			</p>
		</div>
	);
}
