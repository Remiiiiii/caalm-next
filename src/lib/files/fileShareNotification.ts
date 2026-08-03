import { getFileType } from "@/lib/utils";

export function getFileShareNotificationTitle(input: {
	name?: string;
	type?: string;
	extension?: string;
}): string {
	const appwriteType = (input.type || "").toLowerCase();
	const fromName = input.name
		? getFileType(input.name)
		: { type: "other" as const, extension: "" };
	const fileKind = ["image", "video", "audio", "document"].includes(
		appwriteType,
	)
		? appwriteType
		: fromName.type;

	switch (fileKind) {
		case "image":
			return "Image shared with you";
		case "video":
		case "audio":
			return "Media shared with you";
		case "document":
			return "Document shared with you";
		default:
			return "File shared with you";
	}
}

export function isFileShareNotification(
	notification: Pick<{ type?: string; title?: string }, "type" | "title">,
): boolean {
	if (
		notification.type === "file_shared" ||
		notification.type === "file-shared"
	) {
		return true;
	}
	const title = notification.title || "";
	return / shared with you$/i.test(title);
}

export function getFileShareViewActionText(input: {
	name?: string;
	type?: string;
	extension?: string;
}): string {
	const appwriteType = (input.type || "").toLowerCase();
	const fromName = input.name
		? getFileType(input.name)
		: { type: "other" as const, extension: "" };
	const fileKind = ["image", "video", "audio", "document"].includes(
		appwriteType,
	)
		? appwriteType
		: fromName.type;

	switch (fileKind) {
		case "image":
			return "View Image";
		case "video":
			return "View Video";
		case "audio":
			return "View Audio";
		default:
			return "View Document";
	}
}
