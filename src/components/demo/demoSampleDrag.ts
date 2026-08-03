/**
 * Bridges in-page demo sample drags into react-dropzone.
 * Browsers usually won't put a synthetic File into dataTransfer.files,
 * so dropzones read the pending file from here instead.
 */

const DEMO_SAMPLE_MIME = "application/x-caalm-demo-sample";

let pendingDemoSampleFile: File | null = null;

export function beginDemoSampleDrag(file: File, dataTransfer: DataTransfer) {
	pendingDemoSampleFile = file;
	dataTransfer.effectAllowed = "copy";
	dataTransfer.setData("text/plain", file.name);
	dataTransfer.setData(DEMO_SAMPLE_MIME, file.name);
	try {
		dataTransfer.items.add(file);
	} catch {
		// Expected in most browsers — pendingDemoSampleFile is the real source.
	}
}

export function endDemoSampleDrag() {
	pendingDemoSampleFile = null;
}

export function isDemoSampleDrag(dataTransfer?: DataTransfer | null): boolean {
	if (pendingDemoSampleFile) return true;
	if (!dataTransfer) return false;
	return Array.from(dataTransfer.types || []).includes(DEMO_SAMPLE_MIME);
}

export function consumeDemoSampleDragFile(): File | null {
	const file = pendingDemoSampleFile;
	pendingDemoSampleFile = null;
	return file;
}

export function peekDemoSampleDragFile(): File | null {
	return pendingDemoSampleFile;
}

/**
 * Prefer calling this from onDropCapture on the dropzone root.
 * react-dropzone skips drops when dataTransfer has no native "Files" type.
 */
export function handleDemoSampleDropCapture(
	event: Pick<DragEvent, "preventDefault" | "stopPropagation" | "dataTransfer">,
	onFiles: (files: File[]) => void,
): boolean {
	if (!peekDemoSampleDragFile() && !isDemoSampleDrag(event.dataTransfer)) {
		return false;
	}
	const file = consumeDemoSampleDragFile();
	if (!file) return false;
	event.preventDefault();
	event.stopPropagation();
	onFiles([file]);
	return true;
}

export function handleDemoSampleDragOverCapture(
	event: Pick<DragEvent, "preventDefault" | "stopPropagation" | "dataTransfer">,
): boolean {
	if (!peekDemoSampleDragFile() && !isDemoSampleDrag(event.dataTransfer)) {
		return false;
	}
	event.preventDefault();
	event.stopPropagation();
	try {
		event.dataTransfer.dropEffect = "copy";
	} catch {
		// ignore
	}
	return true;
}
