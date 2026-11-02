import { citationsPassed, verifyCitations } from "./citation-verify";
import { chunkDocument } from "./chunk-document";
import { findRepeatFinding } from "./dedupe-findings";
import { extractAuditDocumentText } from "./extract-document-text";
import { buildFindingKey } from "./finding-key";
import { generateFeedbackReport } from "./feedback";
import { classifyAuditDocument, extractAuditFindings } from "./llm-client";
import { notifyAuditAnalysisComplete } from "./notify";
import { loadReadinessItems } from "./readiness-adapter";
import { reconcileFindingWithReadiness } from "./llm-client";
import { reconcileByRules } from "./reconcile-rules";
import { scoreAuditRisk } from "./risk-score";
import {
	appendProcessingLog,
	createFeedback,
	createFinding,
	getAuditDocument,
	listFindings,
	updateAuditDocument,
} from "./store";
import type { ProcessingLogEntry } from "./types";

async function loadStoredFile(storageFileId: string): Promise<{
	buffer: Buffer;
	name: string;
	type: string;
}> {
	const { createAdminClient } = await import("@/lib/appwrite");
	const { appwriteConfig } = await import("@/lib/appwrite/config");
	const { storage } = await createAdminClient();
	const arrayBuffer = await storage.getFileDownload({
		bucketId: appwriteConfig.auditDocumentsBucketId,
		fileId: storageFileId,
	});
	const meta = await storage.getFile({
		bucketId: appwriteConfig.auditDocumentsBucketId,
		fileId: storageFileId,
	});
	return {
		buffer: Buffer.from(arrayBuffer),
		name: meta.name,
		type: meta.mimeType,
	};
}

export async function runAuditUploadPipeline(
	documentId: string,
	orgId: string,
	options?: { reconcile?: boolean },
): Promise<void> {
	const document = await getAuditDocument(orgId, documentId);
	if (!document) throw new Error("Audit document not found");

	let log: ProcessingLogEntry[] = document.processingLog;
	const logStage = async (
		stage: string,
		status: ProcessingLogEntry["status"],
		message?: string,
		docStatus?: Parameters<typeof appendProcessingLog>[3],
	) => {
		log = await appendProcessingLog(
			documentId,
			log,
			{ at: new Date().toISOString(), stage, status, message },
			docStatus,
		);
	};

	try {
		await logStage("extract", "started", undefined, "extracting");
		const file = await loadStoredFile(document.storageFileId);
		const text = await extractAuditDocumentText(file.buffer, {
			name: file.name,
			type: file.type,
		});
		if (!text.trim()) {
			throw new Error("No readable text was found in this file.");
		}
		const chunks = chunkDocument(text);
		await logStage("extract", "complete", `${chunks.length} chunks`);

		await logStage("classify", "started", undefined, "classifying");
		const classification = await classifyAuditDocument(text);
		await logStage(
			"classify",
			"complete",
			classification.auditType || classification.documentType,
		);

		await logStage("extract_findings", "started", undefined, "extracting_findings");
		const extracted = await extractAuditFindings(text);
		await logStage(
			"extract_findings",
			"complete",
			`${extracted.findings.length} findings`,
		);

		await logStage("cite_verify", "started");
		const history = await listFindings({ orgId, limit: 200 });
		const createdIds: string[] = [];
		for (const finding of extracted.findings) {
			const citations = verifyCitations(text, finding.citations);
			const passed = citationsPassed(citations);
			const { riskScore, computedSeverity } = scoreAuditRisk(
				finding.likelihood,
				finding.impact,
			);
			const repeat = findRepeatFinding(finding, history);
			const created = await createFinding({
				orgId,
				documentId,
				title: finding.title,
				description: finding.description,
				frameworkRefs: finding.frameworkRefs,
				severityReported: finding.severityReported ?? null,
				severityComputed: computedSeverity,
				likelihood: finding.likelihood,
				impact: finding.impact,
				riskScore,
				confidence: finding.confidence,
				citations,
				citationCheckPassed: passed,
				findingCode: finding.findingCode ?? null,
				managementResponse: finding.managementResponse ?? null,
				monetaryImpactUsd: finding.monetaryImpactUsd ?? null,
				controlDeficiencyType: finding.controlDeficiencyType ?? null,
				findingKey: buildFindingKey(finding.title, finding.frameworkRefs),
				isRepeat: Boolean(repeat) || /repeat of/i.test(finding.title + finding.description),
				repeatOfFindingId: repeat?.$id ?? null,
				status: "draft",
				reconciliation: null,
				disputeReason: null,
				riskAcceptanceReason: null,
				riskAcceptedBy: null,
				riskAcceptedAt: null,
			});
			createdIds.push(created.$id);
			history.push(created);
		}
		await logStage("cite_verify", "complete");

		await logStage("risk_score", "started", undefined, "scoring");
		await logStage("risk_score", "complete");
		await logStage("dedupe", "started");
		await logStage("dedupe", "complete");

		if (options?.reconcile) {
			await logStage("reconcile", "started", undefined, "reconciling");
			const readiness = await loadReadinessItems(orgId, {
				fileName: document.fileName,
				auditType: classification.auditType,
				frameworks: classification.frameworks,
				auditorName: classification.auditorName,
				reportNumber: classification.reportNumber,
			});
			const { updateFinding } = await import("./store");
			const fresh = await listFindings({ orgId, documentId, limit: 200 });
			for (const finding of fresh) {
				if (!finding.citationCheckPassed) continue;
				const ruled = reconcileByRules({
					title: finding.title,
					description: finding.description,
					frameworkRefs: finding.frameworkRefs,
					severityReported: finding.severityReported,
					severityComputed: finding.severityComputed,
					readiness,
					periodStart: classification.periodStart,
				});
				const llm = await reconcileFindingWithReadiness({
					title: finding.title,
					description: finding.description,
					frameworkRefs: finding.frameworkRefs,
					readiness,
				});
				const result =
					llm.verdict === ruled.verdict
						? { ...ruled, rationale: llm.rationale || ruled.rationale }
						: ruled;
				await updateFinding(finding.$id, { reconciliation: result });
			}
			await logStage("reconcile", "complete");
		}

		await updateAuditDocument(documentId, {
			status: "complete",
			summary: extracted.summary,
			metadata: {
				classification,
				sefa: extracted.sefa ?? null,
				chunkCount: chunks.length,
			},
			errorMessage: null,
		});
		await logStage("persist", "complete");

		try {
			const report = await generateFeedbackReport(orgId, documentId);
			await createFeedback({ orgId, documentId, report });
		} catch (error) {
			console.warn("[SERVER] generateFeedbackReport:", error);
		}

		void notifyAuditAnalysisComplete({
			orgId,
			documentId,
			userId: document.uploadedBy,
			fileName: document.fileName,
			findingCount: createdIds.length,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Pipeline failed";
		await updateAuditDocument(documentId, {
			status: "failed",
			errorMessage: message,
		});
		await logStage("pipeline", "failed", message, "failed");
		throw error;
	}
}
