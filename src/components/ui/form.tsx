"use client";

import { Slot } from "@radix-ui/react-slot";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

type FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
	name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

const FormField = <
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
	...props
}: ControllerProps<TFieldValues, TName>) => {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
};

const useFormField = () => {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();

	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
};

type FormItemContextValue = {
	id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

/**
 * Field names CAALM extraction filled, so every field in the upload wizard can
 * mark itself (left accent + inline "CAALM filled" tag). Provided by
 * ContractUploadForm only; elsewhere the context is null and nothing changes.
 */
export type CaalmFilledState = {
	names: string[];
	confidence?: Record<string, number>;
	lowThreshold: number;
};

const CaalmFilledContext = React.createContext<CaalmFilledState | null>(null);
const CaalmFilledProvider = CaalmFilledContext.Provider;

function useCaalmFilled(name: string): "filled" | "review" | null {
	const state = React.useContext(CaalmFilledContext);
	if (!state?.names.includes(name)) return null;
	const conf = state.confidence?.[name] ?? 1;
	return conf < state.lowThreshold ? "review" : "filled";
}

const FormItem = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
	const id = React.useId();
	const { name } = React.useContext(FormFieldContext);
	const caalm = useCaalmFilled(name);

	return (
		<FormItemContext.Provider value={{ id }}>
			<div
				ref={ref}
				className={cn("space-y-2", className)}
				data-caalm={caalm ?? undefined}
				data-field={name}
				{...props}
			/>
		</FormItemContext.Provider>
	);
});
FormItem.displayName = "FormItem";

type FormLabelProps = React.ComponentPropsWithoutRef<"label">;

function FormLabel({ className, children, ...props }: FormLabelProps) {
	const { error, formItemId, name } = useFormField();
	const caalm = useCaalmFilled(name);

	return (
		<Label
			className={cn(error && "text-destructive", className)}
			htmlFor={formItemId}
			{...props}
		>
			{children}
			{caalm ? (
				<span
					className={cn(
						"ml-2 inline-flex items-center rounded px-[5px] py-px align-middle text-[9.5px] font-bold uppercase tracking-[0.05em]",
						caalm === "review"
							? "border border-amber-500/30 bg-amber-500/10 text-[#b45309]"
							: "border border-[#078fab]/20 bg-[#078fab]/[.09] text-[#078fab]",
					)}
				>
					{caalm === "review" ? "CAALM · review" : "CAALM filled"}
				</span>
			) : null}
		</Label>
	);
}

const FormControl = React.forwardRef<
	React.ElementRef<typeof Slot>,
	React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();

	return (
		<Slot
			ref={ref}
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
	const { formDescriptionId } = useFormField();

	return (
		<p
			ref={ref}
			id={formDescriptionId}
			className={cn("text-[0.8rem] text-muted-foreground", className)}
			{...props}
		/>
	);
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : children;

	if (!body) {
		return null;
	}

	return (
		<p
			ref={ref}
			id={formMessageId}
			className={cn("text-[0.8rem] font-medium text-destructive", className)}
			{...props}
		>
			{body}
		</p>
	);
});
FormMessage.displayName = "FormMessage";

export {
	CaalmFilledProvider,
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useFormField,
};
