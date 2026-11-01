"use client";

import { isToday } from "date-fns";
import { FileSymlink, Unlink2, UserPlus, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type {
	AssistantFormField,
	AssistantInputForm,
} from "@/components/assistant/assistantTypes";
import {
	isNotePinDateTimeInPast,
	NoteTimePicker,
} from "@/components/notes/NoteCalendarPinFields";
import { TaskAssigneeFilter } from "@/components/tasks/TaskAssigneeFilter";
import type { TaskPerson } from "@/components/tasks/task-ui";
import Avatar from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownScrollArea } from "@/components/ui/DropdownScrollArea";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	CaalmDatePicker,
	parseIsoDateLocal,
} from "@/components/ui/caalm-date-picker";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTaskPeople } from "@/hooks/useTaskPeople";
import { optionsForSelectField } from "@/lib/assistant/inputForm";
import { cn } from "@/lib/utils";

function isParticipantsField(field: AssistantFormField): boolean {
	return /\bparticipants?\b/i.test(`${field.name} ${field.label}`);
}

function participantIdsFromValue(
	value: string,
	people: TaskPerson[],
): string {
	const tokens = value
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean);
	if (!tokens.length) return "";
	return people
		.filter((person) => {
			const email = person.email?.trim().toLowerCase();
			const name = person.name.trim().toLowerCase();
			return (
				tokens.includes(person.id.toLowerCase()) ||
				(email ? tokens.includes(email) : false) ||
				tokens.includes(name)
			);
		})
		.map((person) => person.id)
		.join(",");
}

function participantValueFromIds(
	idsCsv: string,
	people: TaskPerson[],
): string {
	const ids = new Set(
		idsCsv
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean),
	);
	return people
		.filter((person) => ids.has(person.id))
		.map((person) => person.email?.trim() || person.name)
		.join(", ");
}

const FIELD_CLASS =
	"border-[0.25px] border-slate-300 bg-white text-sm text-slate-700";

function growTextarea(el: HTMLTextAreaElement | null) {
	if (!el) return;
	el.style.height = "auto";
	el.style.overflowY = "hidden";
	el.style.height = `${el.scrollHeight}px`;
}

function AutoGrowTextarea({
	id,
	value,
	onChange,
	placeholder,
	disabled,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
}) {
	const ref = useRef<HTMLTextAreaElement>(null);
	useLayoutEffect(() => {
		growTextarea(ref.current);
	}, [value]);
	return (
		<Textarea
			id={id}
			ref={ref}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			rows={2}
			disabled={disabled}
			className={cn("min-h-0 resize-none overflow-hidden", FIELD_CLASS)}
		/>
	);
}

function ParticipantsPicker({
	field,
	value,
	people,
	disabled,
	onChange,
}: {
	field: AssistantFormField;
	value: string;
	people: TaskPerson[];
	disabled?: boolean;
	onChange: (value: string) => void;
}) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const [manageOpen, setManageOpen] = useState(false);
	const stackRef = useRef<HTMLButtonElement>(null);
	const idsCsv = participantIdsFromValue(value, people);
	const selectedIds = new Set(idsCsv.split(",").filter(Boolean));
	const selectedPeople = people.filter((person) => selectedIds.has(person.id));
	const count = selectedPeople.length;

	const openPicker = () => {
		if (disabled) return;
		setManageOpen(false);
		setPickerOpen(true);
	};

	const removePerson = (id: string) => {
		const next = idsCsv
			.split(",")
			.filter((personId) => personId && personId !== id)
			.join(",");
		onChange(participantValueFromIds(next, people));
		if (selectedPeople.length <= 1) setManageOpen(false);
	};

	const picker = (
		<div
			className={cn(
				"pointer-events-none absolute overflow-hidden opacity-0",
				count === 0 ? "inset-0" : "inset-y-0 right-0 w-[4.5rem]",
			)}
			aria-hidden
			inert
		>
			<TaskAssigneeFilter
				id={`aif-${field.name}`}
				mode="multi"
				variant="field"
				ariaLabel={field.label}
				value={idsCsv}
				people={people}
				disabled={disabled}
				open={pickerOpen}
				onOpenChange={setPickerOpen}
				onChange={(nextIds) =>
					onChange(participantValueFromIds(nextIds, people))
				}
			/>
		</div>
	);

	if (count === 0) {
		return (
			<div className="relative">
				<button
					type="button"
					disabled={disabled}
					aria-label="Add participants"
					onClick={openPicker}
					className={cn(
						"flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2.5 text-sm font-medium hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50",
						FIELD_CLASS,
					)}
				>
					<UserPlus className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
					<span className="font-normal text-slate-400">
						Add participants…
					</span>
				</button>
				{picker}
			</div>
		);
	}

	return (
		<div className="relative">
			<Popover open={manageOpen} onOpenChange={setManageOpen}>
				<div
					className={cn(
						"flex h-8 w-full items-center overflow-hidden rounded-md hover:border-blue-300",
						FIELD_CLASS,
					)}
				>
					<PopoverTrigger asChild>
						<button
							ref={stackRef}
							type="button"
							disabled={disabled}
							aria-label="Manage participants"
							aria-haspopup="dialog"
							aria-expanded={manageOpen}
							className="flex h-full min-w-0 cursor-pointer items-center px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f5384]/40 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<ParticipantAvatarStack people={selectedPeople} />
						</button>
					</PopoverTrigger>
					<div className="h-4 w-px shrink-0 bg-slate-200" aria-hidden />
					<span className="shrink-0 px-2.5 text-sm text-slate-700">
						{count} {count === 1 ? "person" : "people"}
					</span>
					<div className="h-4 w-px shrink-0 bg-slate-200" aria-hidden />
					<button
						type="button"
						disabled={disabled}
						aria-label="Add participant"
						onClick={openPicker}
						className="ml-auto flex h-full cursor-pointer items-center gap-1 px-2.5 text-sm font-medium text-[#0f5384] hover:text-[#078fab] disabled:cursor-not-allowed disabled:opacity-50"
					>
						<UserPlus className="h-3.5 w-3.5" aria-hidden />
						Add
					</button>
				</div>
				<PopoverContent
					align="start"
					side="bottom"
					sideOffset={8}
					collisionPadding={8}
					role="dialog"
					aria-label="Manage participants"
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						stackRef.current?.focus();
					}}
					className="z-[100] w-80 rounded-xl border-slate-200 bg-white p-0 shadow-lg backdrop-blur-none"
				>
					<div className="flex items-start justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
						<div>
							<p className="text-sm font-semibold text-[#0f5384]">
								Participants
							</p>
							<p className="text-[11px] text-slate-500">
								Hover a person to remove.
							</p>
						</div>
						<button
							type="button"
							aria-label="Close"
							onClick={() => setManageOpen(false)}
							className="cursor-pointer rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							<X className="h-4 w-4" aria-hidden />
						</button>
					</div>
					<DropdownScrollArea
						maxHeightClassName="max-h-64"
						className="px-1 py-1"
					>
						{selectedPeople.map((person) => (
							<div
								key={person.id}
								className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[#F2F5F9] focus-within:bg-[#F2F5F9]"
							>
								<Avatar
									name={person.name}
									userId={person.id}
									size="sm"
									imageUrl={person.imageUrl}
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-slate-800">
										{person.name}
									</p>
									{person.email ? (
										<p className="truncate text-xs text-slate-500">
											{person.email}
										</p>
									) : null}
								</div>
								<button
									type="button"
									aria-label={`Remove ${person.name}`}
									onClick={() => removePerson(person.id)}
									className="cursor-pointer rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-200/80 hover:text-slate-700 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
								>
									<Unlink2 className="h-4 w-4" aria-hidden />
								</button>
							</div>
						))}
					</DropdownScrollArea>
					<div className="flex items-center justify-between border-t border-slate-200 px-3 py-2">
						<span className="text-xs text-slate-500">
							{count} {count === 1 ? "participant" : "participants"}
						</span>
						<button
							type="button"
							onClick={openPicker}
							className="cursor-pointer text-sm font-medium text-[#0f5384] hover:text-[#078fab] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40"
						>
							+ Add more
						</button>
					</div>
				</PopoverContent>
			</Popover>
			{picker}
		</div>
	);
}

function ParticipantAvatarStack({ people }: { people: TaskPerson[] }) {
	const visible = people.slice(0, 5);
	const remaining = people.length - visible.length;

	return (
		<span className="flex items-center">
			{visible.map((person, index) => (
				<span
					key={person.id}
					className={cn(
						"inline-flex rounded-full ring-2 ring-white",
						index > 0 && "-ml-2",
					)}
					style={{ zIndex: visible.length - index }}
				>
					<Avatar
						name={person.name}
						userId={person.id}
						size="xs"
						imageUrl={person.imageUrl}
					/>
				</span>
			))}
			{remaining > 0 ? (
				<span className="ml-1.5 shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-500">
					+{remaining} more
				</span>
			) : null}
		</span>
	);
}

type Props = {
	form: AssistantInputForm;
	onSubmit: (message: string) => void;
	disabled?: boolean;
};

export default function AssistantInputFormCard({
	form,
	onSubmit,
	disabled,
}: Props) {
	const [values, setValues] = useState<Record<string, string>>(() =>
		Object.fromEntries(
			form.fields.map((f) => {
				let value = f.defaultValue ?? "";
				if (f.type === "select") {
					const options = optionsForSelectField(f);
					if (value && !options.includes(value)) value = "";
				}
				return [f.name, value];
			}),
		),
	);

	function set(name: string, value: string) {
		setValues((prev) => ({ ...prev, [name]: value }));
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const lines = form.fields
			.filter((f) => values[f.name]?.trim())
			.map((f) => `${f.label}: ${values[f.name].trim()}`);
		if (!lines.length) return;
		onSubmit(lines.join("\n"));
	}

	const allRequiredFilled = form.fields
		.filter((f) => f.required)
		.every((f) => values[f.name]?.trim());

	const dateField = form.fields.find((f) => f.type === "date");
	const dateValue = dateField ? (values[dateField.name] ?? "") : "";
	const selectedDay = parseIsoDateLocal(dateValue);
	const restrictToFuture = Boolean(selectedDay && isToday(selectedDay));
	const hasPeopleField = form.fields.some(isParticipantsField);
	const people = useTaskPeople(hasPeopleField);

	return (
		<form onSubmit={handleSubmit} className="mt-2 space-y-3">
			{form.fields.map((field) => (
				<div key={field.name} className="space-y-1">
					<label
						htmlFor={`aif-${field.name}`}
						className={cn(
							"block text-xs font-medium text-slate-600",
							field.required &&
								"after:ml-0.5 after:text-red after:content-['*']",
						)}
					>
						{field.label}
					</label>

					{field.type === "textarea" ? (
						<AutoGrowTextarea
							id={`aif-${field.name}`}
							value={values[field.name]}
							onChange={(next) => set(field.name, next)}
							placeholder={field.placeholder}
							disabled={disabled}
						/>
					) : field.type === "select" ? (
						<Select
							value={values[field.name] || undefined}
							onValueChange={(value) => set(field.name, value)}
							disabled={disabled}
						>
							<SelectTrigger
								id={`aif-${field.name}`}
								className={cn(
									"h-8 px-2.5! py-0! shadow-none hover:border-blue-300",
									FIELD_CLASS,
								)}
							>
								<SelectValue placeholder="Choose…" />
							</SelectTrigger>
							<SelectContent className="border-slate-200 bg-white shadow-lg">
								{optionsForSelectField(field).map((opt) => (
									<SelectItem key={opt} value={opt}>
										{opt.charAt(0).toUpperCase() + opt.slice(1)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : field.type === "date" ? (
						<CaalmDatePicker
							id={`aif-${field.name}`}
							value={values[field.name] ?? ""}
							onChange={(value) => set(field.name, value)}
							placeholder={field.placeholder ?? "Pick a date"}
							disabled={disabled}
							disablePast
							size="sm"
						/>
					) : field.type === "time" ? (
						<NoteTimePicker
							id={`aif-${field.name}`}
							value={values[field.name] ?? ""}
							onChange={(value) => set(field.name, value)}
							restrictToFuture={restrictToFuture}
							hasPastError={
								restrictToFuture &&
								isNotePinDateTimeInPast(dateValue, values[field.name] ?? "")
							}
							disabled={disabled}
							placeholder="Pick a time"
							size="sm"
						/>
					) : isParticipantsField(field) ? (
						<ParticipantsPicker
							field={field}
							value={values[field.name] ?? ""}
							people={people}
							disabled={disabled}
							onChange={(next) => set(field.name, next)}
						/>
					) : (
						<Input
							id={`aif-${field.name}`}
							type="text"
							value={values[field.name]}
							onChange={(e) => set(field.name, e.target.value)}
							placeholder={field.placeholder}
							disabled={disabled}
							className={cn("h-8", FIELD_CLASS)}
						/>
					)}
				</div>
			))}

			<div className="flex justify-end pt-1">
				<Button
					type="submit"
					size="sm"
					disabled={disabled || !allRequiredFilled}
					className="btn-primary h-8 gap-1.5 px-3 text-xs"
				>
					<FileSymlink className="h-3.5 w-3.5" />
					Submit
				</Button>
			</div>
		</form>
	);
}
