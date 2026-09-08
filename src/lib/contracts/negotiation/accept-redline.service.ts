import { FileService } from "@/lib/api/contracts/services/FileService";
import {
	buildWizardDocx,
	getWizardSessionForContract,
} from "@/lib/templates/wizard.service";
import { applyRedline } from "./comments.logic";
import type { NegotiationComment } from "./comments.service";
import { applyRedlineToDocx } from "./docx-redline";
import {
	type NegotiationSnapshotMetadata,
	negotiationSnapshotFromDocx,
} from "./docx-snapshot";
import {
	polishNegotiationDocx,
	polishNegotiationPlainText,
} from "./print-polish";
import {
	refreshSnapshotMetadata,
	withRefreshedMetadataBlock,
} from "./sync-metadata.logic";
import {
	type ContractDocumentVersion,
	createVersion,
	getVersion,
	listVersions,
	updateVersionBucketFileId,
} from "./versions.service";

function metadataFromSnapshot(text: string): NegotiationSnapshotMetadata[] {
	const entries: NegotiationSnapshotMetadata[] = [];
	for (const line of text.split("\n")) {
		const match = /^\s*-\s+([^:]+):\s*(.+)\s*$/.exec(line);
		if (!match) continue;
		entries.push({ label: match[1].trim(), value: match[2].trim() });
	}
	return entries;
}

/**
 * Ensure the version has a negotiation DOCX in Storage. Old rows only had text.
 */
export async function ensureVersionDocx(input: {
	contractId: string;
	orgId: string;
	version: ContractDocumentVersion;
}): Promise<{ version: ContractDocumentVersion; docx: Buffer }> {
	if (input.version.bucketFileId) {
		const docx = await FileService.downloadFileBufferFromStorage(
			input.version.bucketFileId,
		);
		return { version: input.version, docx };
	}

	const session = await getWizardSessionForContract({
		contractId: input.contractId,
		orgId: input.orgId,
	});
	if (!session?.payload.blueprintId) {
		throw new Error(
			"This negotiation has no stored Word draft yet. Re-submit from the wizard or contact support.",
		);
	}

	const docx = await buildWizardDocx(session.payload, [], input.orgId);
	const bucketFileId = await FileService.uploadFileToStorage(
		docx,
		`contract-${input.contractId.slice(0, 8)}-v${input.version.versionNumber}-negotiation.docx`,
	);
	await updateVersionBucketFileId(input.version.$id, bucketFileId);
	return {
		version: { ...input.version, bucketFileId },
		docx,
	};
}

export async function acceptNegotiationRedline(input: {
	contractId: string;
	orgId: string;
	userId: string;
	comment: NegotiationComment;
}): Promise<ContractDocumentVersion> {
	const version = await getVersion(input.comment.versionId);
	if (!version || version.contractId !== input.contractId) {
		throw new Error("Version not found");
	}

	const ensured = await ensureVersionDocx({
		contractId: input.contractId,
		orgId: input.orgId,
		version,
	});

	const nextTextFromString = applyRedline(version.extractedText, input.comment);
	const priorMetadata = metadataFromSnapshot(version.extractedText);
	const metadata = refreshSnapshotMetadata(nextTextFromString, priorMetadata);

	let nextDocx = ensured.docx;
	let docxApplied = false;
	try {
		nextDocx = applyRedlineToDocx(
			ensured.docx,
			version.extractedText,
			input.comment,
		);
		docxApplied = true;
	} catch (error) {
		// Snapshot markdown (**bold**) or text drift can miss DOCX runs.
		// Keep the string-applied snapshot as source of truth — do not rebuild
		// extractedText from the stale Word file (that undoes the accept).
		console.error(
			"[negotiation] accept-redline: DOCX apply failed; using text snapshot",
			error,
		);
	}

	let extractedText = polishNegotiationPlainText(
		withRefreshedMetadataBlock(nextTextFromString, metadata),
	);
	if (docxApplied) {
		try {
			nextDocx = polishNegotiationDocx(nextDocx);
			extractedText = await negotiationSnapshotFromDocx(nextDocx, metadata);
			extractedText = polishNegotiationPlainText(extractedText);
		} catch {
			extractedText = polishNegotiationPlainText(
				withRefreshedMetadataBlock(nextTextFromString, metadata),
			);
		}
	} else {
		nextDocx = polishNegotiationDocx(nextDocx);
	}

	const bucketFileId = await FileService.uploadFileToStorage(
		nextDocx,
		`contract-${input.contractId.slice(0, 8)}-v${version.versionNumber + 1}-negotiation.docx`,
	);

	return createVersion({
		contractId: input.contractId,
		orgId: input.orgId,
		extractedText,
		createdBy: input.userId,
		changeSummary: `Accepted redline: ${input.comment.body.slice(0, 80)}`,
		source: "redline_accept",
		fileId: version.fileId,
		bucketFileId,
	});
}

/** Latest version DOCX for preview (backfills once when missing). */
export async function loadLatestNegotiationDocx(input: {
	contractId: string;
	orgId: string;
}): Promise<{ version: ContractDocumentVersion; docx: Buffer }> {
	const versions = await listVersions(input.contractId);
	const current = versions[0];
	if (!current) {
		throw new Error("No negotiation version is available");
	}
	return ensureVersionDocx({
		contractId: input.contractId,
		orgId: input.orgId,
		version: current,
	});
}
