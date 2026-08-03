"use client";

import { FileText, GripVertical, Loader2 } from "lucide-react";
import {
	type DragEvent,
	type MouseEvent,
	useCallback,
	useEffect,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { isDemoMode } from "@/lib/config/demo-mode";
import { cn } from "@/lib/utils";
import { beginDemoSampleDrag, endDemoSampleDrag } from "./demoSampleDrag";

export type DemoSampleDocument = {
	/** Public URL under /public */
	url: string;
	fileName: string;
	label: string;
	description: string;
};

type DemoSampleDocumentDropProps = {
	sample: DemoSampleDocument;
	/** Called when the tester clicks “Use sample” (drag fallback). */
	onUseSample: (file: File) => void;
	disabled?: boolean;
	className?: string;
};

async function fetchSampleAsFile(sample: DemoSampleDocument): Promise<File> {
	const response = await fetch(sample.url);
	if (!response.ok) {
		throw new Error(`Failed to load demo sample (${response.status})`);
	}
	const blob = await response.blob();
	return new File([blob], sample.fileName, {
		type: "application/pdf",
		lastModified: Date.now(),
	});
}

/**
 * Demo-only: draggable sample PDF for testing upload dropzones.
 * Hidden unless NEXT_PUBLIC_APP_MODE / APP_MODE is "demo".
 */
export function DemoSampleDocumentDrop({
	sample,
	onUseSample,
	disabled = false,
	className,
}: DemoSampleDocumentDropProps) {
	const [file, setFile] = useState<File | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);

	useEffect(() => {
		if (!isDemoMode()) return;

		let cancelled = false;
		setLoading(true);
		setError(null);

		fetchSampleAsFile(sample)
			.then((loaded) => {
				if (!cancelled) setFile(loaded);
			})
			.catch((err) => {
				if (!cancelled) {
					setError(
						err instanceof Error ? err.message : "Could not load sample file",
					);
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
			endDemoSampleDrag();
		};
	}, [sample.url, sample.fileName]);

	const handleDragStart = useCallback(
		(event: DragEvent<HTMLDivElement>) => {
			if (!file || disabled) {
				event.preventDefault();
				return;
			}
			setDragging(true);
			beginDemoSampleDrag(file, event.dataTransfer);
		},
		[disabled, file],
	);

	const handleDragEnd = useCallback(() => {
		setDragging(false);
		// Drop capture consumes first; clear leftovers from cancelled drags.
		window.setTimeout(() => {
			endDemoSampleDrag();
		}, 500);
	}, []);

	const handleUseClick = useCallback(
		(event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();
			if (!file || disabled) return;
			onUseSample(file);
		},
		[disabled, file, onUseSample],
	);

	if (!isDemoMode()) return null;

	return (
		<div
			className={cn(
				"rounded-xl border border-dashed border-[#0f5384]/35 bg-blue-50/60 p-4",
				className,
			)}
		>
			<p className="text-sm font-medium text-slate-800">
				Demo test file — drag into the drop zone above
			</p>
			<ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-slate-600">
				<li>Grab the sample card below (grip handle).</li>
				<li>Drop it onto the dashed upload area.</li>
				<li>
					Or click <span className="font-medium">Use sample</span> to load it
					immediately.
				</li>
			</ol>

			<div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
				<div
					draggable={Boolean(file) && !disabled && !loading}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					className={cn(
						"flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 transition-all duration-200",
						file && !disabled
							? "cursor-grab active:cursor-grabbing"
							: "cursor-not-allowed opacity-70",
						dragging && "ring-2 ring-[#0f5384]/25",
					)}
				>
					<GripVertical
						className="h-5 w-5 shrink-0 text-slate-400"
						aria-hidden
					/>
					<FileText className="h-8 w-8 shrink-0 text-[#0f5384]" aria-hidden />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-slate-900">
							{sample.label}
						</p>
						<p className="truncate text-xs text-slate-500">
							{sample.description}
						</p>
						{loading ? (
							<p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
								<Loader2 className="h-3 w-3 animate-spin" />
								Loading sample…
							</p>
						) : null}
						{error ? <p className="mt-1 text-xs text-red">{error}</p> : null}
					</div>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!file || disabled || loading}
					onClick={handleUseClick}
					className="primary-btn shrink-0 px-3"
				>
					Use sample
				</Button>
			</div>
		</div>
	);
}

export const DEMO_CONTRACT_SAMPLE: DemoSampleDocument = {
	url: "/assets/demo/Government_Nonprofit_Grant_Agreement.pdf",
	fileName: "Government_Nonprofit_Grant_Agreement.pdf",
	label: "Government Nonprofit Grant Agreement",
	description: "Sample PDF for contract upload testing",
};

export const DEMO_LICENSE_SAMPLE: DemoSampleDocument = {
	url: "/assets/demo/Nonprofit_Residential_License_v2.pdf",
	fileName: "Nonprofit_Residential_License_v2.pdf",
	label: "Nonprofit Residential License v2",
	description: "Sample PDF for license upload testing",
};
