export function getFileLibraryEmptyState(type: string): {
	alt: string;
	message: string;
} {
	const normalized = (type || "uploads").toLowerCase();
	switch (normalized) {
		case "media":
			return {
				alt: "No media files uploaded yet",
				message: "No media files uploaded yet",
			};
		case "documents":
			return {
				alt: "No documents uploaded yet",
				message: "No documents uploaded yet",
			};
		case "images":
			return {
				alt: "No images uploaded yet",
				message: "No images uploaded yet",
			};
		case "others":
			return {
				alt: "No other files uploaded yet",
				message: "No other files uploaded yet",
			};
		case "uploads":
			return {
				alt: "No files uploaded yet",
				message: "No files uploaded yet",
			};
		default:
			return {
				alt: `No ${normalized} uploaded yet`,
				message: `No ${normalized} uploaded yet`,
			};
	}
}
