"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CounterpartyInviteDialog } from "@/components/contracts/negotiation/CounterpartyInviteDialog";
import { NegotiationCommentThread } from "@/components/contracts/negotiation/NegotiationCommentThread";
import {
	NegotiationDocumentPane,
	negotiationParagraphDomId,
} from "@/components/contracts/negotiation/NegotiationDocumentPane";
import { NegotiationHeader } from "@/components/contracts/negotiation/NegotiationHeader";
import {
	buildNegotiationParticipants,
	type NegotiationParticipant,
} from "@/components/contracts/negotiation/NegotiationInviteeAvatars";
import { NegotiationPdfFab } from "@/components/contracts/negotiation/NegotiationPdfFab";
import { NegotiationPreviewDialog } from "@/components/contracts/negotiation/NegotiationPreviewDialog";
import { NegotiationVersionPanel } from "@/components/contracts/negotiation/NegotiationVersionPanel";
import DocumentViewer from "@/components/DocumentViewer";
import { PERMISSIONS } from "@/constants/permissions";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNegotiationPoll } from "@/hooks/useNegotiationPoll";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { canSendForReview } from "@/lib/contracts/negotiation/comments.logic";
import {
	flattenActiveInvitees,
	type NegotiationInvitee,
} from "@/lib/contracts/negotiation/access.logic";
import type { NegotiationComment } from "@/lib/contracts/negotiation/comments.service";
import {
	countDiffKinds,
	type DiffSummary,
} from "@/lib/contracts/negotiation/diff-summary";
import {
	buildClauseToc,
	isThinNegotiationSnapshot,
	parseNegotiationDocument,
} from "@/lib/contracts/negotiation/document-model";
import type { ContractDocumentVersion } from "@/lib/contracts/negotiation/versions.service";
import { getProfilePictureUrl } from "@/lib/utils";

type OwnerParticipant = NegotiationInvitee & { imageUrl?: string | null };

type AuthAvatarSource = {
	avatar?: string | null;
	profileImageId?: string | null;
	prefs?: {
		profileImage?: string | null;
		profileImageId?: string | null;
	} | null;
};

/** Same rules as ProfilePicture: prefs URL, then avatar URL/path, then storage file id. */
function imageUrlFromAuthUser(user: AuthAvatarSource | null): string | null {
	if (!user) return null;
	const prefUrl = String(user.prefs?.profileImage || "").trim();
	if (prefUrl) return prefUrl;

	const avatarValue = String(user.avatar || "").trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) return avatarValue;
	if (avatarValue.startsWith("/")) return avatarValue;

	const fileId =
		(avatarValue &&
		!avatarValue.includes("avatar-placeholder") &&
		!avatarValue.startsWith("/") &&
		!/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: null) ||
		String(user.profileImageId || user.prefs?.profileImageId || "").trim() ||
		null;

	return getProfilePictureUrl(fileId);
}

interface NegotiationWorkspaceProps {
	contractId: string;
}

export function NegotiationWorkspace({ contractId }: NegotiationWorkspaceProps) {
	const { orgId } = useOrganization();
	const { user: authUser } = useAuth();
	const { permissions } = usePermissions();
	const { toast } = useToast();
	const canEdit = permissions.includes(PERMISSIONS.CONTRACTS.EDIT);
	const canApprove = permissions.includes(PERMISSIONS.CONTRACTS.APPROVE);
	const [title, setTitle] = useState("Contract draft");
	const [lifecycle, setLifecycle] = useState("negotiation");
	const [fileId, setFileId] = useState<string | null>(null);
	const [fileUrl, setFileUrl] = useState<string | null>(null);
	const [pdfOpen, setPdfOpen] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewIntent, setPreviewIntent] = useState<"preview" | "send">(
		"preview",
	);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [previewHtml, setPreviewHtml] = useState<string | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [versions, setVersions] = useState<ContractDocumentVersion[]>([]);
	const [comments, setComments] = useState<NegotiationComment[]>([]);
	const [selectedId, setSelectedId] = useState("");
	const [summaries, setSummaries] = useState<Record<string, DiffSummary>>({});
	const [anchorStart, setAnchorStart] = useState(-1);
	const [anchorEnd, setAnchorEnd] = useState(-1);
	const [snippet, setSnippet] = useState("");
	const [selectedRedlineAllowed, setSelectedRedlineAllowed] = useState(true);
	const [activeCommentId, setActiveCommentId] = useState("");
	const [activeClauseId, setActiveClauseId] = useState("");
	const [pinnedClauseId, setPinnedClauseId] = useState("");
	const [inviteOpen, setInviteOpen] = useState(false);
	const [invitees, setInvitees] = useState<NegotiationInvitee[]>([]);
	const [ownerParticipant, setOwnerParticipant] =
		useState<OwnerParticipant | null>(null);
	const [busy, setBusy] = useState(false);
	const [busyAction, setBusyAction] = useState<string | null>(null);
	const rebuildAttemptedRef = useRef(false);
	const clausePinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	const headers = useMemo(
		() =>
			orgId
				? { "x-org-id": orgId, "Content-Type": "application/json" }
				: undefined,
		[orgId],
	);

	const selected = versions.find((row) => row.$id === selectedId) || versions[0];
	const versionText = selected?.extractedText || "";
	const model = useMemo(
		() => parseNegotiationDocument(versionText),
		[versionText],
	);
	const toc = useMemo(() => buildClauseToc(model.clauses), [model]);
	const activeClause = useMemo(
		() => model.clauses.find((clause) => clause.id === activeClauseId) || null,
		[activeClauseId, model.clauses],
	);
	const activeClauseRange = useMemo(() => {
		if (!activeClause || activeClause.paragraphs.length === 0) return null;
		const start = Math.min(...activeClause.paragraphs.map((p) => p.start));
		const end = Math.max(...activeClause.paragraphs.map((p) => p.end));
		return { start, end };
	}, [activeClause]);
	const openCount = comments.filter((row) => row.status === "open").length;
	const sendGate = canSendForReview({
		openCommentCount: openCount,
		hasApprovePermission: canApprove,
	});
	const roleLabel = canEdit ? "internal editor" : "internal viewer";
	const participants: NegotiationParticipant[] = useMemo(
		() => buildNegotiationParticipants(ownerParticipant, invitees),
		[invitees, ownerParticipant],
	);

	const load = useCallback(async () => {
		if (!orgId || !headers) return;
		const detailsRes = await fetch(
			`/api/contracts/get-details?contractId=${contractId}`,
		);
		if (detailsRes.ok) {
			const details = await detailsRes.json();
			const contract = details.data || details.contract || details;
			setTitle(
				String(contract.contractName || contract.name || "Contract draft"),
			);
			setFileId(contract.fileId ? String(contract.fileId) : null);
			setFileUrl(contract.fileUrl ? String(contract.fileUrl) : null);
			const ownerId = String(
				typeof contract.contractOwnerId === "string"
					? contract.contractOwnerId
					: typeof contract.owner === "string"
						? contract.owner
						: "",
			).trim();
			const authEmail = String(authUser?.email || "")
				.trim()
				.toLowerCase();
			const authName = String(
				(authUser as { fullName?: string } | null)?.fullName ||
					authUser?.name ||
					authEmail,
			).trim();
			const authMatchesOwner =
				Boolean(ownerId) &&
				Boolean(authUser) &&
				(authUser?.$id === ownerId ||
					(authUser as { accountId?: string } | null)?.accountId === ownerId);

			if (authMatchesOwner && authEmail) {
				setOwnerParticipant({
					email: authEmail,
					name: authName || authEmail,
					imageUrl: imageUrlFromAuthUser(authUser as AuthAvatarSource | null),
				});
			} else if (ownerId) {
				try {
					const usersRes = await fetch("/api/users/get-by-ids", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ userIds: [ownerId] }),
					});
					if (usersRes.ok) {
						const users = (await usersRes.json()) as Array<{
							fullName?: string;
							email?: string;
							profileImageId?: string | null;
						}>;
						const user = Array.isArray(users) ? users[0] : null;
						if (user?.email) {
							setOwnerParticipant({
								email: String(user.email).toLowerCase(),
								name: String(user.fullName || user.email).trim(),
								imageUrl: getProfilePictureUrl(user.profileImageId),
							});
						}
					}
				} catch {
					/* best-effort owner avatar */
				}
			} else if (authEmail) {
				// Details payload may be cached without owner; still show the signed-in editor.
				setOwnerParticipant({
					email: authEmail,
					name: authName || authEmail,
					imageUrl: imageUrlFromAuthUser(authUser as AuthAvatarSource | null),
				});
			}
			const nextLifecycle = String(contract.lifecycleStatus || "draft");
			setLifecycle(nextLifecycle);
			if (canEdit && nextLifecycle === "draft") {
				await fetch(`/api/contracts/${contractId}/negotiation/lifecycle`, {
					method: "POST",
					headers,
					body: JSON.stringify({
						action: "start",
						extractedText: String(contract.description || ""),
					}),
				});
				setLifecycle("negotiation");
			}
		}
		const [versionsRes, commentsRes, accessRes] = await Promise.all([
			fetch(`/api/contracts/${contractId}/negotiation/versions`, { headers }),
			fetch(`/api/contracts/${contractId}/negotiation/comments`, { headers }),
			canEdit
				? fetch(`/api/contracts/${contractId}/negotiation/access`, { headers })
				: Promise.resolve(null),
		]);
		let versionRows: ContractDocumentVersion[] = [];
		let commentRows: NegotiationComment[] = [];
		if (versionsRes.ok) {
			const body = await versionsRes.json();
			const rows = (body.versions || []) as ContractDocumentVersion[];
			versionRows = rows;
			setVersions(rows);
			if (rows[0]) {
				setSelectedId((current) => current || rows[0].$id);
			}
		}
		if (commentsRes.ok) {
			const body = await commentsRes.json();
			commentRows = (body.comments || []) as NegotiationComment[];
			setComments(commentRows);
		}
		if (accessRes?.ok) {
			const body = await accessRes.json();
			const rows = (body.invites || []) as Array<{
				invitees?: NegotiationInvitee[];
				counterpartyEmail?: string;
				counterpartyName?: string;
				expiresAt?: string;
				revokedAt?: string;
			}>;
			setInvitees(
				flattenActiveInvitees(
					rows.map((row) => ({
						$id: "",
						contractId,
						orgId: orgId || "",
						tokenHash: "",
						counterpartyEmail: row.counterpartyEmail || "",
						counterpartyName: row.counterpartyName || "",
						invitees: row.invitees || [],
						expiresAt: row.expiresAt || "",
						revokedAt: row.revokedAt || "",
						createdBy: "",
						$createdAt: "",
					})),
				),
			);
		}

		const current = versionRows[0];
		const currentHasComments =
			current &&
			commentRows.some((comment) => comment.versionId === current.$id);
		if (
			canEdit &&
			current &&
			!currentHasComments &&
			isThinNegotiationSnapshot(current.extractedText) &&
			!rebuildAttemptedRef.current
		) {
			rebuildAttemptedRef.current = true;
			const rebuildRes = await fetch(
				`/api/contracts/${contractId}/negotiation/lifecycle`,
				{
					method: "POST",
					headers,
					body: JSON.stringify({ action: "rebuild_snapshot" }),
				},
			);
			const rebuildBody = await rebuildRes.json().catch(() => ({}));
			if (rebuildRes.ok && rebuildBody.rebuilt) {
				const refreshed = await fetch(
					`/api/contracts/${contractId}/negotiation/versions`,
					{ headers },
				);
				if (refreshed.ok) {
					const body = await refreshed.json();
					const rows = (body.versions || []) as ContractDocumentVersion[];
					setVersions(rows);
					if (rows[0]) {
						setSelectedId(rows[0].$id);
					}
				}
			}
		}
	}, [authUser, canEdit, contractId, headers, orgId]);

	const refreshLiveData = useCallback(async () => {
		if (!headers) return;
		const [versionsRes, commentsRes] = await Promise.all([
			fetch(`/api/contracts/${contractId}/negotiation/versions`, { headers }),
			fetch(`/api/contracts/${contractId}/negotiation/comments`, { headers }),
		]);
		if (versionsRes.ok) {
			const body = await versionsRes.json();
			const rows = (body.versions || []) as ContractDocumentVersion[];
			setVersions((current) => {
				const currentKey = current
					.map((row) => `${row.$id}:${row.versionNumber}`)
					.join("|");
				const nextKey = rows
					.map((row) => `${row.$id}:${row.versionNumber}`)
					.join("|");
				if (currentKey === nextKey) return current;
				if (selectedId === current[0]?.$id && rows[0]) {
					setSelectedId(rows[0].$id);
				}
				return rows;
			});
		}
		if (commentsRes.ok) {
			const body = await commentsRes.json();
			const rows = (body.comments || []) as NegotiationComment[];
			setComments((current) => {
				const commentKey = (items: NegotiationComment[]) =>
					items
						.map(
							(row) =>
								`${row.$id}:${row.status}:${row.body}:${row.redlineProposal}`,
						)
						.join("|");
				return commentKey(current) === commentKey(rows) ? current : rows;
			});
		}
	}, [contractId, headers, selectedId]);

	useEffect(() => {
		void load();
	}, [load]);

	useNegotiationPoll(refreshLiveData, {
		enabled: Boolean(headers),
		paused: busy,
	});

	useEffect(
		() => () => {
			if (clausePinTimerRef.current) clearTimeout(clausePinTimerRef.current);
			if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
		},
		[],
	);

	// +N/−N per version card: diff each version against its predecessor.
	useEffect(() => {
		if (!headers || versions.length < 2) return;
		const sorted = [...versions].sort(
			(a, b) => a.versionNumber - b.versionNumber,
		);
		const pairs = sorted
			.map((version, index) => ({ version, previous: sorted[index - 1] }))
			.filter((pair) => pair.previous);
		void Promise.all(
			pairs.map(async ({ version, previous }) => {
				const res = await fetch(
					`/api/contracts/${contractId}/negotiation/versions/${version.$id}/diff?against=${previous.$id}`,
					{ headers },
				);
				if (!res.ok) return null;
				const body = await res.json();
				return body?.rows
					? { id: version.$id, summary: countDiffKinds(body.rows) }
					: null;
			}),
		).then((rows) => {
			const next: Record<string, DiffSummary> = {};
			for (const row of rows) {
				if (row) next[row.id] = row.summary;
			}
			setSummaries(next);
		});
	}, [contractId, headers, versions]);

	const selectParagraph = useCallback(
		(
			start: number,
			end: number,
			text: string,
			redlineAllowed: boolean = true,
		) => {
			setAnchorStart(start);
			setAnchorEnd(end);
			setSnippet(text);
			setSelectedRedlineAllowed(redlineAllowed);
			const clause = model.clauses.find((row) =>
				row.paragraphs.some(
					(paragraph) => start >= paragraph.start && start < paragraph.end,
				),
			);
			if (clause) setActiveClauseId(clause.id);
		},
		[model],
	);

	const focusParagraphForComment = useCallback(
		(comment: NegotiationComment) => {
			setActiveCommentId(comment.$id);
			const paragraph = model.negotiableParagraphs.find(
				(row) =>
					comment.anchorStart < row.end && comment.anchorEnd > row.start,
			);
			if (!paragraph) return;
			const editableStart =
				paragraph.protectedEnd && paragraph.protectedEnd < paragraph.end
					? paragraph.protectedEnd
					: paragraph.start;
			selectParagraph(
				editableStart,
				paragraph.end,
				paragraph.text.slice(editableStart - paragraph.start),
				paragraph.redlineAllowed !== false,
			);
			document
				.getElementById(negotiationParagraphDomId(paragraph.start))
				?.scrollIntoView({ behavior: "smooth", block: "center" });
		},
		[model, selectParagraph],
	);

	const run = async (
		task: () => Promise<void>,
		success: string,
		action?: string,
	) => {
		setBusy(true);
		setBusyAction(action || null);
		try {
			await task();
			toast({ title: success });
			await load();
		} catch (error) {
			toast({
				title: "Could not save",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setBusy(false);
			setBusyAction(null);
		}
	};

	const openFreshPreview = async (intent: "preview" | "send") => {
		if (!headers) return;
		if (intent === "send") setBusyAction("send");
		setPreviewIntent(intent);
		setPreviewOpen(true);
		setPreviewLoading(true);
		setPreviewError(null);
		setPreviewHtml(null);
		if (previewUrlRef.current) {
			URL.revokeObjectURL(previewUrlRef.current);
			previewUrlRef.current = null;
			setPreviewUrl(null);
		}
		try {
			const res = await fetch(
				`/api/contracts/${contractId}/negotiation/preview-pdf`,
				{ method: "POST", headers },
			);
			const contentType = res.headers.get("content-type") || "";
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || "Could not build PDF preview");
			}
			if (contentType.includes("application/json")) {
				const body = (await res.json()) as {
					mode?: string;
					html?: string;
					error?: string;
				};
				if (body.html) {
					setPreviewHtml(body.html);
					return;
				}
				throw new Error(body.error || "Could not build preview");
			}
			const url = URL.createObjectURL(await res.blob());
			previewUrlRef.current = url;
			setPreviewUrl(url);
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Could not build PDF preview";
			setPreviewError(message);
			if (intent === "preview" && fileId) {
				setPreviewOpen(false);
				setPdfOpen(true);
				toast({
					title: "Showing the stored PDF",
					description: `${message}. The latest negotiation changes may not appear.`,
				});
			}
		} finally {
			setPreviewLoading(false);
			if (intent === "send") setBusyAction(null);
		}
	};

	const sendForReview = () => {
		void run(
			async () => {
				const res = await fetch(
					`/api/contracts/${contractId}/negotiation/lifecycle`,
					{
						method: "POST",
						headers,
						body: JSON.stringify({ action: "send_for_review" }),
					},
				);
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(body.error || "Could not send for review");
				}
				setPreviewOpen(false);
			},
			"Sent for review",
			"confirm-send",
		);
	};

	return (
		<div className="flex h-[calc(100vh-5rem)] w-full flex-col overflow-hidden px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="shrink-0">
				<NegotiationHeader
					lifecycle={lifecycle}
					roleLabel={roleLabel}
					canEdit={canEdit}
					busy={busy || busyAction === "send"}
					busyAction={busyAction}
					openCount={openCount}
					sendGate={sendGate}
					canApprove={canApprove}
					participants={participants}
					onInvite={() => setInviteOpen(true)}
					onSend={() => void openFreshPreview("send")}
				/>
			</div>

			{/* Viewport-locked desk: each pane scrolls on its own. */}
			<div className="mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm xl:flex-row">
				<NegotiationVersionPanel
					versions={versions}
					selectedId={selected?.$id || selectedId}
					onSelect={setSelectedId}
					summaries={summaries}
					toc={toc}
					activeClauseId={activeClauseId}
					onJumpToClause={(entry) => {
						setActiveClauseId(entry.id);
						setPinnedClauseId(entry.id);
						if (clausePinTimerRef.current) {
							clearTimeout(clausePinTimerRef.current);
						}
						clausePinTimerRef.current = setTimeout(
							() => setPinnedClauseId(""),
							600,
						);
						document
							.getElementById(entry.id)
							?.scrollIntoView({ behavior: "smooth", block: "start" });
					}}
				/>
				<NegotiationDocumentPane
					model={model}
					comments={comments}
					selectedStart={anchorStart}
					pinnedClauseId={pinnedClauseId}
					onOpenPdf={() => void openFreshPreview("preview")}
					onSelectParagraph={selectParagraph}
					onFocusComment={setActiveCommentId}
					onActiveClauseChange={setActiveClauseId}
				/>
				<NegotiationCommentThread
					comments={comments}
					versionText={versionText}
					selectedSnippet={snippet}
					selectedStart={anchorStart}
					selectedEnd={anchorEnd}
					activeClauseRange={activeClauseRange}
					redlineAllowed={selectedRedlineAllowed}
					canEdit={canEdit}
					busy={busy}
					busyAction={busyAction}
					activeCommentId={activeCommentId}
					allowInternalToggle
					onFocusParagraph={focusParagraphForComment}
					onCreate={(body, redlineProposal, internal) => {
						if (!selected || !snippet.trim() || anchorEnd <= anchorStart) {
							toast({
								title: "Select a paragraph first",
								variant: "destructive",
							});
							return;
						}
						void run(async () => {
							const res = await fetch(
								`/api/contracts/${contractId}/negotiation/comments`,
								{
									method: "POST",
									headers,
									body: JSON.stringify({
										versionId: selected.$id,
										body,
										redlineProposal,
										anchorStart,
										anchorEnd,
										anchorType: "paragraph",
										visibility: internal ? "internal" : "shared",
									}),
								},
							);
							if (!res.ok) {
								const err = await res.json().catch(() => ({}));
								throw new Error(err.error || "Could not add comment");
							}
						}, "Comment saved");
					}}
					onResolve={(commentId) => {
						void run(
							async () => {
								const res = await fetch(
									`/api/contracts/${contractId}/negotiation/comments/${commentId}`,
									{
										method: "PATCH",
										headers,
										body: JSON.stringify({ status: "resolved" }),
									},
								);
								if (!res.ok) throw new Error("Could not resolve comment");
							},
							"Comment resolved",
							`resolve:${commentId}`,
						);
					}}
					onAccept={(commentId) => {
						void run(
							async () => {
								const res = await fetch(
									`/api/contracts/${contractId}/negotiation/comments/${commentId}/accept`,
									{
										method: "POST",
										headers,
										body: JSON.stringify({}),
									},
								);
								const body = await res.json().catch(() => ({}));
								if (!res.ok) {
									throw new Error(
										body.error || "Could not accept redline",
									);
								}
								// Pin the new version so load() does not keep the pre-accept snapshot.
								const nextId = String(body.version?.$id || "");
								if (nextId) setSelectedId(nextId);
							},
							"Redline accepted — new version created",
							`accept:${commentId}`,
						);
					}}
				/>
			</div>

			<CounterpartyInviteDialog
				open={inviteOpen}
				onOpenChange={setInviteOpen}
				busy={busy}
				onCreate={async (nextInvitees, expiresInDays) => {
					if (!headers) return null;
					const res = await fetch(
						`/api/contracts/${contractId}/negotiation/access`,
						{
							method: "POST",
							headers,
							body: JSON.stringify({
								invitees: nextInvitees,
								counterpartyEmail: nextInvitees[0]?.email || "",
								counterpartyName: nextInvitees[0]?.name || "",
								expiresInDays,
							}),
						},
					);
					const body = await res.json().catch(() => ({}));
					if (!res.ok) {
						toast({
							title: "Could not create link",
							description: body.error || "Try again",
							variant: "destructive",
						});
						return null;
					}
					setInvitees((current) => {
						const byEmail = new Map(current.map((row) => [row.email, row]));
						for (const row of nextInvitees) byEmail.set(row.email, row);
						return [...byEmail.values()];
					});
					const path = String(body.urlPath || "");
					return path ? `${window.location.origin}${path}` : null;
				}}
				onSend={async (emails, message, link) => {
					if (!headers) return false;
					const urlPath = new URL(link).pathname;
					const res = await fetch(
						`/api/contracts/${contractId}/negotiation/access/send`,
						{
							method: "POST",
							headers,
							body: JSON.stringify({ emails, message, urlPath }),
						},
					);
					const body = await res.json().catch(() => ({}));
					if (!res.ok) {
						toast({
							title: "Could not send invitations",
							description: body.error || "Try again",
							variant: "destructive",
						});
						return false;
					}
					toast({
						title: `Invitation sent to ${emails.length} ${emails.length === 1 ? "person" : "people"}`,
					});
					return true;
				}}
			/>

			<NegotiationPreviewDialog
				open={previewOpen}
				onOpenChange={(open) => {
					setPreviewOpen(open);
					if (!open) {
						if (previewUrlRef.current) {
							URL.revokeObjectURL(previewUrlRef.current);
							previewUrlRef.current = null;
						}
						setPreviewUrl(null);
						setPreviewHtml(null);
						setPreviewError(null);
					}
				}}
				contractId={contractId}
				fileName={`${title}.pdf`}
				pdfUrl={previewUrl}
				htmlContent={previewHtml}
				loading={previewLoading}
				error={previewError}
				showConfirm={previewIntent === "send"}
				confirming={busy}
				onConfirm={sendForReview}
			/>

			{fileId ? (
				<>
					<NegotiationPdfFab
						onOpen={() => void openFreshPreview("preview")}
					/>
					<DocumentViewer
						isOpen={pdfOpen}
						onClose={() => setPdfOpen(false)}
						assistantMode="contract"
						file={{
							id: fileId,
							name: `${title}.pdf`,
							type: "pdf",
							size: "",
							url: fileUrl || "",
							createdAt: new Date().toISOString(),
							createdBy: "negotiation",
							description: "Negotiation PDF preview",
						}}
					/>
				</>
			) : null}
		</div>
	);
}
