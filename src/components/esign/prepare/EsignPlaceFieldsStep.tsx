"use client";

import { Calendar, Check, ChevronDown, Mail, PenLine, Type, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { getSignerColorWay } from "@/lib/esign/signer-colors";
import type { EsignFieldType, EsignRecipient } from "@/lib/esign/types";
import { cn } from "@/lib/utils";

export const ESIGN_FIELD_DRAG_TYPE = "application/x-esign-field-type";

const PALETTE: Array<{
	type: EsignFieldType;
	label: string;
	hint: string;
	icon: typeof PenLine;
}> = [
	{ type: "signature", label: "Signature", hint: "Signature", icon: PenLine },
	{ type: "email", label: "Email", hint: "Email", icon: Mail },
	{ type: "name", label: "Name", hint: "Name", icon: User },
	{ type: "date", label: "Date", hint: "Date", icon: Calendar },
	{ type: "text", label: "Text", hint: "Custom Text", icon: Type },
];

type DragPreview = {
	type: EsignFieldType;
	label: string;
	x: number;
	y: number;
};

function hideNativeDragGhost(dataTransfer: DataTransfer) {
	const ghost = document.createElement("div");
	ghost.style.width = "1px";
	ghost.style.height = "1px";
	ghost.style.opacity = "0";
	ghost.style.position = "fixed";
	ghost.style.top = "-1000px";
	ghost.style.pointerEvents = "none";
	document.body.appendChild(ghost);
	dataTransfer.setDragImage(ghost, 0, 0);
	window.setTimeout(() => ghost.remove(), 0);
}

export function EsignPlaceFieldsStep({
	signers,
	selectedSignerId,
	onSelectSigner,
	selectedType,
	onSelectType,
}: {
	signers: EsignRecipient[];
	selectedSignerId: string;
	onSelectSigner: (id: string) => void;
	selectedType: EsignFieldType | null;
	onSelectType: (type: EsignFieldType) => void;
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
	const draggingRef = useRef(false);
	const selected = signers.find((s) => s.id === selectedSignerId);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return signers;
		return signers.filter(
			(s) =>
				s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
		);
	}, [query, signers]);

	useEffect(() => {
		if (!dragPreview) return;
		const move = (event: DragEvent) => {
			if (!draggingRef.current) return;
			// clientX/Y are 0 on some dragend events — ignore those.
			if (event.clientX === 0 && event.clientY === 0) return;
			setDragPreview((current) =>
				current
					? { ...current, x: event.clientX, y: event.clientY }
					: current,
			);
		};
		const end = () => {
			draggingRef.current = false;
			setDragPreview(null);
		};
		window.addEventListener("drag", move);
		window.addEventListener("dragover", move);
		window.addEventListener("dragend", end);
		window.addEventListener("drop", end);
		return () => {
			window.removeEventListener("drag", move);
			window.removeEventListener("dragover", move);
			window.removeEventListener("dragend", end);
			window.removeEventListener("drop", end);
		};
	}, [dragPreview]);

	const PreviewIcon = dragPreview
		? PALETTE.find((item) => item.type === dragPreview.type)?.icon || PenLine
		: PenLine;
	const selectedColors = selectedSignerId
		? getSignerColorWay(selectedSignerId, signers)
		: null;

	return (
		<div className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold sidebar-gradient-text">
					Add fields
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Choose a signer, then drag a stamp onto the document. Drag placed
					fields to move them.
				</p>
			</div>
			<div className="relative">
				<button
					type="button"
					className="flex w-full items-center justify-between gap-2 rounded-md border-[0.25px] border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700"
					aria-expanded={open}
					aria-haspopup="listbox"
					onClick={() => setOpen((v) => !v)}
				>
					<span className="flex min-w-0 items-center gap-2 truncate">
						{selectedColors ? (
							<span
								className="h-2.5 w-2.5 shrink-0 rounded-full"
								style={{ backgroundColor: selectedColors.accent }}
								aria-hidden
							/>
						) : null}
						<span className="min-w-0 truncate">
							{selected
								? `${selected.name} (${selected.email})`
								: "Select a signer"}
						</span>
					</span>
					<ChevronDown
						className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
							open ? "rotate-180" : ""
						}`}
						aria-hidden
					/>
				</button>
				{open ? (
					<div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md">
						<div className="p-2">
							<Input
								className="border-[0.25px] border-slate-300"
								placeholder="Search signers"
								value={query}
								onChange={(e) => setQuery(e.target.value)}
							/>
						</div>
						<p className="px-3 pb-1 text-xs font-medium text-slate-500">
							Signers
						</p>
						{filtered.length === 0 ? (
							<p className="px-3 pb-3 text-xs text-slate-500">
								No recipients with this role
							</p>
						) : (
							filtered.map((signer) => {
								const colors = getSignerColorWay(signer.id, signers);
								const isSelected = signer.id === selectedSignerId;
								return (
									<button
										key={signer.id}
										type="button"
										className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-200"
										style={{
											backgroundColor: isSelected ? colors.fill : undefined,
											color: colors.text,
										}}
										onMouseEnter={(event) => {
											event.currentTarget.style.backgroundColor =
												colors.fillSelected;
										}}
										onMouseLeave={(event) => {
											event.currentTarget.style.backgroundColor = isSelected
												? colors.fill
												: "transparent";
										}}
										onClick={() => {
											onSelectSigner(signer.id);
											setOpen(false);
										}}
									>
										<span className="flex min-w-0 items-center gap-2 truncate">
											<span
												className="h-2.5 w-2.5 shrink-0 rounded-full"
												style={{ backgroundColor: colors.accent }}
												aria-hidden
											/>
											<span className="truncate">
												{signer.name} ({signer.email})
											</span>
										</span>
										{isSelected ? (
											<Check
												className="h-4 w-4 shrink-0"
												style={{ color: colors.accent }}
											/>
										) : null}
									</button>
								);
							})
						)}
					</div>
				) : null}
			</div>
			<div className="space-y-2">
				{PALETTE.map((item) => {
					const Icon = item.icon;
					const active = selectedType === item.type;
					return (
						<button
							key={item.type}
							type="button"
							draggable
							className={`flex w-full cursor-grab items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all duration-200 active:cursor-grabbing ${
								active
									? "border-[#0f5384] bg-blue-50 text-[#0f5384] shadow-sm"
									: "border-slate-200 bg-white hover:border-[#0f5384] hover:bg-blue-50"
							}`}
							onClick={() => onSelectType(item.type)}
							onDragStart={(event) => {
								onSelectType(item.type);
								event.dataTransfer.setData(ESIGN_FIELD_DRAG_TYPE, item.type);
								event.dataTransfer.effectAllowed = "copy";
								hideNativeDragGhost(event.dataTransfer);
								draggingRef.current = true;
								setDragPreview({
									type: item.type,
									label: item.label,
									x: event.clientX,
									y: event.clientY,
								});
							}}
						>
							<Icon className="h-5 w-5 text-[#0f5384]" />
							<div>
								<p className="text-sm font-medium text-slate-700">{item.label}</p>
								<p className="text-xs text-slate-500">{item.hint}</p>
							</div>
						</button>
					);
				})}
			</div>
			{dragPreview ? (
				<div
					className={cn(
						"pointer-events-none fixed z-[100000] flex min-w-[140px] items-center gap-1.5 rounded border-l-4 px-2 py-1.5 shadow-sm",
					)}
					style={{
						left: dragPreview.x + 12,
						top: dragPreview.y + 12,
						borderLeftColor: selectedColors?.accent || "#0f5384",
						backgroundColor: selectedColors?.fill || "rgba(15, 83, 132, 0.12)",
						color: selectedColors?.text || "#0f5384",
					}}
					aria-hidden
				>
					<PreviewIcon
						className="h-3.5 w-3.5 shrink-0"
						style={{ color: selectedColors?.text || "#0f5384" }}
					/>
					<span
						className="truncate text-xs font-medium"
						style={{ color: selectedColors?.text || "#0f5384" }}
					>
						{dragPreview.label}
					</span>
				</div>
			) : null}
		</div>
	);
}
