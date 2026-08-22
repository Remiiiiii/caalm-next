"use client";

import { CreditCard } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Stripe PaymentMethod.card.brand / card.display_brand values (+ aliases). */
export type StripeCardBrand =
	| "visa"
	| "mastercard"
	| "amex"
	| "discover"
	| "diners"
	| "jcb"
	| "unionpay"
	| "eftpos_au"
	| "unknown";

const PAYMENT_BRAND_IMAGES: Partial<
	Record<Exclude<StripeCardBrand, "unknown">, string>
> = {
	visa: "/assets/icons/payment-brands/visa.png",
	mastercard: "/assets/icons/payment-brands/mastercard.png",
	amex: "/assets/icons/payment-brands/american-express.png",
	discover: "/assets/icons/payment-brands/discover.png",
};

export function normalizeStripeCardBrand(brand: string): StripeCardBrand {
	const normalized = brand.trim().toLowerCase().replace(/_/g, " ");
	if (normalized === "visa") return "visa";
	if (normalized === "mastercard") return "mastercard";
	if (
		normalized === "amex" ||
		normalized === "american express"
	) {
		return "amex";
	}
	if (normalized === "discover") return "discover";
	if (normalized === "diners" || normalized === "diners club") return "diners";
	if (normalized === "jcb") return "jcb";
	if (normalized === "unionpay" || normalized === "union pay") return "unionpay";
	if (normalized === "eftpos au" || normalized === "eftpos_au") return "eftpos_au";
	return "unknown";
}

function formatBrandLabel(brand: string): string {
	const key = normalizeStripeCardBrand(brand);
	switch (key) {
		case "amex":
			return "American Express";
		case "diners":
			return "Diners Club";
		case "eftpos_au":
			return "eftpos Australia";
		case "unionpay":
			return "UnionPay";
		case "unknown":
			return "Card";
		default:
			return key.charAt(0).toUpperCase() + key.slice(1);
	}
}

function FallbackCardIcon({
	label,
	className,
	iconClassName,
}: {
	label: string;
	className?: string;
	iconClassName?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-6 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-slate-200 bg-white",
				className,
			)}
			role="img"
			aria-label={label}
		>
			<CreditCard
				className={cn("h-3.5 w-3.5 text-[#0f5384]", iconClassName)}
				strokeWidth={1.75}
			/>
		</span>
	);
}

function BrandImage({
	src,
	alt,
	className,
}: {
	src: string;
	alt: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-6 w-10 shrink-0 overflow-hidden rounded-[4px] border border-slate-200 bg-white",
				className,
			)}
			role="img"
			aria-label={alt}
		>
			<Image
				src={src}
				alt={alt}
				width={40}
				height={24}
				unoptimized
				className="h-full w-full object-cover object-center"
			/>
		</span>
	);
}

interface CardBrandIconProps {
	brand: string;
	className?: string;
	iconClassName?: string;
}

export default function CardBrandIcon({
	brand,
	className,
	iconClassName,
}: CardBrandIconProps) {
	const normalized = normalizeStripeCardBrand(brand);
	const label = formatBrandLabel(brand);
	const imageSrc = PAYMENT_BRAND_IMAGES[normalized as keyof typeof PAYMENT_BRAND_IMAGES];

	if (imageSrc) {
		return (
			<span
				className={cn("inline-flex shrink-0 items-center justify-center", className)}
			>
				<BrandImage src={imageSrc} alt={label} />
			</span>
		);
	}

	return (
		<FallbackCardIcon
			label={label}
			className={className}
			iconClassName={iconClassName}
		/>
	);
}
