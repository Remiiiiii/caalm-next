"use client";

import {
	Archive,
	FileText,
	Inbox,
	Loader2,
	Mail,
	MailOpen,
	PanelRightClose,
	PenLine,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GmailActionTooltip } from "@/components/gmail/GmailActionTooltip";
import GmailComposeForm, {
	type GmailComposeDraft,
} from "@/components/gmail/GmailComposeForm";
import GmailMessageList, {
	type GmailListItem,
} from "@/components/gmail/GmailMessageList";
import GmailMessageView, {
	type GmailMessageDetailView,
} from "@/components/gmail/GmailMessageView";
import { Button } from "@/components/ui/button";
import { PageIndex } from "@/components/ui/page-index";
import { SearchField } from "@/components/ui/search-field";
import {
	Sheet,
	SheetContent,
	SheetHeaderIcon,
	SheetTitle,
} from "@/components/ui/sheet";
import { ToastAction } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type OutlookTab = "inbox" | "drafts" | "compose";
type MessageAction =
	| "archive"
	| "unarchive"
	| "trash"
	| "untrash"
	| "markRead"
	| "markUnread";

interface OutlookMailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const PAGE_SIZE = 20;
const FETCH_LIMIT = 100;

const TABS: { id: OutlookTab; label: string; icon: typeof Inbox }[] = [
	{ id: "inbox", label: "Inbox", icon: Inbox },
	{ id: "drafts", label: "Drafts", icon: FileText },
	{ id: "compose", label: "Compose", icon: PenLine },
];

function replyAddress(from: string): string {
	const match = from.match(/<([^>]+)>/);
	return (match?.[1] || from).trim();
}

function replySubject(subject: string): string {
	const trimmed = subject.trim();
	if (/^re:\s*/i.test(trimmed)) return trimmed;
	return `Re: ${trimmed || "(No subject)"}`;
}

export default function OutlookMailSheet({
	open,
	onOpenChange,
}: OutlookMailSheetProps) {
	const { toast } = useToast();
	const [tab, setTab] = useState<OutlookTab>("inbox");
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
	const [busyId, setBusyId] = useState<string | null>(null);
	const [busyAction, setBusyAction] = useState<string | null>(null);
	const [composeDraft, setComposeDraft] = useState<GmailComposeDraft | null>(
		null,
	);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const [bulkBusy, setBulkBusy] = useState(false);
	const [page, setPage] = useState(1);
	const listScrollRef = useRef<HTMLDivElement>(null);

	const loadStatus = useCallback(async () => {
		setStatusLoading(true);
		setStatusError(null);
		try {
			const res = await fetch("/api/microsoft/mail/status");
			const data = await res.json();
			if (res.status === 403 && data.code === "outlook_mail_not_connected") {
				setConnected(false);
				return;
			}
			if (!res.ok) throw new Error(data.error || "Status unavailable");
			setConnected(Boolean(data.connected));
			setEmail(data.email);
		} catch (err) {
			setStatusError(
				err instanceof Error
					? err.message
					: "Could not load Outlook Mail status",
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
		setCheckedIds(new Set());
		try {
			const base =
				tab === "drafts"
					? "/api/microsoft/mail/drafts"
					: "/api/microsoft/mail/messages";
			const res = await fetch(`${base}?maxResults=${FETCH_LIMIT}`);
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
			toast({
				title: "Could not load mail",
				description: "Try refreshing, or reconnect Outlook Mail in Settings.",
				variant: "destructive",
			});
		} finally {
			setListLoading(false);
		}
	}, [connected, tab, toast]);

	useEffect(() => {
		if (!open) return;
		void loadStatus();
	}, [open, loadStatus]);

	useEffect(() => {
		if (!open || !connected || tab === "compose") return;
		void loadList();
	}, [open, connected, tab, loadList]);

	useEffect(() => {
		setPage(1);
		listScrollRef.current?.scrollTo({ top: 0 });
	}, [searchQuery, tab]);

	const filteredItems = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return items;
		return items.filter((item) => {
			const haystack =
				`${item.subject} ${item.from} ${item.snippet}`.toLowerCase();
			return haystack.includes(q);
		});
	}, [items, searchQuery]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const pageItems = useMemo(() => {
		const start = (safePage - 1) * PAGE_SIZE;
		return filteredItems.slice(start, start + PAGE_SIZE);
	}, [filteredItems, safePage]);

	const handlePageChange = useCallback((next: number) => {
		setPage(next);
		listScrollRef.current?.scrollTo({ top: 0 });
	}, []);

	const runMessageAction = useCallback(
		async (
			id: string,
			action: MessageAction,
			options?: { silent?: boolean },
		): Promise<boolean> => {
			setBusyId(id);
			setBusyAction(action);
			try {
				const res = await fetch(
					`/api/microsoft/mail/messages/${encodeURIComponent(id)}`,
					{
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ action }),
					},
				);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "Action failed");
				return true;
			} catch (err) {
				if (!options?.silent) {
					toast({
						title: "Could not update message",
						description:
							err instanceof Error
								? err.message
								: "Try again, or reconnect Outlook Mail in Settings.",
						variant: "destructive",
					});
				}
				return false;
			} finally {
				setBusyId(null);
				setBusyAction(null);
			}
		},
		[toast],
	);

	const removeFromList = useCallback((id: string) => {
		setItems((prev) => prev.filter((item) => item.id !== id));
		setSelectedId((current) => (current === id ? null : current));
		setDetail((current) => (current?.id === id ? null : current));
		setCheckedIds((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	}, []);

	const removeManyFromList = useCallback((ids: string[]) => {
		const remove = new Set(ids);
		setItems((prev) => prev.filter((item) => !remove.has(item.id)));
		setSelectedId((current) =>
			current && remove.has(current) ? null : current,
		);
		setDetail((current) =>
			current && remove.has(current.id) ? null : current,
		);
		setCheckedIds(new Set());
	}, []);

	const showUndoToast = useCallback(
		(title: string, undoAction: MessageAction, id: string) => {
			toast({
				title,
				action: (
					<ToastAction
						altText="Undo"
						onClick={() => {
							void (async () => {
								const ok = await runMessageAction(id, undoAction, {
									silent: true,
								});
								if (ok) void loadList();
							})();
						}}
					>
						Undo
					</ToastAction>
				),
			});
		},
		[loadList, runMessageAction, toast],
	);

	const handleArchive = useCallback(
		async (id: string) => {
			const ok = await runMessageAction(id, "archive");
			if (!ok) return;
			removeFromList(id);
			showUndoToast("Archived", "unarchive", id);
		},
		[removeFromList, runMessageAction, showUndoToast],
	);

	const handleTrash = useCallback(
		async (id: string) => {
			const ok = await runMessageAction(id, "trash");
			if (!ok) return;
			removeFromList(id);
			showUndoToast("Moved to trash", "untrash", id);
		},
		[removeFromList, runMessageAction, showUndoToast],
	);

	const handleToggleRead = useCallback(
		async (id: string, currentlyUnread: boolean) => {
			const action: MessageAction = currentlyUnread ? "markRead" : "markUnread";
			const ok = await runMessageAction(id, action);
			if (!ok) return;
			setItems((prev) =>
				prev.map((item) =>
					item.id === id ? { ...item, unread: !currentlyUnread } : item,
				),
			);
			setDetail((current) =>
				current?.id === id
					? { ...current, unread: !currentlyUnread }
					: current,
			);
		},
		[runMessageAction],
	);

	const toggleChecked = useCallback((id: string) => {
		setCheckedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const toggleAllChecked = useCallback(
		(checked: boolean) => {
			if (!checked) {
				setCheckedIds(new Set());
				return;
			}
			setCheckedIds(new Set(pageItems.map((item) => item.id)));
		},
		[pageItems],
	);

	const handleBulkAction = useCallback(
		async (action: "archive" | "trash" | "markRead" | "markUnread") => {
			const ids = [...checkedIds];
			if (ids.length === 0) return;
			setBulkBusy(true);
			try {
				const results = await Promise.all(
					ids.map((id) => runMessageAction(id, action, { silent: true })),
				);
				const okCount = results.filter(Boolean).length;
				if (okCount === 0) {
					toast({
						title: "Could not update messages",
						description: "Try again, or reconnect Outlook Mail in Settings.",
						variant: "destructive",
					});
					return;
				}
				if (action === "archive" || action === "trash") {
					removeManyFromList(ids.filter((_, i) => results[i]));
					toast({
						title:
							action === "archive"
								? `Archived ${okCount} message${okCount === 1 ? "" : "s"}`
								: `Moved ${okCount} to trash`,
					});
				} else {
					const unread = action === "markUnread";
					setItems((prev) =>
						prev.map((item) =>
							checkedIds.has(item.id) ? { ...item, unread } : item,
						),
					);
					setCheckedIds(new Set());
					toast({
						title: unread
							? `Marked ${okCount} as unread`
							: `Marked ${okCount} as read`,
					});
				}
			} finally {
				setBulkBusy(false);
			}
		},
		[checkedIds, removeManyFromList, runMessageAction, toast],
	);

	const openMessage = async (id: string) => {
		if (tab === "drafts") {
			setTab("compose");
			return;
		}
		setSelectedId(id);
		setDetailLoading(true);
		try {
			const res = await fetch(
				`/api/microsoft/mail/messages/${encodeURIComponent(id)}`,
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);
			const message = data.message as GmailMessageDetailView;
			setDetail(message);
			if (message.unread) {
				void runMessageAction(id, "markRead", { silent: true }).then((ok) => {
					if (!ok) return;
					setItems((prev) =>
						prev.map((item) =>
							item.id === id ? { ...item, unread: false } : item,
						),
					);
					setDetail((current) =>
						current?.id === id ? { ...current, unread: false } : current,
					);
				});
			}
		} catch {
			setDetail(null);
		} finally {
			setDetailLoading(false);
		}
	};

	const startReply = useCallback(() => {
		if (!detail) return;
		const quoted = (detail.bodyText || "")
			.split("\n")
			.map((line) => `> ${line}`)
			.join("\n");
		setComposeDraft({
			to: replyAddress(detail.from),
			subject: replySubject(detail.subject),
			body: quoted ? `\n\n${quoted}` : "",
			threadId: detail.threadId,
			replyToMessageId: detail.id,
		});
		setSelectedId(null);
		setDetail(null);
		setTab("compose");
	}, [detail]);

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
					<SheetTitle className="sr-only">Outlook Mail</SheetTitle>

					<div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-4">
						<div className="flex min-w-0 items-center gap-3">
							<SheetHeaderIcon>
								<Mail className="h-5 w-5 text-[#0f5384]" />
							</SheetHeaderIcon>
							<div className="min-w-0">
								<h2 className="text-lg font-semibold sidebar-gradient-text">
									Outlook Mail
								</h2>
								{email ? (
									<p className="truncate text-xs text-slate-500">{email}</p>
								) : (
									<p className="text-xs text-slate-500">Microsoft 365 in CAALM</p>
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
												if (t.id !== "compose") setComposeDraft(null);
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
						ref={listScrollRef}
						className={cn(
							"min-h-0 flex-1 overflow-y-auto px-4",
							tab === "compose" ? "pb-4" : "pb-3",
						)}
					>
						{statusLoading ? (
							<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600">
								<Loader2 className="h-5 w-5 animate-spin" />
								<p className="text-sm">Checking Outlook Mail…</p>
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
										Connect Outlook Mail
									</p>
									<p className="text-xs text-slate-500 max-w-[240px]">
										Link Microsoft 365 Mail under Settings → Integrations (Mail
										tab) to read and send without leaving CAALM.
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
								initialDraft={composeDraft}
								sendUrl="/api/microsoft/mail/send"
								draftsUrl="/api/microsoft/mail/drafts"
								signatureUrl="/api/microsoft/mail/signature"
								onSent={() => {
									setComposeDraft(null);
									setTab("inbox");
									void loadList();
								}}
								onDraftSaved={() => {
									setComposeDraft(null);
									setTab("drafts");
								}}
							/>
						) : showingDetail ? (
							<GmailMessageView
								loading={detailLoading}
								message={detail}
								busyAction={
									detail && busyId === detail.id ? busyAction : null
								}
								onBack={() => {
									setSelectedId(null);
									setDetail(null);
								}}
								onArchive={
									detail ? () => void handleArchive(detail.id) : undefined
								}
								onTrash={
									detail ? () => void handleTrash(detail.id) : undefined
								}
								onToggleRead={
									detail
										? () =>
												void handleToggleRead(
													detail.id,
													Boolean(detail.unread),
												)
										: undefined
								}
								onReply={detail ? startReply : undefined}
							/>
						) : (
							<div className="flex min-w-0 flex-col gap-3">
								<SearchField
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder={
										tab === "drafts" ? "Search drafts…" : "Search inbox…"
									}
									aria-label={
										tab === "drafts" ? "Search drafts" : "Search inbox"
									}
									containerClassName="w-full bg-white/80"
								/>
								{tab === "inbox" && checkedIds.size > 0 ? (
									<div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
										<p className="text-xs font-medium text-slate-700">
											{checkedIds.size} selected
										</p>
										<div className="flex items-center gap-0.5">
											<GmailActionTooltip label="Archive selected">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label="Archive selected"
													disabled={bulkBusy}
													onClick={() => void handleBulkAction("archive")}
												>
													{bulkBusy ? (
														<Loader2 className="h-4 w-4 animate-spin" />
													) : (
														<Archive className="h-4 w-4" />
													)}
												</Button>
											</GmailActionTooltip>
											<GmailActionTooltip label="Mark selected as read">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label="Mark selected as read"
													disabled={bulkBusy}
													onClick={() => void handleBulkAction("markRead")}
												>
													<MailOpen className="h-4 w-4" />
												</Button>
											</GmailActionTooltip>
											<GmailActionTooltip label="Mark selected as unread">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label="Mark selected as unread"
													disabled={bulkBusy}
													onClick={() => void handleBulkAction("markUnread")}
												>
													<Mail className="h-4 w-4" />
												</Button>
											</GmailActionTooltip>
											<GmailActionTooltip label="Delete selected">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-red/10 hover:text-red"
													aria-label="Delete selected"
													disabled={bulkBusy}
													onClick={() => void handleBulkAction("trash")}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</GmailActionTooltip>
											<GmailActionTooltip label="Clear selection">
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-8 w-8 cursor-pointer text-slate-500 hover:bg-white hover:text-slate-800"
													aria-label="Clear selection"
													disabled={bulkBusy}
													onClick={() => setCheckedIds(new Set())}
												>
													<X className="h-4 w-4" />
												</Button>
											</GmailActionTooltip>
										</div>
									</div>
								) : null}
								<GmailMessageList
									items={pageItems}
									loading={listLoading}
									selectedId={selectedId}
									onSelect={(id) => void openMessage(id)}
									variant={tab === "drafts" ? "drafts" : "inbox"}
									busyId={busyId}
									onArchive={
										tab === "inbox"
											? (id) => void handleArchive(id)
											: undefined
									}
									onTrash={
										tab === "inbox" ? (id) => void handleTrash(id) : undefined
									}
									onToggleRead={
										tab === "inbox"
											? (id, unread) => void handleToggleRead(id, unread)
											: undefined
									}
									checkedIds={tab === "inbox" ? checkedIds : undefined}
									onToggleChecked={
										tab === "inbox" ? toggleChecked : undefined
									}
									onToggleAllChecked={
										tab === "inbox" ? toggleAllChecked : undefined
									}
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

					{connected &&
					!showingDetail &&
					tab !== "compose" &&
					!listLoading &&
					filteredItems.length > 0 ? (
						<div className="shrink-0 border-t border-slate-200/80 bg-white/90 px-4 py-2 backdrop-blur-md">
							<PageIndex
								page={safePage}
								totalItems={filteredItems.length}
								pageSize={PAGE_SIZE}
								onPageChange={handlePageChange}
								showRange
								itemLabel={tab === "drafts" ? "drafts" : "messages"}
								hideWhenSinglePage
								aria-label="Mail pagination"
							/>
						</div>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}
