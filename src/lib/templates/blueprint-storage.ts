import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { CONTRACT_BLUEPRINTS_BUCKET_ID } from "./blueprint-catalog";

export type DraftArtifactKind = "draft" | "preview" | "final";

function blueprintsBucket(): string {
	return (
		appwriteConfig.contractBlueprintsBucketId || CONTRACT_BLUEPRINTS_BUCKET_ID
	);
}

function artifactName(sessionId: string, kind: DraftArtifactKind): string {
	if (kind === "preview") return `${sessionId}-preview.pdf`;
	if (kind === "final") return `${sessionId}-final.pdf`;
	return `${sessionId}-draft.docx`;
}

export function localBlueprintSourcePath(fileName: string): string {
	return path.join(os.homedir(), "Downloads", "files", "updated", fileName);
}

export async function loadBlueprintSource(input: {
	sourceFileId: string;
	fileName: string;
}): Promise<Buffer> {
	try {
		return await downloadBlueprintFile(input.sourceFileId);
	} catch {
		const local = localBlueprintSourcePath(input.fileName);
		if (fs.existsSync(local)) return fs.readFileSync(local);
		throw new Error("Blueprint file is not available yet");
	}
}

async function asDownloadBuffer(downloaded: unknown): Promise<Buffer> {
	if (Buffer.isBuffer(downloaded)) return downloaded;
	if (downloaded instanceof ArrayBuffer) return Buffer.from(downloaded);
	if (downloaded instanceof Uint8Array) return Buffer.from(downloaded);
	if (
		downloaded &&
		typeof downloaded === "object" &&
		"arrayBuffer" in downloaded &&
		typeof (downloaded as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer ===
			"function"
	) {
		return Buffer.from(
			await (downloaded as { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer(),
		);
	}
	throw new Error("Could not read the blueprint file from storage");
}

export async function downloadBlueprintFile(fileId: string): Promise<Buffer> {
	const { storage } = await createAdminClient();
	const downloaded = await storage.getFileDownload({
		bucketId: blueprintsBucket(),
		fileId,
	});
	return asDownloadBuffer(downloaded);
}

function wizardArtifactFileId(
	sessionId: string,
	kind: DraftArtifactKind,
): string {
	return `wd${sessionId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20)}${kind}`.slice(
		0,
		36,
	);
}

export async function uploadWizardDraftArtifact(input: {
	sessionId: string;
	kind: DraftArtifactKind;
	fileName?: string;
	buffer: Buffer;
}): Promise<string> {
	const { storage } = await createAdminClient();
	const fileId = wizardArtifactFileId(input.sessionId, input.kind);
	const name = input.fileName || artifactName(input.sessionId, input.kind);
	try {
		await storage.deleteFile({
			bucketId: blueprintsBucket(),
			fileId,
		});
	} catch {
		// First save for this session/kind.
	}
	const created = await storage.createFile({
		bucketId: blueprintsBucket(),
		fileId,
		file: InputFile.fromBuffer(input.buffer, name),
	});
	return created.$id;
}

export async function deleteWizardDraftArtifacts(sessionId: string): Promise<void> {
	const { storage } = await createAdminClient();
	const kinds: DraftArtifactKind[] = ["draft", "preview", "final"];
	await Promise.allSettled(
		kinds.map(async (kind) => {
			try {
				await storage.deleteFile({
					bucketId: blueprintsBucket(),
					fileId: wizardArtifactFileId(sessionId, kind),
				});
			} catch {
				// Artifact may not exist yet.
			}
		}),
	);
}

export async function uploadNamedBlueprintFile(input: {
	fileId: string;
	fileName: string;
	buffer: Buffer;
}): Promise<string> {
	const { storage } = await createAdminClient();
	try {
		await storage.deleteFile({
			bucketId: blueprintsBucket(),
			fileId: input.fileId,
		});
	} catch {
		// Seed overwrite is optional.
	}
	const created = await storage.createFile({
		bucketId: blueprintsBucket(),
		fileId: input.fileId,
		file: InputFile.fromBuffer(input.buffer, input.fileName),
	});
	return created.$id;
}

