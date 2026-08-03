import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
export const parseStringify = (value: unknown) =>
	JSON.parse(JSON.stringify(value));

export const convertFileToUrl = (file: File) => URL.createObjectURL(file);

export const convertFileSize = ({
	sizeInBytes,
	digits = 1,
}: {
	sizeInBytes: number | null | undefined;
	digits?: number;
}) => {
	// Validate that sizeInBytes is a valid number
	if (
		sizeInBytes === null ||
		sizeInBytes === undefined ||
		Number.isNaN(Number(sizeInBytes)) ||
		sizeInBytes < 0
	) {
		return "Unknown size";
	}

	const size = Number(sizeInBytes);

	if (size < 1024) {
		return `${size} Bytes`;
	} else if (size < 1024 * 1024) {
		const sizeInKB = size / 1024;
		return `${sizeInKB.toFixed(digits)} KB`;
	} else if (size < 1024 * 1024 * 1024) {
		const sizeInMB = size / (1024 * 1024);
		return `${sizeInMB.toFixed(digits)} MB`;
	} else {
		const sizeInGB = size / (1024 * 1024 * 1024);
		return `${sizeInGB.toFixed(digits)} GB`;
	}
};

export const calculatePercentage = (
	sizeInBytes: number,
	limitBytes?: number,
) => {
	const totalSizeInBytes =
		limitBytes && limitBytes > 0 ? limitBytes : 2 * 1024 * 1024 * 1024;
	const percentage = (sizeInBytes / totalSizeInBytes) * 100;
	return Number(Math.min(percentage, 100).toFixed(2));
};

/** Extensions stored as Appwrite file type `document` (shown on /documents). */
export const DOCUMENT_FILE_EXTENSIONS = [
	"pdf",
	"doc",
	"docx",
	"txt",
	"xls",
	"xlsx",
	"csv",
	"rtf",
	"ods",
	"ppt",
	"odp",
	"md",
	"html",
	"htm",
	"epub",
	"pages",
	"fig",
	"psd",
	"ai",
	"indd",
	"xd",
	"sketch",
	"afdesign",
	"afphoto",
] as const;

export function isDocumentFileExtension(
	extension: string | null | undefined,
): boolean {
	if (!extension) return false;
	return DOCUMENT_FILE_EXTENSIONS.includes(
		extension.toLowerCase() as (typeof DOCUMENT_FILE_EXTENSIONS)[number],
	);
}

export const getFileType = (fileName: string) => {
	const extension = fileName.split(".").pop()?.toLowerCase();

	if (!extension) return { type: "other", extension: "" };

	const documentExtensions = DOCUMENT_FILE_EXTENSIONS;
	const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
	const videoExtensions = ["mp4", "avi", "mov", "mkv", "webm"];
	const audioExtensions = ["mp3", "wav", "ogg", "flac"];

	if (documentExtensions.includes(extension))
		return { type: "document", extension };
	if (imageExtensions.includes(extension)) return { type: "image", extension };
	if (videoExtensions.includes(extension)) return { type: "video", extension };
	if (audioExtensions.includes(extension)) return { type: "audio", extension };

	return { type: "other", extension };
};

export const formatDateTime = (isoString: string | null | undefined) => {
	if (!isoString) return "—";

	const date = new Date(isoString);

	// Get hours and adjust for 12-hour format
	let hours = date.getHours();
	const minutes = date.getMinutes();
	const period = hours >= 12 ? "pm" : "am";

	// Convert hours to 12-hour format
	hours = hours % 12 || 12;

	// Format the time and date parts
	const time = `${hours}:${minutes.toString().padStart(2, "0")}${period}`;
	const day = date.getDate();
	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const month = monthNames[date.getMonth()];

	return ` ${day} ${month}, ${time}`;
};
export const formatDate = (isoString: string | null | undefined) => {
	if (!isoString) return "—";

	let date: Date;

	// Handle date-only strings (YYYY-MM-DD) by parsing manually to avoid timezone issues
	if (isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
		// Date-only format: parse manually to use local timezone
		const [year, month, day] = isoString.split("-").map(Number);
		date = new Date(year, month - 1, day);
	} else if (isoString.match(/^\d{4}-\d{2}-\d{2}T/)) {
		// ISO string with time: extract date part and parse as local date to avoid timezone shifts
		const dateOnlyMatch = isoString.match(/^(\d{4})-(\d{2})-(\d{2})T/);
		if (dateOnlyMatch) {
			const [, year, month, day] = dateOnlyMatch;
			date = new Date(
				parseInt(year, 10),
				parseInt(month, 10) - 1,
				parseInt(day, 10),
			);
		} else {
			date = new Date(isoString);
		}
	} else {
		// Fallback: use standard parsing
		date = new Date(isoString);
	}

	// Get hours and adjust for 12-hour format
	// let hours = date.getHours();
	// const minutes = date.getMinutes();
	// const period = hours >= 12 ? 'pm' : 'am';

	// Convert hours to 12-hour format
	// hours = hours % 12 || 12;

	// Format the time and date parts
	// const time = `${hours}:${minutes.toString().padStart(2, '0')}${period}`;
	const day = date.getDate();
	const monthNames = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];
	const month = monthNames[date.getMonth()];
	const year = date.getFullYear();

	return `${day} ${month}, ${year}`; // ${time},
};

export const getFileIcon = ({
	extension,
	type,
}: {
	extension: string | undefined;
	type: FileType | string;
}) => {
	switch (extension) {
		// Document
		case "pdf":
			return "/assets/icons/file-pdf.svg";
		case "doc":
			return "/assets/icons/file-doc.svg";
		case "docx":
			return "/assets/icons/file-docx.svg";
		case "csv":
			return "/assets/icons/file-csv.svg";
		case "txt":
			return "/assets/icons/file-txt.svg";
		case "xls":
		case "xlsx":
			return "/assets/icons/file-document.svg";
		// Image
		case "svg":
			return "/assets/icons/file-image.svg";
		// Video
		case "mkv":
		case "mov":
		case "avi":
		case "wmv":
		case "mp4":
		case "flv":
		case "webm":
		case "m4v":
		case "3gp":
			return "/assets/icons/file-video.svg";
		// Audio
		case "mp3":
		case "mpeg":
		case "wav":
		case "aac":
		case "flac":
		case "ogg":
		case "wma":
		case "m4a":
		case "aiff":
		case "alac":
			return "/assets/icons/file-audio.svg";

		default:
			switch (type) {
				case "image":
					return "/assets/icons/file-image.svg";
				case "document":
					return "/assets/icons/file-document.svg";
				case "video":
					return "/assets/icons/file-video.svg";
				case "audio":
					return "/assets/icons/file-audio.svg";
				default:
					return "/assets/icons/file-other.svg";
			}
	}
};

// APPWRITE URL UTILS
// Construct appwrite file URL - https://appwrite.io/docs/apis/rest#images
export const constructFileUrl = (bucketFileId: string) => {
	return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET}/files/${bucketFileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
};

export const constructDownloadUrl = (bucketFileId: string) => {
	return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET}/files/${bucketFileId}/download?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
};

/**
 * Construct profile picture URL from profileImageId
 * Returns null if profileImageId is not provided
 */
export const getProfilePictureUrl = (
	profileImageId: string | null | undefined,
): string | null => {
	if (!profileImageId) {
		return null;
	}

	const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
	const bucketId = process.env.NEXT_PUBLIC_APPWRITE_PROFILE_PICTURES_BUCKET;
	const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;

	if (!endpoint || !bucketId || !projectId) {
		console.warn("Profile picture configuration missing");
		return null;
	}

	return `${endpoint}/storage/buckets/${bucketId}/files/${profileImageId}/view?project=${projectId}`;
};

// DASHBOARD UTILS
interface FileTypeSummary {
	size: number;
	latestDate: string;
}

interface TotalSpace {
	document: FileTypeSummary;
	image: FileTypeSummary;
	video: FileTypeSummary;
	audio: FileTypeSummary;
	other: FileTypeSummary;
}

export const getUsageSummary = (totalSpace: TotalSpace) => {
	return [
		{
			title: "Documents",
			size: totalSpace.document.size,
			latestDate: totalSpace.document.latestDate,
			icon: "/assets/icons/file-document-light.svg",
			url: "/documents",
		},
		{
			title: "Images",
			size: totalSpace.image.size,
			latestDate: totalSpace.image.latestDate,
			icon: "/assets/icons/file-image-light.svg",
			url: "/images",
		},
		{
			title: "Media",
			size: totalSpace.video.size + totalSpace.audio.size,
			latestDate:
				totalSpace.video.latestDate > totalSpace.audio.latestDate
					? totalSpace.video.latestDate
					: totalSpace.audio.latestDate,
			icon: "/assets/icons/file-video-light.svg",
			url: "/media",
		},
		{
			title: "Others",
			size: totalSpace.other.size,
			latestDate: totalSpace.other.latestDate,
			icon: "/assets/icons/file-other-light.svg",
			url: "/others",
		},
	];
};

export function getFileTypesParams(type: string): FileType[] {
	if (!type || type.toLowerCase() === "uploads") {
		// All non-document library files; documents live on /documents
		return ["image", "video", "audio", "other"];
	}
	switch (type.toLowerCase()) {
		case "images":
			return ["image"];
		case "documents":
			return ["document"];
		case "media":
			return ["video", "audio"];
		case "others":
			return ["other"];
		default:
			return ["document"];
	}
}

export function getFileLibraryPageTitle(type: string): string {
	const normalized = (type || "uploads").toLowerCase();
	if (normalized === "uploads") return "Files";
	return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// ROLE UTILS
export const capitalizeRole = (role: string): string => {
	if (!role) return "";

	// Handle special cases first
	switch (role.toLowerCase()) {
		case "head_admin":
			return "Executive";
		case "hr_admin":
			return "Admin";
		case "manager":
			return "Manager";
		case "executive":
			return "Executive";
		case "admin":
			return "Admin";
		default:
			// Capitalize first letter for any other role
			return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
	}
};
