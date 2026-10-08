"use client";

import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { Info, Plus, RefreshCw, Rss, Unplug, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import IntegrationCard from "@/components/settings/IntegrationCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { isDemoMode } from "@/lib/config/demo-mode";
import { cn } from "@/lib/utils";

type Feed = {
	$id: string;
	name: string;
	type: string;
	url?: string | null;
	enabled?: boolean;
	lastStatus?: string | null;
	lastError?: string | null;
};

type SocialConnection = {
	id: string;
	provider: "linkedin" | "x";
	accountLabel: string;
	connectedByName: string;
	connectedAt: string | null;
	expiresAt: string | null;
};

type SystemSettings = {
	enableContractRenewal: boolean;
	enablePolicyUpdates: boolean;
	enableRegulationAlerts: boolean;
};

const AUTO_ITEMS: Array<{
	key: keyof SystemSettings;
	title: string;
	description: string;
}> = [
	{
		key: "enableContractRenewal",
		title: "Contract renewal notices",
		description:
			"Drafts a post when a contract is approaching its renewal date.",
	},
	{
		key: "enablePolicyUpdates",
		title: "Policy updates",
		description: "Drafts a post when a company policy is published or revised.",
	},
	{
		key: "enableRegulationAlerts",
		title: "Regulation alerts",
		description: "Drafts a post when a tracked regulation changes.",
	},
];

const SOCIAL_ICONS = {
	linkedin: "/assets/icons/company-icons/linkedin.svg",
	x: "/assets/icons/company-icons/x-twitter.svg",
} as const;

function expiryWarning(expiresAt: string | null): string | null {
	if (!expiresAt) return null;
	const when = new Date(expiresAt);
	if (Number.isNaN(when.getTime())) return null;
	const msLeft = when.getTime() - Date.now();
	const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
	if (isPast(when)) {
		return "Access has expired. Reconnect to keep sharing.";
	}
	if (daysLeft <= 14) {
		const dateLabel = format(when, "MMM d");
		const relative =
			daysLeft <= 1
				? "today"
				: `in ${formatDistanceToNowStrict(when, { unit: "day" })}`;
		return `Access expires ${dateLabel} (${relative}). Reconnect to keep sharing.`;
	}
	return null;
}

export function ConnectedSourcesPanel() {
	const { toast } = useToast();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [feeds, setFeeds] = useState<Feed[]>([]);
	const [connections, setConnections] = useState<SocialConnection[]>([]);
	const [showAddFeed, setShowAddFeed] = useState(false);
	const [name, setName] = useState("");
	const [url, setUrl] = useState("");
	const [type, setType] = useState("rss");
	const [savingFeed, setSavingFeed] = useState(false);
	const [testingUrl, setTestingUrl] = useState(false);
	const [settings, setSettings] = useState<SystemSettings>({
		enableContractRenewal: false,
		enablePolicyUpdates: false,
		enableRegulationAlerts: false,
	});

	const contentFeeds = useMemo(
		() => feeds.filter((feed) => !["linkedin", "x"].includes(feed.type)),
		[feeds],
	);

	const linkedIn = connections.find((row) => row.provider === "linkedin");
	const x = connections.find((row) => row.provider === "x");
	const enabledAutoCount = AUTO_ITEMS.filter(
		(item) => settings[item.key],
	).length;

	const load = useCallback(async () => {
		const [feedsRes, settingsRes, socialRes] = await Promise.all([
			fetch("/api/news/feeds"),
			fetch("/api/news/system-settings"),
			fetch("/api/news/social/connections"),
		]);
		if (feedsRes.ok) {
			const data = await feedsRes.json();
			setFeeds(data.feeds || []);
		}
		if (settingsRes.ok) {
			const data = await settingsRes.json();
			setSettings({
				enableContractRenewal: Boolean(data.settings?.enableContractRenewal),
				enablePolicyUpdates: Boolean(data.settings?.enablePolicyUpdates),
				enableRegulationAlerts: Boolean(data.settings?.enableRegulationAlerts),
			});
		}
		if (socialRes.ok) {
			const data = await socialRes.json();
			setConnections(data.connections || []);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		const error = searchParams?.get("error");
		const connected = searchParams?.get("connected");
		if (!error && !connected) return;

		if (connected === "linkedin" || connected === "x") {
			toast({
				title: "Connected",
				description:
					connected === "linkedin"
						? "LinkedIn is ready for company news"
						: "X is ready for company news",
			});
			void load();
		} else if (
			error === "linkedin_not_configured" ||
			error === "x_not_configured"
		) {
			const provider = error.startsWith("linkedin") ? "LinkedIn" : "X";
			toast({
				title: `${provider} is not configured`,
				description: `Add ${provider === "LinkedIn" ? "LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI" : "X_CLIENT_ID, X_CLIENT_SECRET, and X_REDIRECT_URI"} to .env.local, then restart the server.`,
				variant: "destructive",
			});
		} else if (error === "linkedin_denied") {
			toast({
				title: "LinkedIn blocked the request",
				description:
					"Check your LinkedIn app Products tab. Company post access needs Community Management API, and Auth scopes must include r_organization_social.",
				variant: "destructive",
			});
		} else if (error === "linkedin_state") {
			toast({
				title: "Connection expired",
				description:
					"The sign-in link timed out or the browser cookie was lost. Click Connect LinkedIn again.",
				variant: "destructive",
			});
		} else if (error === "linkedin_token") {
			toast({
				title: "LinkedIn token exchange failed",
				description:
					"Client ID/secret or redirect URI do not match the LinkedIn app. They must match exactly, including http vs https.",
				variant: "destructive",
			});
		} else if (error === "linkedin_crypto") {
			toast({
				title: "Encryption key missing",
				description:
					"Set NEWS_OAUTH_ENCRYPTION_KEY in .env.local, then restart the server.",
				variant: "destructive",
			});
		} else if (error === "linkedin_save") {
			toast({
				title: "Could not save LinkedIn connection",
				description:
					"Token was issued, but saving failed. Check news social collections and server logs for [linkedin-oauth].",
				variant: "destructive",
			});
		} else if (error === "linkedin_oauth" || error === "x_oauth") {
			toast({
				title: "Connection failed",
				description: "OAuth did not finish. Try connecting again.",
				variant: "destructive",
			});
		}

		const next = new URLSearchParams(searchParams?.toString() ?? "");
		next.delete("error");
		next.delete("connected");
		const qs = next.toString();
		router.replace(
			qs ? `/dashboard/content-creator?${qs}` : "/dashboard/content-creator",
			{ scroll: false },
		);
	}, [searchParams, toast, router, load]);

	const resetFeedForm = () => {
		setName("");
		setUrl("");
		setType("rss");
		setShowAddFeed(false);
	};

	const testFeedUrl = async () => {
		if (!url.trim()) {
			toast({
				title: "Feed URL required",
				description: "Enter a feed URL to test",
				variant: "destructive",
			});
			return;
		}
		setTestingUrl(true);
		try {
			const response = await fetch("/api/news/feeds/preview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, type, url }),
			});
			const data = await response.json().catch(() => ({}));
			if (!response.ok) {
				toast({
					title: "Feed test failed",
					description: data.error || "Could not fetch this URL",
					variant: "destructive",
				});
				return;
			}
			toast({
				title: "Feed looks healthy",
				description: `${(data.items || []).length} recent items found`,
			});
		} finally {
			setTestingUrl(false);
		}
	};

	const addFeed = async () => {
		if (!name.trim() || !url.trim()) {
			toast({
				title: "Name and URL required",
				variant: "destructive",
			});
			return;
		}
		setSavingFeed(true);
		try {
			const response = await fetch("/api/news/feeds", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, type, url }),
			});
			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				toast({
					title: "Could not add feed",
					description: data.error || "Check the URL and try again",
					variant: "destructive",
				});
				return;
			}
			toast({ title: "Feed added" });
			resetFeedForm();
			await load();
		} finally {
			setSavingFeed(false);
		}
	};

	const toggleFeed = async (feed: Feed) => {
		await fetch(`/api/news/feeds/${feed.$id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ enabled: !feed.enabled }),
		});
		await load();
	};

	const testSavedFeed = async (id: string) => {
		const response = await fetch(`/api/news/feeds/${id}/test`, {
			method: "POST",
		});
		const data = await response.json().catch(() => ({}));
		if (!response.ok) {
			toast({
				title: "Feed test failed",
				description: data.error || "Could not fetch this source",
				variant: "destructive",
			});
			return;
		}
		toast({
			title: "Feed looks healthy",
			description: `${(data.items || []).length} recent items found`,
		});
	};

	const disconnectSocial = async (provider: "linkedin" | "x") => {
		const response = await fetch(
			`/api/news/social/connections?provider=${provider}`,
			{ method: "DELETE" },
		);
		if (!response.ok) {
			toast({
				title: "Could not disconnect",
				variant: "destructive",
			});
			return;
		}
		toast({
			title: `${provider === "linkedin" ? "LinkedIn" : "X"} disconnected`,
		});
		await load();
	};

	const saveSettings = async (next: SystemSettings) => {
		setSettings(next);
		await fetch("/api/news/system-settings", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(next),
		});
	};

	const demoSocialLocked = isDemoMode();

	const renderSocialCard = (
		provider: "linkedin" | "x",
		connection: SocialConnection | undefined,
	) => {
		const connected = Boolean(connection) && !demoSocialLocked;
		const warning = expiryWarning(connection?.expiresAt || null);
		const title = provider === "linkedin" ? "LinkedIn" : "X";
		const connectHref =
			provider === "linkedin"
				? "/api/news/social/linkedin/auth"
				: "/api/news/social/x/auth";
		const description =
			provider === "linkedin"
				? "Pull company page posts into the news review queue."
				: "Pull organization posts into the news review queue.";

		if (demoSocialLocked) {
			return (
				<IntegrationCard
					title={title}
					description={description}
					iconSrc={SOCIAL_ICONS[provider]}
					status="locked"
					lockedHint="Disabled in the demo sandbox. Connect on a production pilot — demo workspaces expire in 7 days."
				/>
			);
		}

		if (connected && connection) {
			return (
				<IntegrationCard
					title={title}
					description={description}
					iconSrc={SOCIAL_ICONS[provider]}
					status="connected"
					meta={connection.accountLabel}
					info={
						warning ? (
							<span className="text-orange">{warning}</span>
						) : (
							`Connected by ${connection.connectedByName}${
								connection.connectedAt
									? ` on ${format(new Date(connection.connectedAt), "MMM d, yyyy")}`
									: ""
							}.`
						)
					}
					actions={
						<>
							<Button
								className="btn-primary w-full cursor-pointer px-3 sm:px-4"
								onClick={() => {
									window.location.href = connectHref;
								}}
							>
								<RefreshCw className="h-4 w-4" />
								Reconnect
							</Button>
							<Button
								className="btn-primary w-full cursor-pointer px-3 sm:px-4"
								onClick={() => disconnectSocial(provider)}
							>
								<Unplug className="h-4 w-4" aria-hidden />
								Disconnect
							</Button>
						</>
					}
				/>
			);
		}

		return (
			<IntegrationCard
				title={title}
				description={description}
				iconSrc={SOCIAL_ICONS[provider]}
				status="disconnected"
				info={
					provider === "linkedin"
						? "Authorize LinkedIn so CAALM can import company page posts for review. Community Management API access is required."
						: "Authorize X so CAALM can import organization posts for review."
				}
				connectLabel={`Connect ${title}`}
				onConnect={() => {
					window.location.href = connectHref;
				}}
			/>
		);
	};

	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="text-base font-semibold text-slate-800">
						Social accounts
					</h3>
					<p className="text-sm text-slate-500 mt-1">
						{demoSocialLocked
							? "Social connect is disabled in the demo sandbox. Use a production pilot to attach LinkedIn or X."
							: "Connect your organization&apos;s accounts to share published news."}
					</p>
				</div>
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{renderSocialCard("linkedin", linkedIn)}
					{renderSocialCard("x", x)}
				</div>
			</section>

			<section className="space-y-4">
				<div>
					<h3 className="text-base font-semibold text-slate-800">Feeds</h3>
					<p className="text-sm text-slate-500 mt-1">
						Pull articles in from RSS, Atom, or WordPress. Imported items land
						in the Review queue.
					</p>
				</div>

				<Card className="glass-card overflow-hidden">
					<div className="glass-card-cap" />
					<div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-6">
						<div className="flex items-center gap-2">
							<p className="text-sm font-semibold sidebar-gradient-text">
								Connected feeds
							</p>
							<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-slate-100 text-slate-600 border-slate-200">
								{contentFeeds.length}
							</span>
						</div>
						{!showAddFeed ? (
							<Button
								className="btn-primary px-3 sm:px-4"
								onClick={() => setShowAddFeed(true)}
							>
								<Plus className="h-4 w-4" />
								Add feed
							</Button>
						) : null}
					</div>

					{showAddFeed ? (
						<div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-6 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
								<div className="md:col-span-3">
									<Label
										htmlFor="feed-name"
										className="text-xs font-semibold uppercase tracking-wide text-slate-500"
									>
										Name
									</Label>
									<Input
										id="feed-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="e.g. Industry news"
										className="mt-1 border-[0.25px] border-slate-300"
									/>
								</div>
								<div className="md:col-span-2">
									<Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										Type
									</Label>
									<Select value={type} onValueChange={setType}>
										<SelectTrigger className="mt-1 border-[0.25px] border-slate-300">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="rss">RSS</SelectItem>
											<SelectItem value="atom">Atom</SelectItem>
											<SelectItem value="wordpress_api">WordPress</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="md:col-span-7">
									<Label
										htmlFor="feed-url"
										className="text-xs font-semibold uppercase tracking-wide text-slate-500"
									>
										Feed URL
									</Label>
									<Input
										id="feed-url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://example.com/feed.xml"
										className="mt-1 border-[0.25px] border-slate-300"
									/>
									<p className="text-xs text-slate-500 mt-1">
										We&apos;ll check the feed before saving it.
									</p>
								</div>
							</div>
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<Button
										className="btn-primary px-3 sm:px-4"
										onClick={addFeed}
										disabled={savingFeed}
									>
										<Plus className="h-4 w-4" />
										Add feed
									</Button>
									<Button
										variant="outline"
										className="px-3 sm:px-4"
										onClick={testFeedUrl}
										disabled={testingUrl}
									>
										<RefreshCw
											className={cn("h-4 w-4", testingUrl && "animate-spin")}
										/>
										Test feed
									</Button>
								</div>
								<Button
									variant="outline"
									className="px-3 sm:px-4"
									onClick={resetFeedForm}
								>
									<X className="h-4 w-4" />
									Cancel
								</Button>
							</div>
						</div>
					) : null}

					{contentFeeds.length === 0 ? (
						<div className="flex flex-col items-center justify-center px-6 py-14 text-center">
							<div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/70 border border-slate-200">
								<Rss className="h-7 w-7 text-slate-400" />
							</div>
							<p className="text-sm font-semibold text-slate-800">
								No feeds connected yet
							</p>
							<p className="mt-1 max-w-sm text-sm text-slate-500">
								Add a feed to start pulling in articles for review.
							</p>
						</div>
					) : (
						<ul className="divide-y divide-slate-200/80">
							{contentFeeds.map((feed) => (
								<li
									key={feed.$id}
									className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
								>
									<div className="min-w-0">
										<p className="text-sm font-medium text-slate-800">
											{feed.name}
										</p>
										<p className="text-xs text-slate-500 truncate">
											{feed.type} · {feed.lastStatus || "idle"}
											{feed.url ? ` · ${feed.url}` : ""}
										</p>
										{feed.lastError ? (
											<p className="text-xs text-red mt-1">{feed.lastError}</p>
										) : null}
									</div>
									<div className="flex items-center justify-end gap-3">
										<Button
											variant="outline"
											className="px-3 sm:px-4"
											onClick={() => testSavedFeed(feed.$id)}
										>
											<RefreshCw className="h-4 w-4" />
											Test
										</Button>
										<div className="flex items-center gap-2">
											<span className="text-xs text-slate-500">
												{feed.enabled ? "On" : "Off"}
											</span>
											<Switch
												checked={Boolean(feed.enabled)}
												onCheckedChange={() => toggleFeed(feed)}
											/>
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</Card>
			</section>

			<section className="space-y-4">
				<div>
					<h3 className="text-base font-semibold text-slate-800">
						Auto-generated items
					</h3>
					<p className="text-sm text-slate-500 mt-1">
						Let CAALM draft news from system events. {enabledAutoCount} of{" "}
						{AUTO_ITEMS.length} enabled
					</p>
				</div>

				<Card className="glass-card overflow-hidden">
					<div className="glass-card-cap" />
					<ul className="divide-y divide-slate-200/80">
						{AUTO_ITEMS.map((item) => (
							<li
								key={item.key}
								className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6"
							>
								<div className="min-w-0 pr-4">
									<p className="text-sm font-medium text-slate-800">
										{item.title}
									</p>
									<p className="mt-0.5 text-sm text-slate-500">
										{item.description}
									</p>
								</div>
								<Switch
									checked={settings[item.key]}
									onCheckedChange={(checked) =>
										saveSettings({ ...settings, [item.key]: checked })
									}
									aria-label={item.title}
								/>
							</li>
						))}
					</ul>
					<div className="flex items-start gap-2 border-t border-slate-200/80 bg-slate-50/80 px-4 py-3 sm:px-6">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
						<p className="text-xs text-slate-600">
							Enabled items create drafts in the Review queue. Nothing publishes
							without approval.
						</p>
					</div>
				</Card>
			</section>
		</div>
	);
}
