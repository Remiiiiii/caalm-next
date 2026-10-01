"use client";

import {
	FileText,
	Inbox,
	Loader2,
	Mail,
	PanelRightClose,
	PenLine,
	RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import GmailComposeForm from "@/components/gmail/GmailComposeForm";
import GmailMessageList, {
	type GmailListItem,
} from "@/components/gmail/GmailMessageList";
import GmailMessageView, {
	type GmailMessageDetailView,
} from "@/components/gmail/GmailMessageView";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import {
	Sheet,
	SheetContent,
	SheetHeaderIcon,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type GmailTab = "inbox" | "drafts" | "compose";

interface GmailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const TABS: { id: GmailTab; label: string; icon: typeof Inbox }[] = [
	{ id: "inbox", label: "Inbox", icon: Inbox },
	{ id: "drafts", label: "Drafts", icon: FileText },
	{ id: "compose", label: "Compose", icon: PenLine },
];

export default function GmailSheet({ open, onOpenChange }: GmailSheetProps) {
	const [tab, setTab] = useState<GmailTab>("inbox");
	const [statusLoading, setStatusLoading] = useState(true);
	const [connected, setConnected] = useState(false);
	const [email, setEmail] = useState<string | undefined>();
	const [listLoading, setListLoading] = useState(false);
	const [items, setItems] = useState<GmailListItem[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [detailLoading, setDetailLoading] = useState(false);
	const [detail, setDetail] = useState<GmailMessageDetailView | null>(null);
	const [statusError, setStatusError] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	const loadStatus = useCallback(async () => {
		setStatusLoading(true);
		setStatusError(null);
		try {
			const res = await fetch("/api/gmail/status");
			const data = await res.json();
			if (res.status === 403 && data.code === "gmail_not_connected") {
				setConnected(false);
				return;
			}
			if (!res.ok) throw new Error(data.error || "Status unavailable");
			setConnected(Boolean(data.connected));
			setEmail(data.email);
		} catch (err) {
			setStatusError(
				err instanceof Error ? err.message : "Could not load Gmail status",
			);
		} finally {
			setStatusLoading(false);
		}
	}, []);

	const loadList = useCallback(async () => {
		if (!connected) return;
		setListLoading(true);
		setSelectedId(null);
		setDetail(null);
		try {
			const url =
				tab === "drafts" ? "/api/gmail/drafts" : "/api/gmail/messages";
			const res = await fetch(url);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to load mail");
			const rows =
				tab === "drafts"
					? (data.drafts as GmailListItem[])
					: (data.messages as GmailListItem[]);
			setItems(rows || []);
			if (data.email) setEmail(data.email);
		} catch {
			setItems([]);
		} finally {
			setListLoading(false);
		}
	}, [connected, tab]);

	useEffect(() => {
		if (!open) return;
		void loadStatus();
	}, [open, loadStatus]);

	useEffect(() => {
		if (!open || !connected || tab === "compose") return;
		void loadList();
	}, [open, connected, tab, loadList]);

	useEffect(() => {
		setSearchQuery("");
	}, [tab]);

	const filteredItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => {
			const haystack = [item.subject, item.from, item.snippet]
				.join(" ")
				.toLowerCase();
			return haystack.includes(q);
		});
	}, [items, searchQuery]);

	const openMessage = async (id: string) => {
		if (tab === "drafts") {
			setTab("compose");
			return;
		}
		setSelectedId(id);
		setDetailLoading(true);
		try {
			const res = await fetch(`/api/gmail/messages/${encodeURIComponent(id)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			setDetail(data.message as GmailMessageDetailView);
		} catch {
			setDetail(null);
		} finally {
			setDetailLoading(false);
		}
	};

	const showingDetail = Boolean(detail || selectedId) && tab === "inbox";

	return (
		<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
			<SheetContent
				side="right"
				showOverlay={false}
				onInteractOutside={(e) => e.preventDefault()}
				className={cn(
					"flex w-full flex-col gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
					"sm:max-w-lg",
					"inset-y-auto! top-4! right-4! bottom-4! h-[calc(100vh-2rem)]! max-h-none!",
					"transition-none! duration-200! ease-out!",
					"data-[state=open]:duration-200! data-[state=closed]:duration-200!",
					"data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
					"pointer-events-auto",
				)}
				showCloseButton={false}
			>
				<div
					className="glass-card-frosted relative flex h-full w-full flex-col overflow-hidden rounded-2xl"
					style={{ background: "rgba(255, 255, 255, 0.92)" }}
				>
					<div className="glass-card-cap rounded-t-2xl!" />
					<SheetTitle className="sr-only">Mail</SheetTitle>

					{/* Header */}
					<div className="mt-4 flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-1">
						<div className="flex min-w-0 items-center gap-3">
							<SheetHeaderIcon>
								<Mail className="h-5 w-5 text-[#0f5384]" />
							</SheetHeaderIcon>
							<div className="min-w-0">
								<h2 className="text-lg font-semibold sidebar-gradient-text">
									Mail
								</h2>
								{email ? (
									<p className="truncate text-xs text-slate-500">{email}</p>
								) : (
									<p className="text-xs text-slate-500">Gmail in CAALM</p>
								)}
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-1">
							{connected && tab !== "compose" && !showingDetail ? (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700"
									aria-label="Refresh"
									disabled={listLoading}
									onClick={() => void loadList()}
								>
									<RefreshCw
										className={cn("h-4 w-4", listLoading && "animate-spin")}
									/>
								</Button>
							) : null}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-slate-100 hover:text-slate-700"
								aria-label="Close mail panel"
								onClick={() => onOpenChange(false)}
							>
								<PanelRightClose className="h-4 w-4" />
							</Button>
						</div>
					</div>

					{/* Segmented tabs — Apple Mail / Threads pattern */}
					{connected && !showingDetail ? (
						<div className="shrink-0 px-4 pb-3">
							<div
								className="flex rounded-xl bg-slate-100 p-1"
								role="tablist"
								aria-label="Mail folders"
							>
								{TABS.map((t) => {
									const Icon = t.icon;
									const active = tab === t.id;
									return (
										<button
											key={t.id}
											type="button"
											role="tab"
											aria-selected={active}
											onClick={() => {
												setTab(t.id);
												setSelectedId(null);
												setDetail(null);
											}}
											className={cn(
												"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all duration-200 cursor-pointer",
												active
													? "bg-white text-slate-800 shadow-sm"
													: "text-slate-500 hover:text-slate-700",
											)}
										>
											<Icon className="h-3.5 w-3.5" />
											{t.label}
										</button>
									);
								})}
							</div>
						</div>
					) : null}

					<div
						className={cn(
							"min-h-0 flex-1 overflow-y-auto px-4",
							tab === "compose" ? "pb-4" : "pb-3",
						)}
					>
						{statusLoading ? (
							<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
								<Loader2 className="h-5 w-5 animate-spin" />
								<p className="text-sm">Checking Gmail…</p>
							</div>
						) : statusError ? (
							<div className="rounded-xl border border-red/20 bg-red/5 px-4 py-6 text-center">
								<p className="text-sm text-red">{statusError}</p>
							</div>
						) : !connected ? (
							<div className="flex flex-col items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-10 text-center">
								<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0f5384]/10">
									<Mail className="h-5 w-5 text-[#0f5384]" />
								</div>
								<div className="space-y-1">
									<p className="text-sm font-medium text-slate-800">
										Connect Gmail
									</p>
									<p className="text-xs text-slate-500 max-w-[240px]">
										Link your account in Settings to read and send mail without
										leaving CAALM.
									</p>
								</div>
								<Button
									asChild
									className="primary-btn px-3 sm:px-4 cursor-pointer"
								>
									<Link href="/settings/billing?tab=integrations">
										<Mail className="h-4 w-4" />
										Open Integrations
									</Link>
								</Button>
							</div>
						) : tab === "compose" ? (
							<GmailComposeForm
								fromEmail={email}
								onSent={() => {
									setTab("inbox");
									void loadList();
								}}
								onDraftSaved={() => {
									setTab("drafts");
								}}
							/>
						) : showingDetail ? (
							<GmailMessageView
								loading={detailLoading}
								message={detail}
								onBack={() => {
									setSelectedId(null);
									setDetail(null);
								}}
							/>
						) : (
							<div className="flex min-w-0 flex-col gap-3">
								<SearchField
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={
										tab === "drafts"
											? "Search drafts…"
											: "Search inbox…"
									}
									aria-label={
										tab === "drafts" ? "Search drafts" : "Search inbox"
									}
									containerClassName="w-full bg-white/80"
								/>
								<GmailMessageList
									items={filteredItems}
									loading={listLoading}
									selectedId={selectedId}
									onSelect={(id) => void openMessage(id)}
									variant={tab === "drafts" ? "drafts" : "inbox"}
									emptyLabel={
										searchQuery.trim()
											? "No messages match your search"
											: tab === "drafts"
												? "No drafts yet"
												: "Inbox is empty"
									}
								/>
							</div>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
