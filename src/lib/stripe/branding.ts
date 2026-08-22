import { existsSync } from "node:fs";
import { join } from "node:path";

/** Brand blue used on invoices, hosted pages, and the customer portal. */
export const CAALM_BRAND_PRIMARY_COLOR = "#0f5384";

/** Footer printed on Stripe invoices and quotes (Appwrite-style thank-you line). */
export const CAALM_INVOICE_FOOTER =
	"Thank you for using CAALM Solutions\nQuestions? Contact us at support@caalmsolutions.com";

export const CAALM_QUOTE_HEADER = "CAALM Solutions";

export const CAALM_LOGO_PATH = join(
	process.cwd(),
	"public/assets/images/logo.png",
);

export function caalmInvoiceBrandingInstructions(): string {
	const dashboardUrl = stripeDashboardLinks().branding;
	return [
		"Stripe invoice PDF layout is controlled in Dashboard branding (no public API on standard accounts).",
		`1. Open ${dashboardUrl}`,
		`2. Upload logo from ${CAALM_LOGO_PATH}`,
		`3. Set brand color to ${CAALM_BRAND_PRIMARY_COLOR}`,
		"4. New invoice PDFs pick up logo, color, and the CAALM footer from customer invoice settings.",
	].join("\n");
}

/**
 * Stripe Dashboard URLs. Smart Retries have no public API; invoice PDF logo/color
 * must be set under Branding in the Dashboard (see caalmInvoiceBrandingInstructions).
 */
export function stripeDashboardLinks() {
	const origin = "https://dashboard.stripe.com";
	return {
		smartRetries: `${origin}/revenue_recovery/retries`,
		failedPaymentEmails: `${origin}/settings/billing/automatic`,
		branding: `${origin}/settings/branding`,
		quotes: `${origin}/quotes`,
		quote: (quoteId: string) => `${origin}/quotes/${quoteId}`,
	};
}

/** Validates local logo asset exists before a manual Dashboard branding update. */
export function assertCaalmInvoiceLogoExists(): void {
	if (!existsSync(CAALM_LOGO_PATH)) {
		throw new Error(`CAALM logo not found at ${CAALM_LOGO_PATH}`);
	}
}
