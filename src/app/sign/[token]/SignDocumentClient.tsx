"use client";

import { Ban, CloudDownload, Eraser, ListChecks, PenLine } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EsignDisclosureDialog } from "@/components/esign/EsignDisclosureDialog";
import { EsignRejectConfirmDialog } from "@/components/esign/EsignRejectConfirmDialog";
import { EsignSignedConfirmation } from "@/components/esign/EsignSignedConfirmation";
import { InvalidSigningLinkPage } from "@/components/esign/InvalidSigningLinkPage";
import { SignatureCaptureDialog } from "@/components/esign/SignatureCaptureDialog";
import { EsignDocumentPreview } from "@/components/esign/prepare/EsignDocumentPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/loading";
import type { EsignField } from "@/lib/esign/types";

type SignView = {
	title: string;
	status: string;
	documentFileId?: string;
	resourceType?: "contract" | "license";
	resourceId?: string;
	alreadySigned?: boolean;
	declined?: boolean;
	recipient: { id: string; name: string; email: string; status: string };
	fields: EsignField[];
	error?: string;
	code?: string;
};

/** Local calendar day as YYYY-MM-DD for <input type="date"> and stamps. */
function todayIsoDate(): string {
	const now = new Date();
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, "0");
	const d = String(now.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

function formatDateLabel(iso: string): string {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d).toLocaleDateString();
}

export default function SignDocumentClient({ token }: { token: string }) {
	const [view, setView] = useState<SignView | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [errorCode, setErrorCode] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [done, setDone] = useState<"signed" | "declined" | null>(null);
	const [fullName, setFullName] = useState("");
	const [signature, setSignature] = useState("");
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
	const [activeIndex, setActiveIndex] = useState(0);
	const [captureOpen, setCaptureOpen] = useState(false);
	const [disclosureOpen, setDisclosureOpen] = useState(false);
	const [rejectOpen, setRejectOpen] = useState(false);
	const [scrollToFieldToken, setScrollToFieldToken] = useState(0);

	useEffect(() => {
		let cancelled = false;
		fetch(`/api/esign/sign/${encodeURIComponent(token)}`)
			.then(async (res) => {
				const data = await res.json();
				if (!res.ok) {
					const err = new Error(data.error || "Invalid signing link") as Error & {
						code?: string;
					};
					err.code = data.code;
					throw err;
				}
				if (!cancelled) {
					setView(data);
					setFullName(data.recipient?.name || "");
					const seeded: Record<string, string> = {};
					const today = todayIsoDate();
					for (const field of (data.fields || []) as EsignField[]) {
						if (field.value) {
							seeded[field.id] = field.value;
							continue;
						}
						if (field.type === "name") seeded[field.id] = data.recipient.name;
						if (field.type === "email") seeded[field.id] = data.recipient.email;
						// Date stamps default to today so the signer isn't stuck with no UI.
						if (field.type === "date") seeded[field.id] = today;
					}
					setFieldValues(seeded);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : "Invalid signing link");
					setErrorCode(
						err && typeof err === "object" && "code" in err
							? String((err as { code?: string }).code || "")
							: null,
					);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [token]);

	// Public recipients have no app session — fetch PDF via the HMAC token route.
	const documentUrl = `/api/esign/sign/${encodeURIComponent(token)}/document`;
	const fields = view?.fields || [];
	const dateFields = useMemo(
		() => fields.filter((field) => field.type === "date"),
		[fields],
	);
	const textFields = useMemo(
		() => fields.filter((field) => field.type === "text"),
		[fields],
	);
	const hasSignatureField = fields.some((field) => field.type === "signature");

	const remaining = useMemo(
		() =>
			fields.filter((field) => {
				if (field.required === false) return false;
				if (field.type === "signature") {
					return !signature && !fieldValues[field.id];
				}
				if (field.type === "name") {
					return !String(fieldValues[field.id] || fullName || "").trim();
				}
				return !String(fieldValues[field.id] || "").trim();
			}),
		[fields, fieldValues, signature, fullName],
	);
	const allFilled = remaining.length === 0;
	const locked = Boolean(view?.alreadySigned || view?.declined || done);

	const setFieldValue = (fieldId: string, value: string) => {
		setFieldValues((current) => ({ ...current, [fieldId]: value }));
	};

	const applySignatureToFields = (dataUrl: string) => {
		setSignature(dataUrl);
		setFieldValues((current) => {
			const next = { ...current };
			for (const field of fields) {
				if (field.type === "signature") next[field.id] = dataUrl;
			}
			return next;
		});
	};

	/** Reset stamps and inputs so the signer can redo without refreshing. */
	const clearFields = () => {
		const name = view?.recipient.name || fullName;
		const email = view?.recipient.email || "";
		const today = todayIsoDate();
		const seeded: Record<string, string> = {};
		for (const field of fields) {
			if (field.type === "name") seeded[field.id] = name;
			else if (field.type === "email") seeded[field.id] = email;
			else if (field.type === "date") seeded[field.id] = today;
			// signature + text left empty
		}
		setSignature("");
		setFullName(name);
		setFieldValues(seeded);
		setActiveIndex(0);
		setError(null);
		setCaptureOpen(false);
		setDisclosureOpen(false);
	};

	const goNextField = () => {
		if (remaining.length === 0) return;
		const activeId = fields[activeIndex]?.id;
		let next = remaining[0];
		// Cycle through unfinished fields when Next Field is pressed again.
		if (activeId && remaining.length > 1) {
			const currentIdx = remaining.findIndex((field) => field.id === activeId);
			if (currentIdx >= 0) {
				next = remaining[(currentIdx + 1) % remaining.length];
			}
		}
		const index = fields.findIndex((field) => field.id === next.id);
		if (index >= 0) setActiveIndex(index);
		setScrollToFieldToken((token) => token + 1);
		if (next.type === "signature" && !signature && !fieldValues[next.id]) {
			setCaptureOpen(true);
		}
	};

	const submit = async (action: "sign" | "decline") => {
		setSubmitting(true);
		setError(null);
		try {
			const nameValue = fullName || view?.recipient.name || "";
			const valuesForSubmit: Record<string, string> = { ...fieldValues };
			for (const field of fields) {
				if (field.type === "name") valuesForSubmit[field.id] = nameValue;
				if (field.type === "email") {
					valuesForSubmit[field.id] =
						valuesForSubmit[field.id] || view?.recipient.email || "";
				}
				if (field.type === "date" && !valuesForSubmit[field.id]) {
					valuesForSubmit[field.id] = todayIsoDate();
				}
				if (field.type === "signature" && signature) {
					valuesForSubmit[field.id] = valuesForSubmit[field.id] || signature;
				}
			}

			const res = await fetch(`/api/esign/sign/${encodeURIComponent(token)}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action,
					signatureDataUrl: action === "sign" ? signature : undefined,
					fieldValues: action === "sign" ? valuesForSubmit : undefined,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Could not submit");
			setView(data);
			setDone(action === "decline" ? "declined" : "signed");
			setDisclosureOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not submit");
		} finally {
			setSubmitting(false);
		}
	};

	if (error && !view) {
		return <InvalidSigningLinkPage code={errorCode} message={error} />;
	}

	if (!view) {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<LoadingSpinner size="md" label="Loading signing page..." />
			</div>
		);
	}

	if (locked) {
		return (
			<EsignSignedConfirmation
				title={view.title}
				declined={done === "declined" || view.declined}
				resourceType={view.resourceType}
				resourceId={view.resourceId}
				documentUrl={documentUrl}
			/>
		);
	}

	const placedFields = fields.map((field) => {
		let value = fieldValues[field.id];
		if (field.type === "signature") value = value || signature;
		if (field.type === "name") value = value || fullName;
		if (field.type === "date" && value) value = formatDateLabel(value);
		return { ...field, value };
	});

	return (
		<div className="flex min-h-screen flex-col">
			<header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
				<div className="flex min-w-0 items-center gap-3">
					<p className="truncate text-sm font-medium text-slate-700">{view.title}</p>
					<span className="inline-block px-2 py-0.5 text-xs rounded-full font-medium border bg-green/10 text-green border-green/20">
						Signer
					</span>
				</div>
				<div className="flex items-center gap-3">
					<p className="text-sm text-slate-500">
						{remaining.length} Field{remaining.length === 1 ? "" : "s"} Remaining
					</p>
					<Button
						className="primary-btn px-3 sm:px-4"
						onClick={() => {
							if (allFilled) {
								setDisclosureOpen(true);
								return;
							}
							goNextField();
						}}
					>
						{allFilled ? (
							<ListChecks className="h-4 w-4" />
						) : (
							<PenLine className="h-4 w-4" />
						)}
						{allFilled ? "Complete" : "Next Field"}
					</Button>
				</div>
			</header>
			<div className="grid flex-1 grid-cols-[280px_minmax(0,1fr)]">
				<aside className="space-y-4 border-r border-slate-200 bg-slate-50 p-4">
					<div>
						<h1 className="text-lg font-semibold sidebar-gradient-text">
							Sign Document
						</h1>
						<p className="text-xs text-slate-500">
							{remaining.length} field{remaining.length === 1 ? "" : "s"} remaining
						</p>
					</div>
					<div>
						<Label htmlFor="sign-full-name">Full Name</Label>
						<Input
							id="sign-full-name"
							className="mt-1 border-[0.25px] border-slate-300"
							value={fullName}
							onChange={(e) => {
								const name = e.target.value;
								setFullName(name);
								setFieldValues((current) => {
									const next = { ...current };
									for (const field of fields) {
										if (field.type === "name") next[field.id] = name;
									}
									return next;
								});
							}}
						/>
					</div>
					{hasSignatureField ? (
						<div>
							<Label>Signature</Label>
							<button
								type="button"
								className="mt-1 flex h-24 w-full items-center justify-center rounded-md border border-green bg-white"
								onClick={() => {
									if (signature) {
										applySignatureToFields(signature);
										return;
									}
									setCaptureOpen(true);
								}}
							>
								{signature ? (
									<img
										src={signature}
										alt="Your signature"
										className="max-h-20 object-contain"
									/>
								) : (
									<span className="text-sm text-slate-500">Signature</span>
								)}
							</button>
						</div>
					) : null}
					{dateFields.map((field, index) => (
						<div key={field.id}>
							<Label htmlFor={`sign-date-${field.id}`}>
								Date{dateFields.length > 1 ? ` ${index + 1}` : ""}
							</Label>
							<Input
								id={`sign-date-${field.id}`}
								type="date"
								className="mt-1 border-[0.25px] border-slate-300"
								value={fieldValues[field.id] || ""}
								onChange={(e) => setFieldValue(field.id, e.target.value)}
							/>
						</div>
					))}
					{textFields.map((field, index) => (
						<div key={field.id}>
							<Label htmlFor={`sign-text-${field.id}`}>
								Text{textFields.length > 1 ? ` ${index + 1}` : ""}
							</Label>
							<Input
								id={`sign-text-${field.id}`}
								className="mt-1 border-[0.25px] border-slate-300"
								value={fieldValues[field.id] || ""}
								onChange={(e) => setFieldValue(field.id, e.target.value)}
								placeholder="Enter text"
							/>
						</div>
					))}
					<div>
						<p className="text-sm font-medium text-slate-700">Actions</p>
						{view.documentFileId ? (
							<a
								href={documentUrl}
								className="mt-2 flex items-center gap-2 text-sm text-slate-600 hover:text-[#0f5384]"
							>
								<CloudDownload className="h-4 w-4" />
								Download PDF
							</a>
						) : null}
						<button
							type="button"
							className="mt-2 flex items-center gap-2 text-sm text-slate-600 hover:text-[#0f5384]"
							onClick={clearFields}
							disabled={submitting}
						>
							<Eraser className="h-4 w-4" />
							Clear Fields
						</button>
						<button
							type="button"
							className="mt-2 flex items-center gap-2 text-sm text-red"
							onClick={() => setRejectOpen(true)}
							disabled={submitting}
						>
							<Ban className="h-4 w-4" />
							Reject Document
						</button>
					</div>
					{error ? <p className="text-sm text-red">{error}</p> : null}
				</aside>
				<main className="bg-slate-100">
					<EsignDocumentPreview
						documentTitle={view.title}
						documentUrl={documentUrl}
						fields={placedFields}
						recipients={[
							{
								id: view.recipient.id,
								email: view.recipient.email,
								name: fullName || view.recipient.name,
								role: "signer",
								order: 1,
								status: "viewed",
								signatureDataUrl: signature,
							},
						]}
						selectedFieldId={fields[activeIndex]?.id}
						scrollToFieldToken={scrollToFieldToken}
						onFieldClick={(field) => {
							const index = fields.findIndex((f) => f.id === field.id);
							if (index >= 0) setActiveIndex(index);
							if (field.type === "signature") {
								if (signature) {
									applySignatureToFields(signature);
									return;
								}
								setCaptureOpen(true);
								return;
							}
							if (field.type === "date") {
								setFieldValue(field.id, fieldValues[field.id] || todayIsoDate());
							}
						}}
					/>
				</main>
			</div>
			<SignatureCaptureDialog
				open={captureOpen}
				onOpenChange={setCaptureOpen}
				onCapture={(dataUrl) => applySignatureToFields(dataUrl)}
			/>
			<EsignDisclosureDialog
				open={disclosureOpen}
				onOpenChange={setDisclosureOpen}
				title={view.title}
				submitting={submitting}
				onConfirm={() => void submit("sign")}
			/>
			<EsignRejectConfirmDialog
				open={rejectOpen}
				onOpenChange={setRejectOpen}
				title={view.title}
				submitting={submitting}
				onConfirm={() => void submit("decline")}
			/>
		</div>
	);
}
