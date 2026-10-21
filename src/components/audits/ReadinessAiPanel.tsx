"use client";

import {
	Bot,
	Check,
	Copy,
	Loader2,
	PanelRightClose,
	Play,
	RefreshCw,
	Send,
	SquareArrowOutUpRight,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import AssistantAvatar from "@/components/assistant/AssistantAvatar";
import AssistantPreviewSheetShell from "@/components/assistant/AssistantPreviewSheetShell";
import AssistantThinkingIndicator from "@/components/assistant/AssistantThinkingIndicator";
import {
	NEUTRAL_PILL,
	PILL,
	RAG_PILL,
} from "@/components/audits/readiness/readiness-ui";
import ShimmerBadge from "@/components/landing/ShimmerBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
	type ReadinessProseBlock,
	splitReadinessProse,
} from "@/lib/audits/readiness/format-assistant-text";
import { formatSiteHost } from "@/lib/audits/readiness/summary-tiles";
import { cn } from "@/lib/utils";

interface Citation {
	id: string;
	title: string;
	href: string;
	label: string;
}

interface ReadinessSummaryStructured {
	overallScore: number;
	overallRag: "green" | "amber" | "red";
	overallBadgeLabel?: string;
	contractsGrantsScore: number | null;
	contractsGrantsRag: "green" | "amber" | "red" | null;
	contractsBadgeLabel?: string;
	licensesScore: number | null;
	licensesRag: "green" | "amber" | "red" | null;
	licensesBadgeLabel?: string;
	scopeLine: string;
	priorityAction: {
		title: string;
		dueDateLabel: string | null;
		instruction: string;
		affectsModules: string[];
		moduleHref: string;
	} | null;
	byModule: Array<{
		name: string;
		score: number;
		ragStatus: "green" | "amber" | "red";
		atRiskCount: number;
		evidenceCount: number;
		modulePath: string;
		blurb: string;
	}>;
	sourceLine?: string;
	publicSiteCrawl: {
		websiteUrl: string;
		sitemapFound: boolean;
		pagesCrawled: number;
		healthHint: string;
	} | null;
}

interface Message {
	role: "assistant" | "user";
	content: string;
	/** Records the answer was based on. */
	citations?: Citation[];
	structured?: ReadinessSummaryStructured;
}

const DEFAULT_SUGGESTIONS = [
	"Which gaps matter most for HRSA OSV prep?",
	"What should we fix before child-welfare monitoring?",
	"Which items belong on a financial PBC list?",
];

const RAG_DOT: Record<"green" | "amber" | "red", string> = {
	green: "bg-green-500",
	amber: "bg-amber-400",
	red: "bg-red-500",
};

function ScoreTile({
	label,
	score,
	badgeLabel,
	rag,
}: {
	label: string;
	score: number | null;
	badgeLabel: string;
	rag: "green" | "amber" | "red" | null;
}) {
	return (
		<div className="flex flex-1 flex-col rounded-[12px] border border-slate-200 bg-white px-3 py-[10px]">
			<span className="whitespace-nowrap text-xs leading-4 text-slate-500">
				{label}
			</span>
			<span className="mt-1 text-[26px] font-bold leading-8 tracking-tight text-slate-700 tabular-nums">
				{score !== null ? `${score}%` : "—"}
			</span>
			{badgeLabel ? (
				<span
					className={cn(
						PILL,
						"mt-2 w-fit whitespace-nowrap",
						rag ? RAG_PILL[rag] : NEUTRAL_PILL,
					)}
				>
					{badgeLabel}
				</span>
			) : null}
		</div>
	);
}

function StructuredSummaryMessage({
	data,
	content,
	onRegenerate,
}: {
	data: ReadinessSummaryStructured;
	content: string;
	onRegenerate?: () => void;
}) {
	const [copied, setCopied] = useState(false);

	return (
		<div className="space-y-3 text-sm">
			{/* Disclaimer */}
			<div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
				CAALM readiness is based on records in your CAALM organization. This is
				not a state, federal, funder, HRSA, DCF, or accreditation audit
				determination.
			</div>

			<div className="flex gap-2">
				<ScoreTile
					label="Overall readiness"
					score={data.overallScore}
					badgeLabel={data.overallBadgeLabel ?? data.overallRag}
					rag={data.overallRag}
				/>
				<ScoreTile
					label="Contracts & grants"
					score={data.contractsGrantsScore}
					badgeLabel={data.contractsBadgeLabel ?? ""}
					rag={data.contractsGrantsRag}
				/>
				<ScoreTile
					label="Licenses"
					score={data.licensesScore}
					badgeLabel={data.licensesBadgeLabel ?? ""}
					rag={data.licensesRag}
				/>
			</div>
			{data.scopeLine ? (
				<p className="whitespace-nowrap border-b border-slate-200 pb-3 text-xs leading-5 text-slate-500">
					{data.scopeLine}
				</p>
			) : null}

			{/* Priority action */}
			{data.priorityAction && (
				<div className="space-y-1.5 border-b border-slate-200 pb-3">
					<p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
						Priority Action
					</p>
					<div className="relative space-y-2 rounded-2xl border border-orange-200 bg-[#FFF6F0] p-3 pb-8">
						<div className="flex items-start justify-between gap-3">
							<p className="text-xs font-semibold leading-snug text-slate-700">
								{data.priorityAction.title}
							</p>
							{data.priorityAction.dueDateLabel ? (
								<span
									className={cn(
										PILL,
										RAG_PILL.amber,
										"shrink-0 whitespace-nowrap",
									)}
								>
									{data.priorityAction.dueDateLabel}
								</span>
							) : null}
						</div>
						<p className="text-xs leading-snug text-slate-700">
							{data.priorityAction.instruction}
						</p>
						{data.priorityAction.affectsModules.length > 0 ? (
							<div className="space-y-1.5">
								<p className="text-[11px] text-slate-500">Affects</p>
								<div className="flex flex-col items-start gap-1.5">
									{data.priorityAction.affectsModules.map((label) => (
										<span
											key={label}
											className={cn(
												PILL,
												"border-[#078FAB]/30 bg-white text-[#0f5384]",
											)}
										>
											{label}
										</span>
									))}
								</div>
							</div>
						) : null}
						{data.priorityAction.moduleHref ? (
							<Link
								href={data.priorityAction.moduleHref}
								aria-label={
									data.priorityAction.moduleHref.includes("license")
										? "Open licenses"
										: "Open contracts"
								}
								className="absolute right-3 bottom-2.5 text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
							>
								<SquareArrowOutUpRight className="h-4 w-4" aria-hidden />
							</Link>
						) : null}
					</div>
				</div>
			)}

			{/* By module */}
			{data.byModule.length > 0 && (
				<div className="space-y-2">
					<p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
						By Module
					</p>
					<div className="space-y-3">
						{data.byModule.map((m) => (
							<div key={m.name} className="flex gap-2">
								<div
									className={cn(
										"mt-1.5 h-2 w-2 shrink-0 rounded-full",
										RAG_DOT[m.ragStatus],
									)}
								/>
								<div className="min-w-0">
									<p className="text-xs leading-snug text-slate-700">
										<span className="font-semibold">{m.name}</span>
										<span className="text-slate-400"> · </span>
										<span className="font-semibold sidebar-gradient-text">
											{m.score}% ready
										</span>
									</p>
									<p className="mt-0.5 text-xs leading-snug text-slate-500">
										{m.blurb}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Public site crawl */}
			{data.publicSiteCrawl ? (
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
							Public Site Crawl
						</p>
						<span className={cn(PILL, NEUTRAL_PILL)}>
							Informational · not scored
						</span>
					</div>
					<div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 text-xs">
						<span className="text-slate-500">Site</span>
						<span className="text-right text-[#0f5384]">
							{formatSiteHost(data.publicSiteCrawl.websiteUrl)}
						</span>
						<span className="text-slate-500">sitemap.xml</span>
						<span className="text-right text-slate-700">
							{data.publicSiteCrawl.sitemapFound ? "Found" : "Not found"}
						</span>
						<span className="text-slate-500">Pages crawled</span>
						<span className="text-right tabular-nums text-slate-700">
							{data.publicSiteCrawl.pagesCrawled}
						</span>
						<span className="text-slate-500">Health hint</span>
						<span
							className={cn(
								PILL,
								"justify-self-end whitespace-nowrap",
								data.publicSiteCrawl.healthHint === "ok"
									? RAG_PILL.green
									: data.publicSiteCrawl.healthHint === "unavailable"
										? RAG_PILL.red
										: RAG_PILL.amber,
							)}
						>
							{data.publicSiteCrawl.healthHint}
						</span>
					</div>
				</div>
			) : null}

			{/* Prose fallback (hidden by default but available for copy) */}
			<details className="text-xs text-slate-400">
				<summary className="cursor-pointer select-none hover:text-slate-600">
					Show full narrative
				</summary>
				<ReadinessAssistantMessage content={content} />
			</details>

			{/* Actions */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						onClick={() => {
							void navigator.clipboard.writeText(content);
							setCopied(true);
							setTimeout(() => setCopied(false), 2000);
						}}
						className="cursor-pointer text-slate-400 hover:text-slate-700"
						title="Copy summary"
					>
						{copied ? (
							<Check className="h-3.5 w-3.5 text-green-500" />
						) : (
							<Copy className="h-3.5 w-3.5" />
						)}
					</button>
					{onRegenerate ? (
						<button
							type="button"
							onClick={onRegenerate}
							className="cursor-pointer text-slate-400 hover:text-slate-700"
							title="Regenerate"
						>
							<RefreshCw className="h-3.5 w-3.5" />
						</button>
					) : null}
				</div>
				<span className="text-[11px] text-slate-500">
					{data.sourceLine ?? "Source: Contracts and Licenses records"}
				</span>
			</div>
		</div>
	);
}

function ReadinessAssistantMessage({ content }: { content: string }) {
	const blocks = splitReadinessProse(content);

	return (
		<div className="space-y-3 text-sm leading-relaxed text-slate-700">
			{blocks.map((block, index) => (
				<ReadinessProseBlockView key={index} block={block} />
			))}
		</div>
	);
}

function ReadinessProseBlockView({ block }: { block: ReadinessProseBlock }) {
	switch (block.type) {
		case "list": {
			const ListTag = block.ordered ? "ol" : "ul";
			return (
				<ListTag
					className={cn(
						"space-y-1 pl-5",
						block.ordered ? "list-decimal" : "list-disc",
					)}
				>
					{block.items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ListTag>
			);
		}
		case "paragraph":
			return <p>{block.text}</p>;
		default: {
			const _exhaustive: never = block;
			return _exhaustive;
		}
	}
}

export function ReadinessAiLauncher({
	onClick,
	disabled,
}: {
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<ShimmerBadge
			as="button"
			type="button"
			animateOn="hover"
			onClick={onClick}
			disabled={disabled}
			aria-label="Readiness assistant"
			className="h-10 w-10 shrink-0"
			innerClassName="h-full w-full justify-center bg-white p-0"
		>
			<Bot className="h-5 w-5 text-[#0f5384]" aria-hidden />
		</ShimmerBadge>
	);
}

export function ReadinessAiPanel({
	snapshotId,
	initialSummary,
	initialSummaryAt,
	open,
	onOpenChange,
}: {
	snapshotId?: string | null;
	initialSummary?: string;
	/** ISO time the saved summary was generated. */
	initialSummaryAt?: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [messages, setMessages] = useState<Message[]>(
		initialSummary ? [{ role: "assistant", content: initialSummary }] : [],
	);
	const [summaryAt, setSummaryAt] = useState<string | null>(
		initialSummary ? (initialSummaryAt ?? null) : null,
	);
	const [question, setQuestion] = useState("");
	const [loading, setLoading] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		endRef.current?.scrollIntoView?.({ behavior: "smooth" });
	}, [open, messages, loading]);

	// Auto-upgrade prose-only initial summary to structured view on first open
	const hasAutoRun = useRef(false);
	useEffect(() => {
		if (!open || hasAutoRun.current || loading) return;
		const first = messages[0];
		if (first?.role === "assistant" && !first.structured) {
			hasAutoRun.current = true;
			void runAnalyze();
		}
		// Only run once when panel opens with an unstructured initial summary
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	const runAnalyze = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/audits/readiness/analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "analyze",
					snapshotId: snapshotId || undefined,
				}),
			});
			const body = await res.json();
			if (!res.ok) throw new Error(body.error || "Analyze failed");
			setMessages([
				{
					role: "assistant",
					content: body.data.summary,
					citations: body.data.citations,
					structured: body.data.structured as
						| ReadinessSummaryStructured
						| undefined,
				},
			]);
			setSummaryAt(new Date().toISOString());
		} catch (error) {
			setMessages([
				{
					role: "assistant",
					content:
						error instanceof Error
							? error.message
							: "Unable to generate analysis.",
				},
			]);
		} finally {
			setLoading(false);
		}
	}, [snapshotId]);

	const ask = useCallback(
		async (text: string) => {
			if (!text.trim()) return;
			setMessages((prev) => [...prev, { role: "user", content: text.trim() }]);
			setQuestion("");
			setLoading(true);
			try {
				const res = await fetch("/api/audits/readiness/analyze", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "question",
						question: text.trim(),
						snapshotId: snapshotId || undefined,
						previousContext: messages
							.slice(-4)
							.map((m) => `${m.role}: ${m.content}`)
							.join("\n"),
					}),
				});
				const body = await res.json();
				if (!res.ok) throw new Error(body.error || "Question failed");
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content: body.data.answer,
						citations: body.data.citations,
					},
				]);
			} catch (error) {
				setMessages((prev) => [
					...prev,
					{
						role: "assistant",
						content:
							error instanceof Error
								? error.message
								: "Unable to answer right now.",
					},
				]);
			} finally {
				setLoading(false);
			}
		},
		[messages, snapshotId],
	);

	const handleSend = () => {
		void ask(question);
	};

	const header = (
		<div className="flex items-center justify-between gap-2">
			<div className="flex min-w-0 items-center gap-2">
				<AssistantAvatar size="xs" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold sidebar-gradient-text">
						Readiness assistant
					</p>
					<p className="truncate caption text-slate-500">
						Not an official audit determination
					</p>
				</div>
			</div>
			<div className="flex items-center gap-0.5">
				{messages.length > 0 ? (
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						aria-label="Re-run auto-summary"
						onClick={() => void runAnalyze()}
						disabled={loading}
					>
						{loading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Play className="h-4 w-4" />
						)}
					</Button>
				) : null}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="h-8 w-8 cursor-pointer text-slate-600 hover:bg-white/50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
					aria-label="Close"
					onClick={() => onOpenChange(false)}
				>
					<PanelRightClose className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);

	const footer = (
		<div className="flex flex-col gap-2">
			<div className="relative w-full">
				<Textarea
					value={question}
					onChange={(event) => setQuestion(event.target.value)}
					placeholder="Ask about gaps, HRSA prep, or PBC evidence…"
					aria-label="Ask about gaps, HRSA prep, or PBC evidence"
					rows={3}
					disabled={loading}
					className={cn(
						"min-h-[5.625rem] w-full resize-none rounded-3xl bg-white text-slate-700 shadow-sm",
						"border-[0.25px] border-slate-300! px-4! pb-14! pt-3.5! pe-14!",
						"placeholder:text-slate-400 focus-visible:border-[#078FAB]! focus-visible:ring-[#078FAB]",
					)}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							handleSend();
						}
					}}
				/>
				<button
					type="button"
					onClick={handleSend}
					disabled={loading || !question.trim()}
					aria-label="Send"
					className={cn(
						"absolute z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white shadow-md transition-opacity duration-200",
						"disabled:pointer-events-none disabled:opacity-50",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
					)}
					style={{
						bottom: 12,
						right: 12,
						left: "auto",
						backgroundImage:
							"linear-gradient(to right, #00c1cb, #078fab, #0e638f, #11487d, #162768)",
					}}
				>
					{loading ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<Send className="h-4 w-4" />
					)}
				</button>
			</div>
			<p className="w-full text-center text-xs text-slate-500">
				CAALM can make mistakes. Double-check replies.
			</p>
		</div>
	);

	return (
		<AssistantPreviewSheetShell
			open={open}
			onOpenChange={onOpenChange}
			title="Readiness assistant"
			header={header}
			footer={footer}
			className="sm:max-w-xl"
		>
			<div className="space-y-4">
				{messages.length === 0 && !loading ? (
					<div className="space-y-6 py-6">
						<div className="text-center">
							<div className="mb-4 flex justify-center">
								<AssistantAvatar size="hero" alt="" />
							</div>
							<p className="text-xl font-bold sidebar-gradient-text">
								Readiness assistant
							</p>
							<p className="mt-1 text-sm text-slate-600">
								Explains readiness gaps for HRSA OSV, child-welfare monitoring,
								and financial PBC prep.
							</p>
						</div>
						<div className="flex justify-center">
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="cursor-pointer"
								onClick={() => void runAnalyze()}
								disabled={loading}
							>
								<Play className="h-4 w-4" />
								Run auto-summary
							</Button>
						</div>
					</div>
				) : null}

				{messages.map((message, index) => (
					<div
						key={`${message.role}-${index}`}
						className={cn(
							"flex gap-2",
							message.role === "user" ? "justify-end" : "justify-start",
						)}
					>
						{message.role === "assistant" ? (
							<AssistantAvatar size="md" />
						) : null}
						<div
							className={cn(
								"text-sm",
								message.role === "user"
									? "max-w-[85%] text-white"
									: message.structured
										? "w-full text-slate-700"
										: "max-w-[85%] rounded-2xl border border-slate-200/80 bg-white/60 px-3 py-2 text-slate-700",
							)}
							style={
								message.role === "user"
									? {
											padding: "10px 14px",
											borderRadius: "16px 4px 16px 16px",
											background: "linear-gradient(90deg, #078fab, #11487d)",
											lineHeight: "20px",
										}
									: undefined
							}
						>
							{message.role === "assistant" ? (
								message.structured ? (
									<StructuredSummaryMessage
										data={message.structured}
										content={message.content}
										onRegenerate={
											index === 0 ? () => void runAnalyze() : undefined
										}
									/>
								) : (
									<ReadinessAssistantMessage content={message.content} />
								)
							) : (
								message.content
							)}
							{message.citations?.length && !message.structured ? (
								<div className="mt-2 border-t border-blue-100 pt-2">
									<p className="caption text-slate-500">
										Based on these records
									</p>
									<div className="mt-1 flex flex-wrap gap-1">
										{message.citations.map((citation) => (
											<Link
												key={citation.id}
												href={citation.href}
												className="rounded-md border border-slate-200 bg-white px-2 py-px text-xs text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#078FAB]"
											>
												{citation.title}
											</Link>
										))}
									</div>
								</div>
							) : null}
						</div>
					</div>
				))}

				{loading ? <AssistantThinkingIndicator /> : null}

				{messages.length > 0 ? (
					<div className="flex items-center justify-center border-b border-slate-200 pb-3">
						<span className="caption text-center text-slate-500">
							{summaryAt
								? `Summary generated ${new Date(summaryAt).toLocaleString(
										"en-US",
										{
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "2-digit",
										},
									)}`
								: ""}
						</span>
					</div>
				) : null}

				{DEFAULT_SUGGESTIONS.length ? (
					<div className="space-y-2">
						<p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
							Ask Next
						</p>
						<div className="flex flex-col gap-2">
							{DEFAULT_SUGGESTIONS.map((item) => (
								<button
									key={item}
									type="button"
									className="cursor-pointer rounded-full border border-slate-200 bg-white/50 px-3 py-1.5 text-left text-xs text-slate-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
									onClick={() => void ask(item)}
									disabled={loading}
								>
									{item}
								</button>
							))}
						</div>
					</div>
				) : null}

				<div ref={endRef} />
			</div>
		</AssistantPreviewSheetShell>
	);
}
