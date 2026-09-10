"use client";

import { ArrowLeft, Send, StepForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type {
	EsignEnvelope,
	EsignField,
	EsignFieldType,
	EsignRecipient,
} from "@/lib/esign/types";
import {
	dedupeSignerEmails,
	getSignersMissingSignatureFields,
	type MissingSignatureSigner,
} from "@/lib/esign/validate-envelope";
import { EsignAddSignersStep, type SignerDraft } from "./EsignAddSignersStep";
import { EsignDocumentPreview } from "./EsignDocumentPreview";
import { EsignEmailStep } from "./EsignEmailStep";
import { EsignPendingMetadataPane } from "./EsignPendingMetadataPane";
import { EsignPlaceFieldsStep } from "./EsignPlaceFieldsStep";
import { EsignSendValidationDialog } from "./EsignSendValidationDialog";

const FIELD_SIZE: Record<EsignFieldType, { width: number; height: number }> = {
	signature: { width: 28, height: 4.5 },
	date: { width: 16, height: 3.5 },
	name: { width: 20, height: 3.5 },
	email: { width: 22, height: 3.5 },
	text: { width: 20, height: 3.5 },
};

const STEPS = ["Add signers", "Place fields", "Add message", "Send"] as const;

export function EsignPrepareWorkspace({
	resourceType,
	resourceId,
}: {
	resourceType: "contract" | "license";
	resourceId: string;
}) {
	const { user } = useAuth();
	const { toast } = useToast();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [step, setStep] = useState(0);
	const [envelope, setEnvelope] = useState<EsignEnvelope | null>(null);
	const [documentFileId, setDocumentFileId] = useState<string>("");
	const [title, setTitle] = useState("Document");
	const [signers, setSigners] = useState<SignerDraft[]>([
		{ email: "", name: "" },
	]);
	const [fields, setFields] = useState<EsignField[]>([]);
	const [selectedSignerId, setSelectedSignerId] = useState("");
	const [selectedType, setSelectedType] = useState<EsignFieldType | null>(null);
	const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [pdfReady, setPdfReady] = useState(false);
	const [missing, setMissing] = useState<MissingSignatureSigner[]>([]);
	const [showMissing, setShowMissing] = useState(false);
	const [links, setLinks] = useState<
		Array<{ recipientId: string; url: string; token: string }>
	>([]);

	const sent = envelope && envelope.status !== "draft";

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch(
				`/api/esign/envelopes/by-resource?resourceType=${resourceType}&resourceId=${encodeURIComponent(resourceId)}`,
			);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Could not load document");
			setTitle(data.resource?.title || "Document");
			setDocumentFileId(data.resource?.documentFileId || "");

			const latest = data.envelope as EsignEnvelope | null | undefined;
			// Declined / voided / expired packages are finished — start a new wizard
			// instead of reopening the dead pending page.
			const restartStatuses = new Set(["declined", "voided", "expired"]);
			if (latest && restartStatuses.has(latest.status)) {
				const priorSigners = latest.recipients
					.filter((r) => r.role === "signer")
					.map((r) => ({ email: r.email, name: r.name }));
				setEnvelope(null);
				setLinks([]);
				setFields([]);
				setSelectedFieldId(null);
				setSelectedSignerId("");
				setStep(0);
				setSigners(
					priorSigners.length > 0 ? priorSigners : [{ email: "", name: "" }],
				);
				setMessage(latest.emailMessage || "");
				toast({
					title: "Starting a new package",
					description:
						latest.status === "declined"
							? "The previous package was declined. Set up signers and send again."
							: "The previous package is no longer active. Set up a new one.",
				});
				return;
			}

			if (latest) {
				setEnvelope(latest);
				setSigners(
					latest.recipients
						.filter((r: EsignRecipient) => r.role === "signer")
						.map((r: EsignRecipient) => ({ email: r.email, name: r.name })),
				);
				setFields(
					(latest.fields || []).map((field: EsignField) => ({
						...field,
						height: FIELD_SIZE[field.type]?.height ?? field.height,
						width: FIELD_SIZE[field.type]?.width ?? field.width,
					})),
				);
				setMessage(latest.emailMessage || "");
				setSelectedSignerId(latest.recipients[0]?.id || "");
				if (latest.status !== "draft") {
					const linksRes = await fetch(
						`/api/esign/envelopes/${latest.$id}/signing-links`,
					);
					const linksData = await linksRes.json();
					if (linksRes.ok) setLinks(linksData.links || []);
				}
			}
		} catch (error) {
			toast({
				title: "Could not open signing workspace",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	}, [resourceId, resourceType, toast]);

	useEffect(() => {
		void load();
	}, [load]);

	const persistDraft = async (nextFields = fields) => {
		const valid = dedupeSignerEmails(signers);
		if (valid.length === 0) {
			toast({
				title: "Add a signer",
				description: "Enter at least one signer email.",
				variant: "destructive",
			});
			return null;
		}
		setSaving(true);
		try {
			if (!envelope) {
				const createRes = await fetch("/api/esign/envelopes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						resourceType,
						resourceId,
						documentFileId,
						title,
						recipients: valid.map((r) => ({
							email: r.email,
							name: r.name,
							role: "signer",
						})),
						fields: nextFields,
						emailMessage: message,
					}),
				});
				const created = await createRes.json();
				if (!createRes.ok)
					throw new Error(created.error || "Could not save draft");
				setEnvelope(created.envelope);
				setFields(created.envelope.fields || nextFields);
				setSelectedSignerId(created.envelope.recipients[0]?.id || "");
				return created.envelope as EsignEnvelope;
			}
			const patchRes = await fetch(`/api/esign/envelopes/${envelope.$id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					recipients: valid.map((r) => ({
						email: r.email,
						name: r.name,
						role: "signer",
					})),
					fields: nextFields,
					emailMessage: message,
					documentFileId,
					title,
				}),
			});
			const patched = await patchRes.json();
			if (!patchRes.ok)
				throw new Error(patched.error || "Could not save draft");
			setEnvelope(patched.envelope);
			setFields(patched.envelope.fields || nextFields);
			if (!selectedSignerId) {
				setSelectedSignerId(patched.envelope.recipients[0]?.id || "");
			}
			return patched.envelope as EsignEnvelope;
		} catch (error) {
			toast({
				title: "Save failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
			return null;
		} finally {
			setSaving(false);
		}
	};

	const placeField = (
		page: number,
		x: number,
		y: number,
		type?: EsignFieldType,
	) => {
		const fieldType = type || selectedType;
		if (!fieldType) return;
		if (!selectedSignerId) {
			toast({
				title: "Select a signer",
				description: "Choose who this field belongs to before placing it.",
				variant: "destructive",
			});
			return;
		}
		if (type) setSelectedType(type);
		const size = FIELD_SIZE[fieldType];
		const next: EsignField = {
			id: crypto.randomUUID(),
			recipientId: selectedSignerId,
			type: fieldType,
			page,
			x: Math.min(100 - size.width, Math.max(0, x - size.width / 2)),
			y: Math.min(100 - size.height, Math.max(0, y - size.height / 2)),
			width: size.width,
			height: size.height,
			required: true,
		};
		setFields((current) => [...current, next]);
		setSelectedFieldId(next.id);
	};

	const moveField = (fieldId: string, page: number, x: number, y: number) => {
		setFields((current) =>
			current.map((field) =>
				field.id === fieldId ? { ...field, page, x, y } : field,
			),
		);
		setSelectedFieldId(fieldId);
	};

	const continueStep = async () => {
		if (step === 0) {
			const saved = await persistDraft();
			if (saved) setStep(1);
			return;
		}
		if (step === 1) {
			const saved = await persistDraft();
			if (saved) setStep(2);
			return;
		}
		if (step === 2) {
			const saved = await persistDraft();
			if (saved) setStep(3);
		}
	};

	const send = async () => {
		const saved = await persistDraft();
		if (!saved) return;
		const gaps = getSignersMissingSignatureFields(saved);
		if (gaps.length > 0) {
			setMissing(gaps);
			setShowMissing(true);
			return;
		}
		setSaving(true);
		try {
			const sendRes = await fetch(`/api/esign/envelopes/${saved.$id}/send`, {
				method: "POST",
			});
			const sentData = await sendRes.json();
			if (!sendRes.ok) {
				if (sentData.missing?.length) {
					setMissing(sentData.missing);
					setShowMissing(true);
					return;
				}
				throw new Error(sentData.error || "Could not send");
			}
			setEnvelope(sentData.envelope);
			const linksRes = await fetch(
				`/api/esign/envelopes/${sentData.envelope.$id}/signing-links`,
			);
			const linksData = await linksRes.json();
			if (linksRes.ok) setLinks(linksData.links || []);
			toast({
				title: "Sent for signature",
				description: "Signers will get an email link.",
			});
		} catch (error) {
			toast({
				title: "Send failed",
				description: error instanceof Error ? error.message : "Try again",
				variant: "destructive",
			});
		} finally {
			setSaving(false);
		}
	};

	const draftRecipients: EsignRecipient[] = useMemo(() => {
		if (envelope?.recipients?.length) return envelope.recipients;
		return signers.map((row, index) => ({
			id: `draft-${index}`,
			email: row.email,
			name: row.name,
			role: "signer" as const,
			order: index + 1,
			status: "pending" as const,
		}));
	}, [envelope, signers]);

	if (loading) {
		return (
			<div className="flex min-h-[320px] items-center justify-center">
				<LoadingSpinner size="md" label="Loading signing workspace..." />
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100dvh-10.5rem)] max-h-[calc(100dvh-8.5rem)] w-full flex-col px-4 sm:px-6 lg:px-8 xl:px-12">
			<div className="mb-4 shrink-0">
				<h1 className="h1 sidebar-gradient-text">CAALM Execute</h1>
				<p className="mt-1 max-w-4xl text-sm text-slate-600">
					Prepare signers, place signature fields, and send your document for
					electronic signature.
				</p>
			</div>
			<div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] gap-6">
				<div className="min-h-0 h-full">
					<EsignDocumentPreview
						documentTitle={title}
						documentFileId={documentFileId || envelope?.documentFileId}
						resourceType={resourceType}
						resourceId={resourceId}
						fields={fields}
						recipients={draftRecipients}
						selectedFieldId={selectedFieldId}
						onPlaceField={sent ? undefined : placeField}
						onMoveField={sent ? undefined : moveField}
						onDeleteField={
							sent
								? undefined
								: (id) => {
										setFields((c) => c.filter((f) => f.id !== id));
										setSelectedFieldId((current) =>
											current === id ? null : current,
										);
									}
						}
						onFieldClick={
							sent
								? undefined
								: (field) => {
										setSelectedFieldId(field.id);
										setSelectedType(field.type);
										setSelectedSignerId(field.recipientId);
									}
						}
						onPdfReady={setPdfReady}
					/>
				</div>
				<div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
					<div className="min-h-0 flex-1 overflow-y-auto p-6">
						{sent && envelope ? (
							<EsignPendingMetadataPane
								envelope={envelope}
								currentUserEmail={user?.email}
								links={links}
							/>
						) : step === 0 ? (
							<EsignAddSignersStep
								signers={signers}
								onChange={setSigners}
								onAddMyself={() => {
									if (!user?.email) return;
									const email = user.email.toLowerCase();
									if (signers.some((s) => s.email.toLowerCase() === email))
										return;
									setSigners((current) => [
										...current.filter((s) => s.email.trim()),
										{ email, name: user.name || "" },
									]);
								}}
							/>
						) : step === 1 ? (
							<EsignPlaceFieldsStep
								signers={draftRecipients.filter((r) => r.role === "signer")}
								selectedSignerId={selectedSignerId}
								onSelectSigner={setSelectedSignerId}
								selectedType={selectedType}
								onSelectType={setSelectedType}
							/>
						) : (
							<EsignEmailStep message={message} onMessageChange={setMessage} />
						)}
					</div>
					{!sent ? (
						<div className="border-t border-slate-200 p-6">
							<p className="text-xs text-slate-500">
								Step {step + 1} of {STEPS.length}
							</p>
							<div className="mt-2 mb-4 flex gap-1">
								{STEPS.map((label, index) => (
									<div
										key={label}
										className={`h-1 flex-1 rounded-full ${
											index <= step ? "bg-green" : "bg-slate-200"
										}`}
									/>
								))}
							</div>
							<div className="flex justify-end gap-3">
								{step > 0 ? (
									<Button
										type="button"
										className="btn-primary px-3 sm:px-4"
										onClick={() => setStep((s) => s - 1)}
									>
										<ArrowLeft className="h-4 w-4" />
										Go Back
									</Button>
								) : null}
								{step < 3 ? (
									<Button
										className="primary-btn px-3 sm:px-4"
										onClick={() => void continueStep()}
										disabled={saving || (step > 0 && !pdfReady)}
									>
										<StepForward className="h-4 w-4" />
										{saving ? "Saving..." : "Continue"}
									</Button>
								) : (
									<Button
										className="primary-btn px-3 sm:px-4"
										onClick={() => void send()}
										disabled={saving}
									>
										<Send className="h-4 w-4" />
										{saving ? "Sending..." : "Send"}
									</Button>
								)}
							</div>
						</div>
					) : null}
				</div>
			</div>
			<EsignSendValidationDialog
				open={showMissing}
				onOpenChange={setShowMissing}
				missing={missing}
			/>
		</div>
	);
}
