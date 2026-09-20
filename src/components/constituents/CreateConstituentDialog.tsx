"use client";

import { AlertTriangle, Plus, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	Constituent,
	ConstituentDuplicateCandidate,
	ConstituentType,
} from "@/lib/constituents";
import { CONSTITUENT_TYPES } from "@/lib/constituents";

type FormState = {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	city: string;
	type: ConstituentType;
	doNotContact: boolean;
};

const EMPTY_FORM: FormState = {
	firstName: "",
	lastName: "",
	email: "",
	phone: "",
	city: "",
	type: "donor",
	doNotContact: false,
};

export function CreateConstituentDialog({
	open,
	onOpenChange,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated: (constituent: Constituent) => void;
}) {
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [candidates, setCandidates] = useState<ConstituentDuplicateCandidate[]>(
		[],
	);

	const reset = () => {
		setForm(EMPTY_FORM);
		setError(null);
		setCandidates([]);
		setSaving(false);
	};

	const submit = async (force: boolean) => {
		setSaving(true);
		setError(null);
		try {
			const response = await fetch("/api/constituents", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: form.firstName,
					lastName: form.lastName,
					email: form.email || undefined,
					phone: form.phone || undefined,
					city: form.city || undefined,
					type: form.type,
					doNotContact: form.doNotContact,
					force,
				}),
			});
			const data = await response.json();
			if (response.status === 409) {
				setCandidates(data.candidates || []);
				setError("A likely duplicate already exists. Review the matches below.");
				return;
			}
			if (!response.ok) {
				setError(data.error || "Could not create constituent");
				return;
			}
			onCreated(data.constituent);
			reset();
			onOpenChange(false);
		} catch {
			setError("Could not create constituent");
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="max-w-[600px] p-0 max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 shadow-xl">
				<div className="absolute top-0 left-0 right-0 h-4 bg-[#d6d7d8] opacity-70 rounded-t-md" />
				<div className="sticky top-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 py-4 border-b border-slate-200 mt-4">
					<div className="flex items-center gap-3 px-6">
						<div className="flex items-center gap-3">
							<UserPlus className="w-5 h-5 text-[#0f5384]" />
							<DialogTitle className="text-xl font-semibold sidebar-gradient-text">
								Add constituent
							</DialogTitle>
						</div>
					</div>
					<p className="text-sm text-slate-600 mt-1 ml-14">
						Create a donor, volunteer, or member in this organization
					</p>
				</div>

				<div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="constituent-first-name">First name</Label>
							<Input
								id="constituent-first-name"
								className="border-[0.25px] border-slate-300 bg-white"
								value={form.firstName}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, firstName: event.target.value }))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="constituent-last-name">Last name</Label>
							<Input
								id="constituent-last-name"
								className="border-[0.25px] border-slate-300 bg-white"
								value={form.lastName}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, lastName: event.target.value }))
								}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="constituent-email">Email</Label>
						<Input
							id="constituent-email"
							type="email"
							className="border-[0.25px] border-slate-300 bg-white"
							value={form.email}
							onChange={(event) =>
								setForm((prev) => ({ ...prev, email: event.target.value }))
							}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="constituent-phone">Phone</Label>
							<Input
								id="constituent-phone"
								className="border-[0.25px] border-slate-300 bg-white"
								value={form.phone}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, phone: event.target.value }))
								}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="constituent-city">City</Label>
							<Input
								id="constituent-city"
								className="border-[0.25px] border-slate-300 bg-white"
								value={form.city}
								onChange={(event) =>
									setForm((prev) => ({ ...prev, city: event.target.value }))
								}
							/>
						</div>
					</div>
					<div className="space-y-1.5">
						<Label>Type</Label>
						<Select
							value={form.type}
							onValueChange={(value) =>
								setForm((prev) => ({ ...prev, type: value as ConstituentType }))
							}
						>
							<SelectTrigger className="border-[0.25px] border-slate-300 bg-white">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{CONSTITUENT_TYPES.map((type) => (
									<SelectItem key={type} value={type}>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input
							type="checkbox"
							checked={form.doNotContact}
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									doNotContact: event.target.checked,
								}))
							}
						/>
						Do not contact
					</label>

					{error ? (
						<div className="rounded-lg border border-orange/20 bg-orange/10 p-3 text-sm text-orange">
							<div className="flex items-start gap-2">
								<AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
								<p>{error}</p>
							</div>
							{candidates.length > 0 ? (
								<ul className="mt-2 space-y-1 text-slate-700">
									{candidates.map((candidate) => (
										<li key={candidate.$id}>
											{candidate.firstName} {candidate.lastName}
											{candidate.email ? ` · ${candidate.email}` : ""}
										</li>
									))}
								</ul>
							) : null}
						</div>
					) : null}
				</div>

				<div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
					{candidates.length > 0 ? (
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
							onClick={() => void submit(true)}
						>
							<AlertTriangle className="h-4 w-4" />
							Create anyway
						</Button>
					) : (
						<Button
							className="primary-btn px-3 sm:px-4"
							disabled={saving || !form.firstName.trim() || !form.lastName.trim()}
							onClick={() => void submit(false)}
						>
							<Plus className="h-4 w-4" />
							Add
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
