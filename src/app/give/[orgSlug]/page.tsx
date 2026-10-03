"use client";

import { motion } from "framer-motion";
import {
	ArrowRight,
	CheckCircle2,
	CreditCard,
	FileText,
	Heart,
	HeartHandshake,
	Loader2,
	Lock,
	Mail,
	SearchX,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	giveAttrPersistKey,
	giveVisitDedupeKey,
	hasShareAttribution,
	parseGiveShareAttribution,
} from "@/lib/give/attribution";
import {
	buildConfigDesignationOptions,
	resolvePublicImpactStatement,
	type PublicDonationPageConfig,
} from "@/lib/give/public-donation-config";
import {
	buildGiveProgramOptions,
	isPersistedDesignationId,
	resolveGiveProgramLabel,
	type GiveProgramOption,
} from "@/lib/give/public-programs";
import LandingFrostedCard from "@/components/landing/LandingFrostedCard";
import LandingSection from "@/components/landing/LandingSection";
import {
	fadeInText,
	fadeRight,
	fadeUp,
	scaleIn,
	staggerContainer,
} from "@/components/landing/motion";
import StaticWaveBackdrop from "@/components/landing/StaticWaveBackdrop";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DONATION_MIN_CENTS } from "@/lib/stripe/donations";

type GiveDesignation = { id: string; label: string };
type DonationFrequency = "one_time" | "monthly";
type TributeType = "honor" | "memory";

const DEFAULT_PRESET_AMOUNTS = ["25", "50", "100", "250"] as const;

const TRUST_POINTS = [
	{
		icon: Lock,
		title: "Secure card checkout",
		body: "Card details go straight to Stripe. They never touch this page.",
	},
	{
		icon: Mail,
		title: "Email receipt",
		body: "Add your email at checkout and a tax receipt follows automatically.",
	},
	{
		icon: HeartHandshake,
		title: "No account needed",
		body: "Giving here doesn't sign you into CAALM or change any subscription.",
	},
] as const;

type GiveShellProps = {
	children: ReactNode;
	orgName?: string | null;
	logoUrl?: string | null;
};

/** Wave + landing grid, slim brand bar, compact footer — no marketing nav. */
function GiveShell({ children, orgName, logoUrl }: GiveShellProps) {
	const brandLabel = orgName?.trim() || "CAALM";

	return (
		<main className="relative flex min-h-screen flex-col overflow-hidden">
			<StaticWaveBackdrop />
			{/* Same subtle grid as the marketing landing page */}
			<div
				className="pointer-events-none absolute inset-0 z-0 landing-grid-bg"
				aria-hidden
			/>

			<header className="relative z-[2] border-b border-slate-200/70 bg-white/55 backdrop-blur-md">
				<div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-12">
					<div className="flex min-w-0 items-center gap-3">
						{logoUrl ? (
							<Image
								src={logoUrl}
								alt=""
								width={120}
								height={32}
								className="h-8 w-auto max-w-[140px] object-contain"
								unoptimized
							/>
						) : (
							<Image
								src="/assets/images/logo.svg"
								alt=""
								width={96}
								height={28}
								className="h-7 w-auto object-contain"
							/>
						)}
						<span className="truncate text-sm font-semibold text-slate-700">
							{brandLabel}
						</span>
					</div>
					<span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-green/20 bg-green/10 px-2.5 py-1 text-xs font-medium text-green">
						<Lock className="h-3 w-3" />
						Secure giving
					</span>
				</div>
			</header>

			<div className="relative z-[2] flex flex-1 flex-col">
				<LandingSection
					fadeTop={false}
					fadeBottom={false}
					className="flex flex-1 items-start !py-6 sm:!py-8"
				>
					{children}
				</LandingSection>
			</div>

			<footer className="relative z-[2] border-t border-slate-200/70 bg-white/45 backdrop-blur-md">
				<div className="flex w-full flex-col items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:px-6 lg:px-8 xl:px-12">
					<p>
						Powered by{" "}
						<Link
							href="/"
							className="font-medium text-[#0f5384] transition-colors hover:underline"
						>
							CAALM
						</Link>
					</p>
					<nav
						aria-label="Legal"
						className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1"
					>
						<Link
							href="/privacy"
							className="transition-colors hover:text-[#0f5384]"
						>
							Privacy
						</Link>
						<Link
							href="/terms"
							className="transition-colors hover:text-[#0f5384]"
						>
							Terms
						</Link>
						<Link
							href="/contact"
							className="transition-colors hover:text-[#0f5384]"
						>
							Contact
						</Link>
					</nav>
				</div>
			</footer>
		</main>
	);
}

export default function PublicGivePage() {
	const params = useParams<{ orgSlug: string }>();
	const search = useSearchParams();
	const orgSlug = params.orgSlug;
	const [orgName, setOrgName] = useState<string | null>(null);
	const [logoUrl, setLogoUrl] = useState<string | null>(null);
	const [designations, setDesignations] = useState<GiveDesignation[]>([]);
	const [donationPageConfig, setDonationPageConfig] =
		useState<PublicDonationPageConfig | null>(null);
	const [amount, setAmount] = useState("25");
	const [frequency, setFrequency] = useState<DonationFrequency>("monthly");
	const [programValue, setProgramValue] = useState("__general__");
	const [tributeEnabled, setTributeEnabled] = useState(false);
	const [tributeType, setTributeType] = useState<TributeType>("honor");
	const [tributeName, setTributeName] = useState("");
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [amountError, setAmountError] = useState<string | null>(null);
	const [configSource, setConfigSource] = useState<"draft" | "published" | null>(
		null,
	);

	const urlAttribution = useMemo(
		() => parseGiveShareAttribution(search),
		[search],
	);

	const presetAmounts = useMemo(() => {
		if (donationPageConfig?.amountsCents?.length) {
			return donationPageConfig.amountsCents.map((c) => String(c / 100));
		}
		return [...DEFAULT_PRESET_AMOUNTS];
	}, [donationPageConfig]);

	const programOptions = useMemo((): GiveProgramOption[] => {
		if (donationPageConfig?.designations?.length) {
			return buildConfigDesignationOptions(donationPageConfig.designations).map(
				(o) => ({ ...o, fromOrg: false }),
			);
		}
		return buildGiveProgramOptions(designations);
	}, [donationPageConfig, designations]);

	const showMonthly =
		!donationPageConfig ||
		donationPageConfig.frequencyOptions.includes("monthly");
	const showOneTime =
		!donationPageConfig ||
		donationPageConfig.frequencyOptions.includes("one_time");

	const amountNumber = Number(amount);
	const displayAmount =
		Number.isFinite(amountNumber) && amountNumber > 0 ? amountNumber : 0;

	const impactLine = useMemo(() => {
		if (donationPageConfig) {
			return resolvePublicImpactStatement(
				donationPageConfig,
				displayAmount || Number(presetAmounts[0] ?? 25),
			);
		}
		return "supports programs that serve families in our community.";
	}, [donationPageConfig, displayAmount, presetAmounts]);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const preview = search.get("donationPreview");
			const qs = preview
				? `?donationPreview=${encodeURIComponent(preview)}`
				: "";
			const res = await fetch(
				`/api/give/org/${encodeURIComponent(orgSlug)}${qs}`,
			);
			if (!res.ok) {
				setOrgName(null);
				return;
			}
			const json = (await res.json()) as {
				name?: string;
				logoUrl?: string | null;
				designations?: GiveDesignation[];
				donationPageConfig?: PublicDonationPageConfig | null;
				configSource?: "draft" | "published" | null;
			};
			setOrgName(json.name ?? "Organization");
			setLogoUrl(json.logoUrl ?? null);
			setDesignations(json.designations ?? []);
			setDonationPageConfig(json.donationPageConfig ?? null);
			setConfigSource(json.configSource ?? null);
			if (json.donationPageConfig?.amountsCents?.[0]) {
				setAmount(String(json.donationPageConfig.amountsCents[0] / 100));
			}
			if (json.donationPageConfig?.designations?.[0]) {
				setProgramValue("donation-config:0");
			}
		} finally {
			setLoading(false);
		}
	}, [orgSlug, search]);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => {
		if (!hasShareAttribution(urlAttribution)) return;
		try {
			sessionStorage.setItem(
				giveAttrPersistKey(orgSlug),
				JSON.stringify(urlAttribution),
			);
		} catch {
			// sessionStorage may be blocked; checkout still uses current URL params.
		}
	}, [orgSlug, urlAttribution]);

	useEffect(() => {
		if (!orgName || search.get("donationPreview")) return;
		if (!hasShareAttribution(urlAttribution)) return;
		const key = giveVisitDedupeKey(orgSlug, urlAttribution);
		try {
			if (sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, "1");
		} catch {
			// Still try to log once this mount if storage is unavailable.
		}
		void fetch("/api/give/attribution/visit", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ orgSlug, ...urlAttribution }),
		}).catch(() => {
			// Donor-facing page never surfaces visit logging failures.
		});
	}, [orgName, orgSlug, search, urlAttribution]);

	const resolveCheckoutAttribution = () => {
		if (hasShareAttribution(urlAttribution)) return urlAttribution;
		try {
			const raw = sessionStorage.getItem(giveAttrPersistKey(orgSlug));
			if (!raw) return {};
			return parseGiveShareAttribution(JSON.parse(raw) as Record<string, unknown>);
		} catch {
			return {};
		}
	};

	const validateAmount = (): number | null => {
		const dollars = Number(amount);
		if (!Number.isFinite(dollars)) {
			setAmountError("Enter a valid amount");
			return null;
		}
		const amountCents = Math.round(dollars * 100);
		if (amountCents < DONATION_MIN_CENTS) {
			setAmountError("Minimum gift is $1.00");
			return null;
		}
		setAmountError(null);
		return amountCents;
	};

	const startCheckout = async () => {
		const amountCents = validateAmount();
		if (amountCents == null) return;

		if (tributeEnabled && !tributeName.trim()) {
			setError("Enter a name for your tribute gift");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			const res = await fetch("/api/give/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					orgSlug,
					amountCents,
					interval: frequency,
					designationId: isPersistedDesignationId(
						programValue,
						programOptions,
					),
					programLabel: resolveGiveProgramLabel(programOptions, programValue),
					tributeType: tributeEnabled ? tributeType : undefined,
					tributeName: tributeEnabled ? tributeName.trim() : undefined,
					...resolveCheckoutAttribution(),
				}),
			});
			const json = await res.json();
			if (!res.ok || !json.url) {
				setError(json.error ?? "Could not start checkout");
				return;
			}
			window.location.href = json.url;
		} finally {
			setSubmitting(false);
		}
	};

	if (loading) {
		return (
			<GiveShell>
				<div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
					<div className="space-y-4" aria-hidden>
						<div className="h-8 w-40 animate-pulse rounded-full bg-white/70" />
						<div className="h-12 w-4/5 animate-pulse rounded-xl bg-white/70" />
						<div className="h-5 w-3/5 animate-pulse rounded-lg bg-white/60" />
					</div>
					<LandingFrostedCard contentClassName="p-6 sm:p-8">
						<p className="flex items-center gap-2 text-sm text-slate-600">
							<Loader2 className="h-4 w-4 animate-spin text-[#0f5384]" />
							Loading giving page…
						</p>
					</LandingFrostedCard>
				</div>
			</GiveShell>
		);
	}

	if (!orgName) {
		return (
			<GiveShell>
				<motion.div
					className="mx-auto max-w-md"
					initial="hidden"
					animate="visible"
					variants={scaleIn}
				>
					<LandingFrostedCard contentClassName="p-6 sm:p-8 text-center">
						<span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
							<SearchX className="h-6 w-6 text-[#0f5384]" />
						</span>
						<h1 className="text-2xl landing-section-title sidebar-gradient-text">
							Organization not found
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Check the link you were given. The giving page may have moved or
							been turned off.
						</p>
					</LandingFrostedCard>
				</motion.div>
			</GiveShell>
		);
	}

	if (search.get("thanks") === "1") {
		return (
			<GiveShell orgName={orgName} logoUrl={logoUrl}>
				<motion.div
					className="mx-auto max-w-lg"
					initial="hidden"
					animate="visible"
					variants={scaleIn}
				>
					<LandingFrostedCard contentClassName="p-6 sm:p-10 text-center">
						<span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl border border-green/20 bg-green/10">
							<CheckCircle2 className="h-6 w-6 text-green" />
						</span>
						<h1 className="text-3xl sm:text-4xl landing-section-title sidebar-gradient-text">
							Thank you
						</h1>
						<p className="mx-auto mt-3 max-w-sm text-sm text-slate-600 sm:text-base">
							Your gift to {orgName} is being processed. A receipt will follow
							if you provided an email at checkout.
						</p>
					</LandingFrostedCard>
				</motion.div>
			</GiveShell>
		);
	}

	return (
		<GiveShell orgName={orgName} logoUrl={logoUrl}>
			{configSource === "draft" ? (
				<div className="mx-auto mb-4 max-w-6xl rounded-lg border border-orange/20 bg-orange/10 px-4 py-2 text-center text-sm text-slate-700">
					Preview mode — visitors still see the published page until you publish
					changes.
				</div>
			) : null}
			<motion.div
				className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16"
				variants={staggerContainer}
				initial="hidden"
				animate="visible"
			>
				{/* Left: story + trust points */}
				<div className="text-center lg:text-left">
					<motion.div
						variants={fadeUp}
						className="mb-5 flex justify-center lg:justify-start"
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-[#F1F9FF] px-3 py-1 shadow-sm">
							<span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-700/10 ring-1 ring-slate-200">
								<Heart className="h-3.5 w-3.5 text-slate-700" />
							</span>
							<span className="text-sm text-slate-700">Online giving</span>
						</div>
					</motion.div>
					<motion.h1
						variants={fadeInText}
						className="text-3xl leading-[1.25] sm:text-4xl md:text-5xl landing-section-title sidebar-gradient-text"
					>
						Give to {orgName}
					</motion.h1>
					<motion.p
						variants={fadeUp}
						className="mx-auto mt-5 max-w-xl text-base text-slate-600 sm:text-lg lg:mx-0"
					>
						Pick an amount, choose where it goes, and finish on a secure
						checkout page. It takes about a minute.
					</motion.p>

					<motion.div
						variants={fadeUp}
						className="mx-auto mt-6 flex max-w-xl items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-left backdrop-blur-sm lg:mx-0"
					>
						<span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#00C1CB]/12">
							<FileText className="h-4 w-4 text-[#0f5384]" />
						</span>
						<p className="text-sm text-slate-600">
							<span className="font-semibold text-slate-700">{orgName}</span>{" "}
							is a 501(c)(3) nonprofit.{" "}
							{donationPageConfig?.legalText?.trim() ||
								"Gifts are tax-deductible to the extent allowed by law."}
						</p>
					</motion.div>

					<motion.div
						variants={fadeUp}
						className="relative mx-auto mt-4 max-w-xl overflow-hidden rounded-xl border border-[#0f5384]/20 bg-gradient-to-br from-[#0f5384] to-[#162768] p-5 text-left text-white shadow-md lg:mx-0"
					>
						<svg
							className="pointer-events-none absolute -left-12 -top-12 size-48 text-white/[0.07]"
							viewBox="0 0 100 100"
							aria-hidden
						>
							<circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" />
							<circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" />
							<circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" />
						</svg>
						<p className="relative text-sm leading-relaxed sm:text-base">
							<span className="text-2xl font-bold tabular-nums sm:text-3xl">
								${displayAmount > 0 ? displayAmount.toLocaleString("en-US") : "25"}
							</span>{" "}
							{impactLine}
						</p>
					</motion.div>

					<motion.ul
						variants={fadeUp}
						className="mx-auto mt-6 max-w-xl space-y-3 text-left lg:mx-0"
					>
						{TRUST_POINTS.map(({ icon: Icon, title, body }) => (
							<li
								key={title}
								className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/60 p-3 backdrop-blur-sm"
							>
								<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#00C1CB]/12">
									<Icon className="h-4 w-4 text-[#0f5384]" />
								</span>
								<div>
									<p className="text-sm font-semibold text-slate-700">
										{title}
									</p>
									<p className="text-xs text-slate-600 sm:text-sm">{body}</p>
								</div>
							</li>
						))}
					</motion.ul>
				</div>

				{/* Right: donation form */}
				<motion.div variants={fadeRight} className="relative">
					<div
						className="pointer-events-none absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-[#00C1CB]/20 via-transparent to-[#162768]/15 blur-3xl"
						aria-hidden
					/>
					<LandingFrostedCard
						className="relative"
						contentClassName="p-5 sm:p-7"
					>
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384]">
									Your gift
								</p>
								<p className="mt-0.5 text-sm text-slate-600">USD</p>
							</div>
							<span className="inline-flex items-center gap-1 rounded-full border border-green/20 bg-green/10 px-2 py-0.5 text-xs font-medium text-green">
								<Lock className="h-3 w-3" />
								Secure
							</span>
						</div>

						{showOneTime && showMonthly ? (
						<div
							className="relative mt-5 grid grid-cols-2 items-center rounded-full border border-slate-200 bg-slate-100 p-1"
							role="tablist"
							aria-label="Donation frequency"
						>
							<span
								aria-hidden
								className="pointer-events-none absolute top-1 bottom-1 left-1 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out"
								style={{
									width: "calc(50% - 0.25rem)",
									transform:
										frequency === "one_time"
											? "translateX(0)"
											: "translateX(100%)",
								}}
							/>
							<button
								type="button"
								role="tab"
								aria-selected={frequency === "one_time"}
								onClick={() => setFrequency("one_time")}
								className={cn(
									"relative z-10 cursor-pointer rounded-full py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									frequency === "one_time"
										? "text-[#0f5384]"
										: "text-slate-500 hover:text-slate-700",
								)}
							>
								One-time
							</button>
							<button
								type="button"
								role="tab"
								aria-selected={frequency === "monthly"}
								onClick={() => setFrequency("monthly")}
								className={cn(
									"relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
									frequency === "monthly"
										? "text-[#0f5384]"
										: "text-slate-500 hover:text-slate-700",
								)}
							>
								Monthly
								<span className="rounded-full border border-green/20 bg-green/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green">
									Most impact
								</span>
							</button>
						</div>
						) : null}

						<form
							className="mt-6 space-y-5"
							onSubmit={(e) => {
								e.preventDefault();
								void startCheckout();
							}}
						>
							<fieldset className="space-y-2">
								<legend className="mb-2 text-sm font-medium text-slate-700">
									Choose an amount
								</legend>
								<div
									className={cn(
										"grid gap-2",
										presetAmounts.length <= 4
											? "grid-cols-4"
											: "grid-cols-3 sm:grid-cols-6",
									)}
								>
									{presetAmounts.map((preset) => {
										const selected = Number(amount) === Number(preset);
										return (
											<button
												key={preset}
												type="button"
												aria-pressed={selected}
												onClick={() => {
													setAmount(preset);
													setAmountError(null);
												}}
												className={cn(
													"cursor-pointer rounded-xl border px-2 py-3 text-sm font-semibold tabular-nums transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f5384]/40",
													selected
														? "border-[#0f5384] bg-[#0f5384] text-white shadow-md"
														: "border-slate-200 bg-white/70 text-slate-700 hover:border-blue-300 hover:bg-blue-50",
												)}
											>
												${preset}
											</button>
										);
									})}
								</div>
							</fieldset>

							<div className="space-y-1.5">
								<Label htmlFor="amount" className="text-slate-700">
									Or enter a custom amount
								</Label>
								<div className="relative">
									<span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
										$
									</span>
									<Input
										id="amount"
										type="number"
										inputMode="decimal"
										min={1}
										step="0.01"
										value={amount}
										onChange={(e) => {
											setAmount(e.target.value);
											setAmountError(null);
										}}
										onBlur={() => {
											void validateAmount();
										}}
										className="give-amount-input h-11 border-[0.25px] border-slate-300 bg-white pl-7! tabular-nums hover:border-blue-300 focus-visible:border-[#078FAB]"
										aria-invalid={amountError ? true : undefined}
										aria-describedby={amountError ? "amount-error" : undefined}
									/>
								</div>
								{amountError ? (
									<p id="amount-error" className="text-sm text-red">
										{amountError}
									</p>
								) : null}
							</div>

							<div className="space-y-1.5">
								<Label htmlFor="designation" className="text-slate-700">
									Designate your gift
								</Label>
								<Select value={programValue} onValueChange={setProgramValue}>
									<SelectTrigger
										id="designation"
										className="h-11 border-[0.25px] border-slate-300 bg-white hover:border-blue-300"
									>
										<SelectValue placeholder="Where should this gift go?" />
									</SelectTrigger>
									<SelectContent>
										{programOptions.map((opt) => (
											<SelectItem key={opt.value} value={opt.value}>
												{opt.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-3 rounded-xl border border-slate-200 bg-white/60 p-3">
								<div className="flex items-start gap-3">
									<Checkbox
										id="tribute"
										checked={tributeEnabled}
										onCheckedChange={(checked) =>
											setTributeEnabled(checked === true)
										}
										className="mt-0.5 border-[0.25px] border-slate-300"
									/>
									<Label
										htmlFor="tribute"
										className="cursor-pointer text-sm font-medium leading-snug text-slate-700"
									>
										Give in honor or memory of someone
									</Label>
								</div>
								{tributeEnabled ? (
									<div className="grid gap-3 sm:grid-cols-2 pl-7">
										<Select
											value={tributeType}
											onValueChange={(v) =>
												setTributeType(v as TributeType)
											}
										>
											<SelectTrigger className="h-10 border-[0.25px] border-slate-300 bg-white hover:border-blue-300">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="honor">In honor of</SelectItem>
												<SelectItem value="memory">In memory of</SelectItem>
											</SelectContent>
										</Select>
										<Input
											value={tributeName}
											onChange={(e) => setTributeName(e.target.value)}
											placeholder="Full name"
											className="h-10 border-[0.25px] border-slate-300 bg-white hover:border-blue-300 focus-visible:border-[#078FAB]"
											aria-label="Tribute honoree name"
										/>
									</div>
								) : null}
							</div>

							{error ? (
								<p
									role="alert"
									className="rounded-lg border border-red/20 bg-red/10 px-3 py-2 text-sm text-red"
								>
									{error}
								</p>
							) : null}

							<div className="space-y-4 border-t border-slate-200 pt-5">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
									<p className="flex items-center gap-1.5 text-xs text-slate-500">
										<CreditCard className="h-3.5 w-3.5 shrink-0" />
										Processed by Stripe
									</p>
									<Button
										type="submit"
										className="primary-btn group ml-auto cursor-pointer px-4 sm:px-6"
										disabled={submitting}
									>
										{submitting ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Heart className="h-4 w-4" />
										)}
										Donate
										{displayAmount > 0 ? (
											<span className="tabular-nums">
												${displayAmount.toLocaleString("en-US")}
												{frequency === "monthly" ? "/mo" : ""}
											</span>
										) : null}
										<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
									</Button>
								</div>
								<p className="text-[11px] leading-relaxed text-slate-500">
									{orgName} is a registered 501(c)(3). Your gift is
									tax-deductible; a receipt will be emailed immediately after
									checkout.
								</p>
							</div>
						</form>
					</LandingFrostedCard>
				</motion.div>
			</motion.div>
		</GiveShell>
	);
}
