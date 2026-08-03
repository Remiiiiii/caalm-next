import { getFileType } from "@/lib/utils";

export type FilePreviewKind = "image" | "video" | "audio" | "pdf" | "document";

const IMAGE_EXTENSIONS = new Set([
	"jpg",
	"jpeg",
	"png",
	"gif",
	"bmp",
	"svg",
	"webp",
]);
const VIDEO_EXTENSIONS = new Set(["mp4", "avi", "mov", "mkv", "webm"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "flac"]);

function normalizeExtension(value?: string): string {
	if (!value) return "";
	return value.toLowerCase().replace(/^\./, "");
}

export function getFilePreviewKind(input: {
	name?: string;
	type?: string;
	extension?: string;
}): FilePreviewKind {
	const type = (input.type || "").toLowerCase();
	const fromName = input.name ? getFileType(input.name).extension : "";
	const extension = normalizeExtension(input.extension) || fromName;

	if (type === "image" || IMAGE_EXTENSIONS.has(extension)) return "image";
	if (type === "video" || VIDEO_EXTENSIONS.has(extension)) return "video";
	if (type === "audio" || AUDIO_EXTENSIONS.has(extension)) return "audio";
	if (type === "pdf" || extension === "pdf") return "pdf";

	return "document";
}

export function usesMediaPreview(kind: FilePreviewKind): boolean {
	return (
		kind === "image" || kind === "video" || kind === "audio" || kind === "pdf"
	);
}

export function getVideoMimeType(extension: string): string {
	switch (normalizeExtension(extension)) {
		case "webm":
			return "video/webm";
		case "mov":
			return "video/quicktime";
		case "avi":
			return "video/x-msvideo";
		case "mkv":
			return "video/x-matroska";
		default:
			return "video/mp4";
	}
}

export function getAudioMimeType(extension: string): string {
	switch (normalizeExtension(extension)) {
		case "wav":
			return "audio/wav";
		case "ogg":
			return "audio/ogg";
		case "flac":
			return "audio/flac";
		default:
			return "audio/mpeg";
	}
}
