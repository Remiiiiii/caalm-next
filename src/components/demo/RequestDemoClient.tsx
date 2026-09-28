"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CalendarDays, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LandingFrostedCard from "@/components/landing/LandingFrostedCard";
import LandingSection from "@/components/landing/LandingSection";
import {
	PERFORMANCE_METRICS,
	TESTIMONIALS,
} from "@/components/landing/landingContent";
import {
	COMPANY_SIZE_OPTIONS,
	demoRequestSchema,
	formatPhoneInput,
	type DemoRequestInput,
} from "@/lib/demo-request/schema";

type Step = "form" | "otp" | "schedule";

const COMPLIANCE_POINTS = [
	{
		title: "Every renewal has an owner",
		body: "Contracts and licenses stay assigned, dated, and visible before they expire.",
	},
	{
		title: "Approvals without the inbox chase",
		body: "Multi-step reviews route to the right role, with an audit trail of who signed off.",
	},
	{
		title: "Vendor files in one library",
		body: "Intake, files, and funding retention sit next to the agreement they protect.",
	},
];

const FUNDRAISING_POINTS = [
	{
		title: "Donors next to the grants they fund",
		body: "Constituents, gifts, and campaigns live in the same workspace as restricted funds.",
	},
	{
		title: "A 990 worksheet, not an e-file",
		body: "Map expenses for your preparer. CAALM does not file payroll or a general ledger.",
	},
];

export default function RequestDemoClient() {
	const [step, setStep] = useState<Step>("form");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_EVENT_URL || "";

	const form = useForm<DemoRequestInput>({
		resolver: zodResolver(demoRequestSchema),
		defaultValues: {
			email: "",
			firstName: "",
			lastName: "",
			companyName: "",
			companySize: "1-10",
			phone: "",
			message: "",
		},
	});

	useEffect(() => {
		if (step !== "schedule" || !calendlyUrl) return;
		const existing = document.querySelector(
			'script[src="https://assets.calendly.com/assets/external/widget.js"]',
		);
		if (existing) return;
		const script = document.createElement("script");
		script.src = "https://assets.calendly.com/assets/external/widget.js";
		script.async = true;
		document.body.appendChild(script);
	}, [step, calendlyUrl]);

	const onSubmit = form.handleSubmit(async (values) => {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch("/api/demo-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(values),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) {
				setError(json.error || "Could not send the verification code");
				return;
			}
			setEmail(values.email);
			setStep("otp");
		} finally {
			setBusy(false);
		}
	});

	const verify = async () => {
		setBusy(true);
		setError(null);
		try {
			const res = await fetch("/api/demo-request/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, otp }),
			});
			const json = (await res.json()) as { error?: string };
			if (!res.ok) {
				setError(json.error || "That code did not match");
				return;
			}
			setStep("schedule");
		} finally {
			setBusy(false);
		}
	};

	const metrics = PERFORMANCE_METRICS.slice(0, 3);

	return (
		<>
			<LandingSection id="demo-hero" className="pt-28">
				<div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start">
					<div>
						<p className="text-sm font-semibold uppercase tracking-wider text-[#0f5384]">
							Compliance first
						</p>
						<h1 className="mt-2 text-4xl font-semibold sidebar-gradient-text sm:text-5xl">
							Know every agreement before it expires
						</h1>
						<p className="mt-4 max-w-xl text-base text-slate-600">
							CAALM keeps contracts, licenses, approvals, and vendor files in
							one workspace so finance and compliance see what is committed.
						</p>
						<ul className="mt-6 space-y-4">
							{COMPLIANCE_POINTS.map((point) => (
								<li key={point.title}>
									<p className="text-sm font-semibold text-slate-700">
										{point.title}
									</p>
									<p className="text-sm text-slate-600">{point.body}</p>
								</li>
							))}
						</ul>
					</div>
					<div>
						<p className="text-sm font-semibold uppercase tracking-wider text-[#078FAB]">
							Fundraising second
						</p>
						<h2 className="mt-2 text-2xl font-semibold text-slate-700 sm:text-3xl">
							Then see donors and grants beside those agreements
						</h2>
						<p className="mt-3 text-sm text-slate-600">
							The same organization can track constituents, gifts, campaigns,
							and a Form 990 worksheet without a separate donor system.
						</p>
						<ul className="mt-6 space-y-4">
							{FUNDRAISING_POINTS.map((point) => (
								<li key={point.title}>
									<p className="text-sm font-semibold text-slate-700">
										{point.title}
									</p>
									<p className="text-sm text-slate-600">{point.body}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			</LandingSection>

			<LandingSection className="landing-soft-brand-wash">
				<div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
					{metrics.map((metric) => (
						<LandingFrostedCard key={metric.label} contentClassName="p-5 text-center">
							<p className="text-3xl font-bold text-slate-700 tabular-nums">
								{metric.value}
								{metric.suffix}
							</p>
							<p className="mt-1 text-xs text-slate-600">{metric.label}</p>
						</LandingFrostedCard>
					))}
				</div>
			</LandingSection>

			<LandingSection id="book">
				<div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
					<div className="space-y-4">
						{TESTIMONIALS.slice(0, 3).map((item) => (
							<LandingFrostedCard key={item.name} contentClassName="p-5">
								<p className="text-sm text-slate-700">“{item.quote}”</p>
								<p className="mt-3 text-xs font-medium text-slate-600">
									{item.name}, {item.role}
								</p>
							</LandingFrostedCard>
						))}
					</div>

					<LandingFrostedCard contentClassName="p-6">
						{step === "form" ? (
							<form className="space-y-4" onSubmit={onSubmit} noValidate>
								<div className="flex items-center gap-2">
									<CalendarDays className="h-5 w-5 text-[#0f5384]" />
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Book a demo
									</h2>
								</div>
								<Field label="Work email" error={form.formState.errors.email?.message}>
									<Input
										type="email"
										autoComplete="email"
										{...form.register("email")}
									/>
								</Field>
								<div className="grid gap-4 sm:grid-cols-2">
									<Field
										label="First name"
										error={form.formState.errors.firstName?.message}
									>
										<Input autoComplete="given-name" {...form.register("firstName")} />
									</Field>
									<Field
										label="Last name"
										error={form.formState.errors.lastName?.message}
									>
										<Input autoComplete="family-name" {...form.register("lastName")} />
									</Field>
								</div>
								<Field
									label="Company name"
									error={form.formState.errors.companyName?.message}
								>
									<Input autoComplete="organization" {...form.register("companyName")} />
								</Field>
								<Field
									label="Company size"
									error={form.formState.errors.companySize?.message}
								>
									<select
										className="glass-form-control h-10 w-full rounded-md border-[0.25px] border-slate-300 bg-white px-3 text-sm text-slate-700"
										{...form.register("companySize")}
									>
										{COMPANY_SIZE_OPTIONS.map((size) => (
											<option key={size} value={size}>
												{size}
											</option>
										))}
									</select>
								</Field>
								<Field label="Phone number" error={form.formState.errors.phone?.message}>
									<Input
										type="tel"
										inputMode="tel"
										autoComplete="tel"
										placeholder="(555) 555-0100"
										value={form.watch("phone")}
										onChange={(event) =>
											form.setValue("phone", formatPhoneInput(event.target.value), {
												shouldValidate: true,
											})
										}
									/>
								</Field>
								<Field label="Leave a message" error={form.formState.errors.message?.message}>
									<textarea
										rows={4}
										className="glass-form-control w-full rounded-md border-[0.25px] border-slate-300 px-3 py-2 text-sm text-slate-700"
										{...form.register("message")}
									/>
								</Field>
								{error ? <p className="text-sm text-red">{error}</p> : null}
								<div className="flex justify-end">
									<Button
										type="submit"
										className="primary-btn px-3 sm:px-4"
										disabled={busy}
									>
										<ArrowRight className="h-4 w-4" />
										Continue
									</Button>
								</div>
							</form>
						) : null}

						{step === "otp" ? (
							<div className="space-y-4">
								<div className="flex items-center gap-2">
									<ShieldCheck className="h-5 w-5 text-[#0f5384]" />
									<h2 className="text-xl font-semibold sidebar-gradient-text">
										Verify your email
									</h2>
								</div>
								<p className="text-sm text-slate-600">
									Enter the 6-digit code sent to {email}. It expires in 5 minutes.
								</p>
								<InputOTP maxLength={6} value={otp} onChange={setOtp}>
									<InputOTPGroup>
										{Array.from({ length: 6 }).map((_, index) => (
											<InputOTPSlot key={index} index={index} />
										))}
									</InputOTPGroup>
								</InputOTP>
								{error ? <p className="text-sm text-red">{error}</p> : null}
								<div className="flex justify-end">
									<Button
										type="button"
										className="primary-btn px-3 sm:px-4"
										disabled={busy || otp.length !== 6}
										onClick={() => void verify()}
									>
										<ShieldCheck className="h-4 w-4" />
										Verify email
									</Button>
								</div>
							</div>
						) : null}

						{step === "schedule" ? (
							<div className="space-y-3">
								<h2 className="text-xl font-semibold sidebar-gradient-text">
									Pick a time
								</h2>
								<p className="text-sm text-slate-600">
									Your email is verified. Choose a day on the calendar.
								</p>
								{calendlyUrl ? (
									<div
										className="calendly-inline-widget min-h-[680px] w-full"
										data-url={`${calendlyUrl}${calendlyUrl.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}`}
									/>
								) : (
									<p className="text-sm text-slate-600">
										Scheduling is not configured yet. Set
										NEXT_PUBLIC_CALENDLY_EVENT_URL and reload.
									</p>
								)}
							</div>
						) : null}
					</LandingFrostedCard>
				</div>
			</LandingSection>
		</>
	);
}

function Field({
	label,
	error,
	children,
}: {
	label: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		<div className="space-y-1">
			<Label>{label}</Label>
			{children}
			{error ? <p className="text-xs text-red">{error}</p> : null}
		</div>
	);
}
