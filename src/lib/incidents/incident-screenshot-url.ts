/**
 * Client-safe: only reads NEXT_PUBLIC_* env vars, no server SDK imports.
 * Used by the IT incidents page to render thumbnails/full screenshots.
 */
export function incidentScreenshotUrl(fileId: string): string {
	const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
	const bucketId = process.env.NEXT_PUBLIC_APPWRITE_SCREENSHOTS_BUCKET;
	const project = process.env.NEXT_PUBLIC_APPWRITE_PROJECT;
	return `${endpoint}/storage/buckets/${bucketId}/files/${fileId}/view?project=${project}`;
}
