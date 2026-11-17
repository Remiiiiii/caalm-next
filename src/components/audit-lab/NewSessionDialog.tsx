"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Step = 1 | 2 | 3 | 4;

export function NewSessionDialog({
	open,
	onOpenChange,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSubmit: (payload: {
		title: string;
		department: string;
		framework: string;
		scheduledAt?: string;
		prepDeadlineAt?: string;
	}) => Promise<void>;
}) {
	const [step, setStep] = useState<Step>(1);
	const [title, setTitle] = useState("");
	const [department, setDepartment] = useState("");
	const [framework, setFramework] = useState("SOC 2");
	const [scheduledAt, setScheduledAt] = useState("");
	const [prepDeadlineAt, setPrepDeadlineAt] = useState("");
	const [busy, setBusy] = useState(false);
	const [ackConflict, setAckConflict] = useState(false);

	const reset = () => {
		setStep(1);
		setTitle("");
		setDepartment("");
		setFramework("SOC 2");
		setScheduledAt("");
		setPrepDeadlineAt("");
		setAckConflict(false);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) reset();
				onOpenChange(next);
			}}
		>
			<DialogContent className="glass-card max-w-lg">
				<DialogHeader>
					<DialogTitle>New review simulation</DialogTitle>
				</DialogHeader>
				{step === 1 ? (
					<div className="space-y-3">
						<Input
							placeholder="Simulation title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
						/>
						<Input
							placeholder="Department"
							value={department}
							onChange={(e) => setDepartment(e.target.value)}
						/>
						<Input
							placeholder="Framework (SOC 2, ISO 27001, …)"
							value={framework}
							onChange={(e) => setFramework(e.target.value)}
						/>
						<Input
							type="datetime-local"
							aria-label="Scheduled start"
							value={scheduledAt}
							onChange={(e) => setScheduledAt(e.target.value)}
						/>
						<Input
							type="datetime-local"
							aria-label="Prep deadline"
							value={prepDeadlineAt}
							onChange={(e) => setPrepDeadlineAt(e.target.value)}
						/>
					</div>
				) : null}
				{step === 2 ? (
					<div className="space-y-2 text-sm text-slate-600">
						<p>
							Scheduling intelligence will rank controls from prior findings when
							you import questions later.
						</p>
						<label className="flex items-center gap-2 text-sm">
							<input
								type="checkbox"
								checked={ackConflict}
								onChange={(e) => setAckConflict(e.target.checked)}
							/>
							I reviewed participant load and overlapping simulations.
						</label>
					</div>
				) : null}
				{step === 3 ? (
					<p className="text-sm text-slate-600">
						Add participants after the simulation is created from the simulation detail
						view or Ask CAALM.
					</p>
				) : null}
				{step === 4 ? (
					<dl className="space-y-1 text-sm text-slate-700">
						<div>
							<dt className="text-slate-500">Title</dt>
							<dd>{title || `${department} mock audit`}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Department</dt>
							<dd>{department}</dd>
						</div>
						<div>
							<dt className="text-slate-500">Framework</dt>
							<dd>{framework}</dd>
						</div>
					</dl>
				) : null}
				<DialogFooter className="gap-2">
					{step > 1 ? (
						<Button type="button" variant="outline" onClick={() => setStep((s) => (s - 1) as Step)}>
							Back
						</Button>
					) : null}
					{step < 4 ? (
						<Button
							type="button"
							className="btn-primary"
							disabled={step === 1 && !department.trim()}
							onClick={() => {
								if (step === 2 && !ackConflict) return;
								setStep((s) => (s + 1) as Step);
							}}
						>
							Next
						</Button>
					) : (
						<Button
							type="button"
							className="btn-primary"
							disabled={busy || !department.trim()}
							onClick={async () => {
								setBusy(true);
								try {
									await onSubmit({
										title,
										department,
										framework,
										scheduledAt: scheduledAt || undefined,
										prepDeadlineAt: prepDeadlineAt || undefined,
									});
									reset();
									onOpenChange(false);
								} finally {
									setBusy(false);
								}
							}}
						>
							Schedule simulation
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}