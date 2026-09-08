"use client";

import { BookMarked, FileText } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { NegotiationMetaCard } from "@/components/contracts/negotiation/NegotiationMetaCard";
import {
	NegotiationRedlineText,
	redlineAuthorLabel,
} from "@/components/contracts/negotiation/NegotiationRedlineText";
import type { NegotiationComment } from "@/lib/contracts/negotiation/comments.service";
import { renderNegotiationInlineText } from "@/lib/contracts/negotiation/display-text";
import type { NegotiationDocumentModel } from "@/lib/contracts/negotiation/document-model";
import {
	buildParagraphMarkers,
	buildRedlineSegments,
} from "@/lib/contracts/negotiation/redline-render";
import { cn } from "@/lib/utils";

export function negotiationParagraphDomId(start: number): string {
	return `nego-para-${start}`;
}

interface NegotiationDocumentPaneProps {
	model: NegotiationDocumentModel;
	comments: NegotiationComment[];
	selectedStart: number;
	pinnedClauseId?: string;
	showLineageLinks?: boolean;
	onOpenPdf?: () => void;
	onSelectParagraph: (
		start: number,
		end: number,
		text: string,
		redlineAllowed: boolean,
	) => void;
	onFocusComment?: (commentId: string) => void;
	/** Fired when the visible clause changes while scrolling the document pane. */
	onActiveClauseChange?: (clauseId: string) => void;
}

export function NegotiationDocumentPane({
	model,
	comments,
	selectedStart,
	pinnedClauseId,
	showLineageLinks = true,
	onOpenPdf,
	onSelectParagraph,
	onFocusComment,
	onActiveClauseChange,
}: NegotiationDocumentPaneProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const markers = buildParagraphMarkers(model.negotiableParagraphs, comments);
	const markerByStart = new Map(
		markers.map((marker) => [marker.paragraphStart, marker]),
	);

	// Keep the left TOC in sync without overriding a clause the user just clicked.
	useEffect(() => {
		const root = scrollRef.current;
		if (!root || !onActiveClauseChange) return;
		const sectionIds = model.clauses
			.filter((clause) => clause.index > 0)
			.map((clause) => clause.id);
		if (sectionIds.length === 0) return;

		const syncActiveClause = () => {
			if (pinnedClauseId) return;
			const rootTop = root.getBoundingClientRect().top;
			const activationLine = rootTop + 80;
			let activeId = sectionIds[0];
			for (const id of sectionIds) {
				const node = root.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
				if (!node) continue;
				if (node.getBoundingClientRect().top <= activationLine) {
					activeId = id;
				} else {
					break;
				}
			}
			onActiveClauseChange(activeId);
		};

		root.addEventListener("scroll", syncActiveClause, { passive: true });
		syncActiveClause();
		return () => root.removeEventListener("scroll", syncActiveClause);
	}, [model.clauses, onActiveClauseChange, pinnedClauseId]);

	return (
		<section className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100">
			<div
				ref={scrollRef}
				className="mx-auto w-full max-w-3xl min-h-0 flex-1 overflow-y-auto px-4 py-6"
			>
				<div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
					<div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
						<FileText className="h-3.5 w-3.5 shrink-0 text-[#0f5384]" />
						<span>Viewing the negotiation text snapshot.</span>
						{onOpenPdf ? (
							<button
								type="button"
								onClick={onOpenPdf}
								className="cursor-pointer font-semibold text-[#078FAB] transition-colors duration-200 hover:text-[#0f5384] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
							>
								Open PDF
							</button>
						) : (
							<span className="font-semibold text-[#078FAB]">Open PDF</span>
						)}
						<span>for the formatted, letterheaded version.</span>
					</div>
					<NegotiationMetaCard entries={model.metadata} />
					{model.title ? (
						<h2 className="mb-6 text-center font-['Times_New_Roman',Times,serif] text-[22px] font-bold tracking-wide text-slate-900 uppercase">
							{model.title}
						</h2>
					) : null}
					{model.negotiableParagraphs.length === 0 ? (
						<p className="text-sm text-slate-500">
							{model.metadata.length > 0
								? "No negotiable clause text in this draft yet — only contract facts. Assemble a fuller draft to redline."
								: "No extracted text yet. Upload or assemble a draft to negotiate."}
						</p>
					) : (
						<div className="space-y-8 font-[Georgia,serif]">
							{model.clauses.map((clause) => (
								<section
									key={clause.id}
									id={clause.id}
									className="scroll-mt-4"
								>
									{clause.index > 0 ? (
										<h3 className="mb-2 border-b border-slate-200 pb-1 text-sm font-bold tracking-wide text-[#0f5384] uppercase">
											{clause.index}. {clause.title}
										</h3>
									) : null}
									{clause.sourceNote && model.source !== "docx" ? (
										<p className="mb-2 text-[11px] text-slate-400 italic">
											{clause.sourceNote}
										</p>
									) : null}
									<div className="space-y-2">
										{clause.paragraphs.map((paragraph) => {
											const editableStart =
												paragraph.protectedEnd &&
												paragraph.protectedEnd < paragraph.end
													? paragraph.protectedEnd
													: paragraph.start;
											const selected =
												selectedStart >= paragraph.start &&
												selectedStart < paragraph.end;
											const marker = markerByStart.get(paragraph.start);
											const segments = buildRedlineSegments(
												paragraph,
												comments,
											);
											const hasRedline = segments.some(
												(segment) => segment.kind !== "text",
											);
											const editAuthor = hasRedline
												? redlineAuthorLabel(segments)
												: null;
											return (
												<button
													key={`${paragraph.start}-${paragraph.end}`}
													id={negotiationParagraphDomId(paragraph.start)}
													type="button"
													onClick={() =>
														onSelectParagraph(
															editableStart,
															paragraph.end,
															paragraph.text.slice(
																editableStart - paragraph.start,
															),
															paragraph.redlineAllowed !== false,
														)
													}
													className={cn(
														"w-full cursor-pointer rounded-r-md border-l-2 border-transparent px-2 py-1.5 text-left text-[15px] leading-7 text-slate-800 transition-colors duration-200 whitespace-pre-wrap",
														paragraph.isBullet ? "pl-5" : "",
														selected
															? "border-orange bg-orange/10"
															: marker
																? "border-orange/60 bg-orange/5 hover:bg-orange/10"
																: "hover:bg-blue-50",
													)}
												>
													{editAuthor ? (
														<span
															className={cn(
																"mb-1.5 inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 text-[11px] font-medium",
																editAuthor === "counterparty"
																	? "border-slate-300 text-slate-700"
																	: "border-[#0f5384]/25 text-[#0f5384]",
															)}
														>
															{marker ? (
																<span
																	role="button"
																	tabIndex={-1}
																	title={`${marker.commentIds.length} open comment${marker.commentIds.length > 1 ? "s" : ""} — view thread`}
																	className={cn(
																		"flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-[9px] font-bold text-white",
																		editAuthor === "counterparty"
																			? "bg-slate-700"
																			: "bg-[#0f5384]",
																	)}
																	onClick={(event) => {
																		event.stopPropagation();
																		onFocusComment?.(marker.commentIds[0]);
																	}}
																>
																	{marker.number}
																</span>
															) : (
																<span
																	className={cn(
																		"flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
																		editAuthor === "counterparty"
																			? "bg-slate-700"
																			: "bg-[#0f5384]",
																	)}
																	aria-hidden
																>
																	•
																</span>
															)}
															Edited by{" "}
															{editAuthor === "counterparty"
																? "counterparty"
																: "internal"}
														</span>
													) : null}
													{hasRedline ? (
														<span className="block">
															<NegotiationRedlineText segments={segments} />
														</span>
													) : (
														renderNegotiationInlineText(paragraph.text)
													)}
													{marker && !editAuthor ? (
														<span
															className="negotiate-comment-marker"
															role="button"
															tabIndex={-1}
															title={`${marker.commentIds.length} open comment${marker.commentIds.length > 1 ? "s" : ""} — view thread`}
															onClick={(event) => {
																event.stopPropagation();
																onFocusComment?.(marker.commentIds[0]);
															}}
														>
															{marker.number}
														</span>
													) : null}
												</button>
											);
										})}
									</div>
								</section>
							))}
						</div>
					)}
					{model.lineage.length > 0 && model.source !== "docx" ? (
						<div className="mt-8 border-t border-slate-200 pt-4">
							<p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
								<BookMarked className="h-3.5 w-3.5" />
								Clause lineage
							</p>
							<div className="flex flex-wrap gap-2">
								{model.lineage.map((entry) => {
									const key = `${entry.title}-${entry.familyId}`;
									const label = `${entry.title}${entry.version ? ` · v${entry.version}` : ""}`;
									const chipClass =
										"inline-block rounded-full border border-blue/20 bg-blue/10 px-2 py-0.5 text-xs font-medium text-blue";
									if (showLineageLinks) {
										return (
											<Link
												key={key}
												href="/contracts/library"
												title="Open clause library"
												className={chipClass}
											>
												{label}
											</Link>
										);
									}
									return (
										<span key={key} className={chipClass}>
											{label}
										</span>
									);
								})}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</section>
	);
}
