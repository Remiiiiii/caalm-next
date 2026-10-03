"use client";

import {
	Check,
	Code2,
	Copy,
	Download,
	ExternalLink,
	Loader2,
	Mail,
	QrCode,
	Share2,
	Users,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import GmailComposeForm, {
	type GmailComposeDraft,
} from "@/components/gmail/GmailComposeForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchField } from "@/components/ui/search-field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import type { ShareAttributionTotals, ShareCampaignBucket } from "@/lib/give/attribution";
import { PERMISSIONS } from "@/constants/permissions";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { canContact } from "@/lib/constituents/consent";
import type { Constituent } from "@/lib/constituents/types";
import {
	buildGivePageEmbedSnippet,
	buildGivePageShareUrl,
	buildGiveShareEmailBody,
	buildGiveShareEmailSubject,
	buildMailtoGiveShareUrl,
	slugifyUtmCampaign,
} from "@/lib/give/share";
import { cn } from "@/lib/utils";

type MailProvider = "gmail" | "outlook";

type DonationPageShareCardProps = {
	orgName: string;
	giveSlug: string;
	/** Live share only after a version is published */
	isPublished: boolean;
};

type ConstituentRow = Pick<
	Constituent,
	| "$id"
	| "firstName"
	| "lastName"
	| "email"
	| "doNotContact"
	| "consentEmail"
	| "consentSms"
	| "consentMail"
	| "consentPhone"
>;

export function DonationPageShareCard({
	orgName,
	giveSlug,
	isPublished,
}: DonationPageShareCardProps) {
	const { toast } = useToast();
	const { permissions } = usePermissions();
	const canViewConstituents = permissions.includes(
		PERMISSIONS.CONSTITUENTS.VIEW,
	);
	const canViewCampaigns = permissions.includes(PERMISSIONS.GIFTS.VIEW);

	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const [campaign, setCampaign] = useState("give-page");
	const [linkedCampaignId, setLinkedCampaignId] = useState("");
	const [fundraisingCampaigns, setFundraisingCampaigns] = useState<
		Array<{ $id: string; name: string }>
	>([]);
	const [analytics, setAnalytics] = useState<{
		days: number;
		totals: ShareAttributionTotals;
		buckets: ShareCampaignBucket[];
	} | null>(null);
	const [analyticsLoading, setAnalyticsLoading] = useState(false);
	const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
	const [qrLoading, setQrLoading] = useState(false);
	const [linkAction, setLinkAction] = useState<"email" | "open">("email");
	const [qrAction, setQrAction] = useState<"download" | "copy">("download");

	const [emailOpen, setEmailOpen] = useState(false);
	const [gmailConnected, setGmailConnected] = useState(false);
	const [outlookConnected, setOutlookConnected] = useState(false);
	const [gmailEmail, setGmailEmail] = useState<string | undefined>();
	const [outlookEmail, setOutlookEmail] = useState<string | undefined>();
	const [providerStatusLoading, setProviderStatusLoading] = useState(false);
	const [provider, setProvider] = useState<MailProvider>("gmail");

	const [constituents, setConstituents] = useState<ConstituentRow[]>([]);
	const [constituentsLoading, setConstituentsLoading] = useState(false);
	const [constituentQuery, setConstituentQuery] = useState("");
	const [selectedConstituentIds, setSelectedConstituentIds] = useState<
		Set<string>
	>(new Set());
	const [composeKey, setComposeKey] = useState(0);

	const campaignSlug = slugifyUtmCampaign(campaign) || "give-page";

	const cleanShareUrl = useMemo(
		() => buildGivePageShareUrl(giveSlug),
		[giveSlug],
	);

	const emailShareUrl = useMemo(
		() =>
			buildGivePageShareUrl(giveSlug, {
				utm_source: "email",
				utm_medium: "caalm",
				utm_campaign: campaignSlug,
			}),
		[giveSlug, campaignSlug],
	);

	const copyShareUrl = useMemo(
		() =>
			buildGivePageShareUrl(giveSlug, {
				utm_source: "copy",
				utm_medium: "caalm",
				utm_campaign: campaignSlug,
			}),
		[giveSlug, campaignSlug],
	);

	const qrShareUrl = useMemo(
		() =>
			buildGivePageShareUrl(giveSlug, {
				utm_source: "qr",
				utm_medium: "caalm",
				utm_campaign: campaignSlug,
			}),
		[giveSlug, campaignSlug],
	);

	const embedShareUrl = useMemo(
		() =>
			buildGivePageShareUrl(giveSlug, {
				utm_source: "embed",
				utm_medium: "caalm",
				utm_campaign: campaignSlug,
			}),
		[giveSlug, campaignSlug],
	);

	const embedSnippet = useMemo(
		() => buildGivePageEmbedSnippet(embedShareUrl),
		[embedShareUrl],
	);

	const emailableConstituents = useMemo(() => {
		const q = constituentQuery.trim().toLowerCase();
		return constituents.filter((row) => {
			if (!row.email?.trim()) return false;
			if (!canContact(row, "email")) return false;
			if (!q) return true;
			const name = `${row.firstName} ${row.lastName}`.toLowerCase();
			return name.includes(q) || row.email.toLowerCase().includes(q);
		});
	}, [constituents, constituentQuery]);

	const selectedEmails = useMemo(() => {
		const emails: string[] = [];
		for (const row of constituents) {
			if (!selectedConstituentIds.has(row.$id)) continue;
			const email = row.email?.trim();
			if (email) emails.push(email);
		}
		return emails;
	}, [constituents, selectedConstituentIds]);

	const composeDraft: GmailComposeDraft = useMemo(
		() => ({
			to: selectedEmails.join(", "),
			subject: buildGiveShareEmailSubject(orgName),
			body: buildGiveShareEmailBody(orgName, emailShareUrl),
		}),
		[selectedEmails, orgName, emailShareUrl],
	);

	const connectedCount = (gmailConnected ? 1 : 0) + (outlookConnected ? 1 : 0);

	/** Prefer the picker when both are live; otherwise force the only connected inbox. */
	const activeProvider: MailProvider =
		gmailConnected && outlookConnected
			? provider
			: gmailConnected
				? "gmail"
				: "outlook";

	const refreshMailStatus = useCallback(async () => {
		setProviderStatusLoading(true);
		try {
			const [gmailRes, outlookRes] = await Promise.all([
				fetch("/api/gmail/status").then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return {
						ok: res.ok,
						connected: res.ok && Boolean(data.connected),
						email: typeof data.email === "string" ? data.email : undefined,
					};
				}),
				fetch("/api/microsoft/mail/status").then(async (res) => {
					const data = await res.json().catch(() => ({}));
					return {
						ok: res.ok,
						connected: res.ok && Boolean(data.connected),
						email: typeof data.email === "string" ? data.email : undefined,
					};
				}),
			]);
			setGmailConnected(gmailRes.connected);
			setOutlookConnected(outlookRes.connected);
			setGmailEmail(gmailRes.email);
			setOutlookEmail(outlookRes.email);

			// Prefer a single connected provider; if both, keep current or default Gmail
			if (gmailRes.connected && !outlookRes.connected) {
				setProvider("gmail");
			} else if (outlookRes.connected && !gmailRes.connected) {
				setProvider("outlook");
			} else if (gmailRes.connected && outlookRes.connected) {
				setProvider((prev) => prev);
			}
		} finally {
			setProviderStatusLoading(false);
		}
	}, []);

	const loadConstituents = useCallback(async () => {
		if (!canViewConstituents) {
			setConstituents([]);
			return;
		}
		setConstituentsLoading(true);
		try {
			const res = await fetch(
				"/api/constituents?page=1&pageSize=100&doNotContact=false",
			);
			if (!res.ok) {
				setConstituents([]);
				return;
			}
			const data = await res.json();
			setConstituents((data.items ?? []) as ConstituentRow[]);
		} catch {
			setConstituents([]);
		} finally {
			setConstituentsLoading(false);
		}
	}, [canViewConstituents]);

	const loadFundraisingCampaigns = useCallback(async () => {
		if (!canViewCampaigns) {
			setFundraisingCampaigns([]);
			return;
		}
		try {
			const res = await fetch("/api/campaigns");
			if (!res.ok) {
				setFundraisingCampaigns([]);
				return;
			}
			const data = await res.json();
			setFundraisingCampaigns(
				((data.items ?? []) as Array<{ $id: string; name: string }>).map(
					(row) => ({ $id: row.$id, name: row.name }),
				),
			);
		} catch {
			setFundraisingCampaigns([]);
		}
	}, [canViewCampaigns]);

	const loadShareAnalytics = useCallback(async () => {
		setAnalyticsLoading(true);
		try {
			const res = await fetch("/api/give/share-analytics?days=90");
			if (!res.ok) {
				setAnalytics(null);
				return;
			}
			const data = (await res.json()) as {
				days: number;
				totals: ShareAttributionTotals;
				buckets: ShareCampaignBucket[];
			};
			setAnalytics(data);
		} catch {
			setAnalytics(null);
		} finally {
			setAnalyticsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadFundraisingCampaigns();
		void loadShareAnalytics();
	}, [loadFundraisingCampaigns, loadShareAnalytics]);

	useEffect(() => {
		if (!isPublished || !giveSlug) {
			setQrDataUrl(null);
			return;
		}
		let cancelled = false;
		setQrLoading(true);
		void import("qrcode")
			.then((QRCode) =>
				QRCode.toDataURL(qrShareUrl, {
					width: 200,
					margin: 1,
					color: { dark: "#0f5384", light: "#ffffff" },
				}),
			)
			.then((url) => {
				if (!cancelled) setQrDataUrl(url);
			})
			.catch(() => {
				if (!cancelled) setQrDataUrl(null);
			})
			.finally(() => {
				if (!cancelled) setQrLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [isPublished, giveSlug, qrShareUrl]);

	const markCopied = (key: string) => {
		setCopiedKey(key);
		window.setTimeout(() => {
			setCopiedKey((current) => (current === key ? null : current));
		}, 2000);
	};

	const handleCopy = async (value: string, key: string, label: string) => {
		if (!isPublished) {
			toast({
				title: "Publish first",
				description: "Share links are available after you publish the page.",
				variant: "destructive",
			});
			return;
		}
		try {
			await navigator.clipboard.writeText(value);
			markCopied(key);
		} catch {
			toast({
				title: "Could not copy",
				description: "Check clipboard permissions and try again.",
				variant: "destructive",
			});
		}
	};

	const openEmailDialog = async () => {
		if (!isPublished) {
			toast({
				title: "Publish first",
				description: "Email the live page after you publish changes.",
				variant: "destructive",
			});
			return;
		}
		setEmailOpen(true);
		setSelectedConstituentIds(new Set());
		setConstituentQuery("");
		setComposeKey((k) => k + 1);
		await Promise.all([refreshMailStatus(), loadConstituents()]);
	};

	const openMailtoFallback = () => {
		const href = buildMailtoGiveShareUrl({
			to: selectedEmails.join(","),
			orgName,
			shareUrl: emailShareUrl,
		});
		window.location.href = href;
	};

	const downloadQrPng = () => {
		if (!qrDataUrl || !isPublished) return;
		const anchor = document.createElement("a");
		anchor.href = qrDataUrl;
		anchor.download = `${giveSlug}-give-qr.png`;
		anchor.click();
	};

	const handleCopyQrImage = async () => {
		if (!qrDataUrl || !isPublished) return;
		try {
			const res = await fetch(qrDataUrl);
			const blob = await res.blob();
			if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
				await navigator.clipboard.write([
					new ClipboardItem({ [blob.type || "image/png"]: blob }),
				]);
				markCopied("qr");
				toast({
					title: "Copied",
					description: "QR image copied to the clipboard.",
				});
				return;
			}
			await handleCopy(qrDataUrl, "qr", "QR image");
		} catch {
			toast({
				title: "Could not copy image",
				description: "Use Download PNG instead.",
				variant: "destructive",
			});
		}
	};

	const runLinkAction = (next: "email" | "open") => {
		setLinkAction(next);
		if (next === "email") {
			void openEmailDialog();
			return;
		}
		if (!isPublished) {
			toast({
				title: "Publish first",
				description: "Share links are available after you publish the page.",
				variant: "destructive",
			});
			return;
		}
		window.open(cleanShareUrl, "_blank", "noopener,noreferrer");
	};

	const runQrAction = (next: "download" | "copy") => {
		setQrAction(next);
		if (!isPublished || !qrDataUrl) return;
		if (next === "download") {
			downloadQrPng();
			return;
		}
		void handleCopyQrImage();
	};

	const toggleConstituent = (id: string) => {
		setSelectedConstituentIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		setComposeKey((k) => k + 1);
	};

	const disabledReason = !isPublished
		? "Publish the donation page before sharing the live URL."
		: null;

	const renderCopyIconButton = (
		key: "url" | "embed",
		value: string,
		ariaLabel: string,
		toastLabel: string,
	) => {
		const copied = copiedKey === key;
		return (
			<button
				type="button"
				aria-label={copied ? "Copied" : ariaLabel}
				disabled={!isPublished}
				onClick={() => void handleCopy(value, key, toastLabel)}
				className={cn(
					"inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-2 transition-colors duration-200",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					!isPublished
						? "cursor-not-allowed text-slate-300"
						: copied
							? "cursor-default text-green"
							: "cursor-pointer text-[#0f5384] hover:text-[#0c4269]",
				)}
			>
				{copied ? (
					<>
						<Check className="h-4 w-4 text-green" aria-hidden />
						<span className="text-xs text-green">Copied</span>
					</>
				) : (
					<Copy className="h-4 w-4" aria-hidden />
				)}
			</button>
		);
	};

	return (
		<>
			<Card className="glass-card">
				<div className="glass-card-cap" />
				<CardContent className="space-y-5 p-4 sm:p-6">
					<div className="flex items-start gap-3">
						<Share2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0f5384]" />
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium sidebar-gradient-text">
								Share give page
							</p>
							<p className="mt-1 text-sm text-slate-600">
								Copy the live link, email donors from CAALM, or grab a QR code
								and embed snippet.
							</p>
						</div>
					</div>

					{disabledReason ? (
						<div className="rounded-lg border border-orange/20 bg-orange/10 px-3 py-2 text-sm text-slate-700">
							{disabledReason}
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="give-share-campaign">Campaign tag (UTM)</Label>
						<Input
							id="give-share-campaign"
							value={campaign}
							onChange={(e) => {
								setCampaign(e.target.value);
								setLinkedCampaignId("");
							}}
							disabled={!isPublished}
							placeholder="spring-appeal"
							className="border-[0.25px] border-slate-300"
						/>
						<p className="text-xs text-slate-500">
							Added as{" "}
							<code className="rounded bg-slate-100 px-1">
								utm_campaign={campaignSlug}
							</code>{" "}
							on copy, email, QR, and embed links so you can see which ask
							drove gifts.
						</p>
					</div>

					{canViewCampaigns && fundraisingCampaigns.length > 0 ? (
						<div className="space-y-1.5">
							<Label htmlFor="give-share-linked-campaign">
								Fundraising campaign (optional)
							</Label>
							<Select
								value={linkedCampaignId || "none"}
								onValueChange={(value) => {
									if (value === "none") {
										setLinkedCampaignId("");
										return;
									}
									setLinkedCampaignId(value);
									const selected = fundraisingCampaigns.find(
										(row) => row.$id === value,
									);
									if (selected) {
										setCampaign(
											slugifyUtmCampaign(selected.name) || selected.name,
										);
									}
								}}
								disabled={!isPublished}
							>
								<SelectTrigger
									id="give-share-linked-campaign"
									className="h-10 border-[0.25px] border-slate-300"
								>
									<SelectValue placeholder="None" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">None</SelectItem>
									{fundraisingCampaigns.map((row) => (
										<SelectItem key={row.$id} value={row.$id}>
											{row.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-slate-500">
								Syncs the campaign tag to this campaign&apos;s name. Online
								gifts auto-link when the tag matches exactly one campaign.
							</p>
						</div>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="give-share-url">Live page URL</Label>
						<div className="flex items-center gap-1.5">
							<Input
								id="give-share-url"
								readOnly
								value={isPublished ? copyShareUrl : ""}
								placeholder="Publish to generate your public URL"
								className="min-w-0 flex-1 border-[0.25px] border-slate-300 bg-white"
							/>
							{renderCopyIconButton(
								"url",
								copyShareUrl,
								"Copy live page link",
								"Give page link",
							)}
						</div>
					</div>

					<div className="space-y-1.5">
						<SegmentedToggle
							value={linkAction}
							onChange={runLinkAction}
							ariaLabel="Share link actions"
							tabs={[
								{
									value: "email",
									label: "Email link",
									icon: Mail,
									ariaLabel: "Email give page link",
								},
								{
									value: "open",
									label: "Open live page",
									icon: ExternalLink,
									ariaLabel: "Open live give page",
								},
							]}
						/>
						<p className="text-xs text-slate-500">
							Open live page uses the clean URL so admin preview does not
							count as a share visit.
						</p>
					</div>

					<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
						<div>
							<p className="text-sm font-medium text-slate-700">
								Share performance
							</p>
							<p className="mt-1 text-xs text-slate-500">
								Last {analytics?.days ?? 90} days from tagged copy, email, QR,
								and embed links.
							</p>
						</div>
						{analyticsLoading ? (
							<p className="flex items-center gap-2 text-sm text-slate-600">
								<Loader2 className="h-4 w-4 animate-spin" />
								Loading analytics…
							</p>
						) : !analytics ||
						  (analytics.totals.visitCount === 0 &&
								analytics.totals.giftCount === 0) ? (
							<p className="text-sm text-slate-600">
								No share visits or gifts yet. Copy or email a tagged link to
								start measuring.
							</p>
						) : (
							<>
								<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
									{[
										{
											label: "Visits",
											value: analytics.totals.visitCount.toLocaleString(),
										},
										{
											label: "Gifts",
											value: analytics.totals.giftCount.toLocaleString(),
										},
										{
											label: "Revenue",
											value: `$${analytics.totals.giftTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
										},
										{
											label: "Conversion",
											value: `${(analytics.totals.conversionRate * 100).toFixed(1)}%`,
										},
									].map((stat) => (
										<div
											key={stat.label}
											className="rounded-lg border border-slate-200 bg-white px-3 py-2"
										>
											<p className="text-xs text-slate-500">{stat.label}</p>
											<p className="pt-1 text-lg font-semibold tabular-nums text-slate-700">
												{stat.value}
											</p>
										</div>
									))}
								</div>
								<div className="overflow-x-auto">
									<table className="w-full text-sm text-slate-700">
										<thead>
											<tr className="border-b border-slate-200 text-left">
												<th className="py-2 pr-3">Campaign tag</th>
												<th className="py-2 pr-3">Sources</th>
												<th className="py-2 pr-3">Visits</th>
												<th className="py-2 pr-3">Gifts</th>
												<th className="py-2 pr-3">Revenue</th>
												<th className="py-2 pr-3">Conversion</th>
												<th className="py-2">Linked campaign</th>
											</tr>
										</thead>
										<tbody>
											{analytics.buckets.map((bucket) => (
												<tr
													key={bucket.shareCampaign}
													className="border-b border-slate-100"
												>
													<td className="py-2 pr-3">
														<code className="rounded bg-slate-100 px-1">
															{bucket.shareCampaign}
														</code>
													</td>
													<td className="py-2 pr-3 text-xs text-slate-600">
														{bucket.sources
															.map((source) => source.shareSource)
															.join(", ")}
													</td>
													<td className="py-2 pr-3 tabular-nums">
														{bucket.visitCount}
													</td>
													<td className="py-2 pr-3 tabular-nums">
														{bucket.giftCount}
													</td>
													<td className="py-2 pr-3 tabular-nums">
														$
														{bucket.giftTotal.toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</td>
													<td className="py-2 pr-3 tabular-nums">
														{(bucket.conversionRate * 100).toFixed(1)}%
													</td>
													<td className="py-2 text-slate-600">
														{bucket.linkedCampaignName ?? "—"}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</>
						)}
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
							<div>
								<p className="flex items-center gap-2 text-sm font-medium text-slate-700">
									<QrCode className="h-4 w-4 text-[#0f5384]" />
									QR code
								</p>
								<p className="mt-1 text-xs text-slate-500">
									Print on event programs or posters. Scans open the tracked
									QR link (<code className="rounded bg-slate-100 px-1">utm_source=qr</code>).
								</p>
							</div>
							{!isPublished ? (
								<p className="text-sm text-slate-500">
									Available after publish.
								</p>
							) : qrLoading ? (
								<p className="flex items-center gap-2 text-sm text-slate-600">
									<Loader2 className="h-4 w-4 animate-spin" />
									Generating QR…
								</p>
							) : qrDataUrl ? (
								<div className="flex flex-col items-start gap-3">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={qrDataUrl}
										alt="QR code for the give page"
										className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-3"
									/>
									<SegmentedToggle
										value={qrAction}
										onChange={runQrAction}
										ariaLabel="QR code actions"
										tabs={[
											{
												value: "download",
												label: "Download PNG",
												icon: Download,
												ariaLabel: "Download QR code PNG",
											},
											{
												value: "copy",
												label: copiedKey === "qr" ? "Copied" : "Copy image",
												icon: copiedKey === "qr" ? Check : Copy,
												iconClassName:
													copiedKey === "qr" ? "text-green" : undefined,
												ariaLabel: "Copy QR code image",
											},
										]}
									/>
								</div>
							) : (
								<div className="flex h-44 w-44 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
									Could not generate QR
								</div>
							)}
						</div>

						<div className="flex flex-col space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
							<div className="flex items-start justify-between gap-2">
								<div className="min-w-0">
									<p className="flex items-center gap-2 text-sm font-medium text-slate-700">
										<Code2 className="h-4 w-4 text-[#0f5384]" />
										Website embed
									</p>
									<p className="mt-1 text-xs text-slate-500">
										Paste this iframe on your org site. The embed URL includes{" "}
										<code className="rounded bg-slate-100 px-1">
											utm_source=embed
										</code>
										.
									</p>
								</div>
								{renderCopyIconButton(
									"embed",
									embedSnippet,
									"Copy embed snippet",
									"Embed snippet",
								)}
							</div>
							<textarea
								readOnly
								value={isPublished ? embedSnippet : ""}
								placeholder="Publish to generate an embed snippet"
								rows={6}
								className="w-full flex-1 rounded-lg border-[0.25px] border-slate-300 bg-white p-3 font-sans text-xs text-slate-700"
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			<Dialog open={emailOpen} onOpenChange={setEmailOpen}>
				<DialogContent className="flex max-h-[90vh] max-w-[720px] flex-col overflow-hidden border border-slate-200 p-0 shadow-xl">
					<div className="absolute top-0 right-0 left-0 h-4 rounded-t-md bg-[#d6d7d8] opacity-70" />
					<div className="sticky top-0 z-10 mt-4 border-b border-slate-200 bg-linear-to-r from-blue-50 to-indigo-50 py-4">
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center gap-3">
								<Mail className="h-5 w-5 text-[#0f5384]" />
								<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
									Email give page link
								</DialogTitle>
							</div>
						</div>
						<p className="mt-1 ml-14 text-sm text-slate-600">
							Prefills a short ask with your tracked live URL. Edit before
							sending.
						</p>
					</div>

					<div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
						{providerStatusLoading ? (
							<p className="flex items-center gap-2 text-sm text-slate-600">
								<Loader2 className="h-4 w-4 animate-spin" />
								Checking connected mail…
							</p>
						) : connectedCount > 1 ? (
							<div className="space-y-2">
								<p className="text-sm font-medium text-slate-700">Send with</p>
								<p className="text-xs text-slate-500">
									Gmail and Outlook Mail are both connected. Pick which inbox
									sends this ask.
								</p>
								<SegmentedToggle
									value={provider}
									onChange={(next) => {
										setProvider(next);
										setComposeKey((k) => k + 1);
									}}
									ariaLabel="Mail provider"
									tabs={[
										{
											value: "gmail",
											label: "Gmail",
											ariaLabel: gmailEmail
												? `Send with Gmail (${gmailEmail})`
												: "Send with Gmail",
										},
										{
											value: "outlook",
											label: "Outlook",
											ariaLabel: outlookEmail
												? `Send with Outlook Mail (${outlookEmail})`
												: "Send with Outlook Mail",
										},
									]}
								/>
								<p className="text-xs text-slate-500">
									From:{" "}
									{activeProvider === "gmail"
										? gmailEmail || "Gmail"
										: outlookEmail || "Outlook Mail"}
								</p>
							</div>
						) : connectedCount === 1 ? (
							<p className="flex items-center gap-2 text-sm text-slate-600">
								{gmailConnected ? (
									<>
										<Image
											src="/assets/icons/company-icons/gmail.svg"
											alt=""
											width={16}
											height={16}
										/>
										Sending with Gmail
										{gmailEmail ? ` (${gmailEmail})` : ""}
									</>
								) : (
									<>
										<Image
											src="/assets/icons/company-icons/microsoft.svg"
											alt=""
											width={16}
											height={16}
										/>
										Sending with Outlook Mail
										{outlookEmail ? ` (${outlookEmail})` : ""}
									</>
								)}
							</p>
						) : (
							<div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
								<p>
									No Gmail or Outlook Mail connected. Use your device mail app,
									or connect mail under Settings → Billing & Integrations.
								</p>
								<div className="mt-3 flex justify-end">
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										onClick={openMailtoFallback}
									>
										<Mail className="h-4 w-4" />
										Open device mail
									</Button>
								</div>
							</div>
						)}

						{canViewConstituents ? (
							<div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
								<p className="flex items-center gap-2 text-sm font-medium text-slate-700">
									<Users className="h-4 w-4 text-[#0f5384]" />
									Add constituents (email consent only)
								</p>
								<SearchField
									value={constituentQuery}
									onChange={(e) => setConstituentQuery(e.target.value)}
									placeholder="Search by name or email…"
								/>
								{constituentsLoading ? (
									<p className="flex items-center gap-2 text-sm text-slate-600">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading constituents…
									</p>
								) : emailableConstituents.length === 0 ? (
									<p className="text-sm text-slate-500">
										No email-consenting constituents match.
									</p>
								) : (
									<ul className="max-h-40 space-y-1 overflow-y-auto">
										{emailableConstituents.map((row) => {
											const checked = selectedConstituentIds.has(row.$id);
											const label = `${row.firstName} ${row.lastName}`.trim();
											return (
												<li key={row.$id}>
													<label
														className={cn(
															"flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
															checked ? "bg-blue/5" : "hover:bg-slate-50",
														)}
													>
														<Checkbox
															checked={checked}
															onCheckedChange={() => toggleConstituent(row.$id)}
															className="border-[0.25px] border-slate-300"
														/>
														<span className="min-w-0 flex-1 truncate text-slate-700">
															{label}
														</span>
														<span className="truncate text-xs text-slate-500">
															{row.email}
														</span>
													</label>
												</li>
											);
										})}
									</ul>
								)}
								{selectedEmails.length > 0 ? (
									<p className="text-xs text-slate-500">
										{selectedEmails.length} recipient
										{selectedEmails.length === 1 ? "" : "s"} selected
									</p>
								) : null}
							</div>
						) : (
							<p className="text-xs text-slate-500">
								Constituent picker needs constituents.view. You can still type
								addresses in To.
							</p>
						)}

						{!providerStatusLoading && connectedCount > 0 ? (
							<div className="rounded-lg border border-slate-200 bg-white p-4">
								<GmailComposeForm
									key={`${activeProvider}-${composeKey}`}
									fromEmail={
										activeProvider === "gmail" ? gmailEmail : outlookEmail
									}
									initialDraft={composeDraft}
									sendUrl={
										activeProvider === "gmail"
											? "/api/gmail/send"
											: "/api/microsoft/mail/send"
									}
									draftsUrl={
										activeProvider === "gmail"
											? "/api/gmail/drafts"
											: "/api/microsoft/mail/drafts"
									}
									signatureUrl={
										activeProvider === "gmail"
											? "/api/gmail/signature"
											: "/api/microsoft/mail/signature"
									}
									onDeviceMail={openMailtoFallback}
									onSent={() => {
										toast({
											title: "Email sent",
											description: "Your give page ask is on its way.",
										});
										setEmailOpen(false);
									}}
									onDraftSaved={() => {
										toast({
											title: "Draft saved",
											description: "Saved in your connected mailbox.",
										});
									}}
								/>
							</div>
						) : null}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
