/**
 * Prints steps to apply CAALM invoice PDF branding in Stripe Dashboard.
 *
 * Standard Stripe accounts cannot set account branding via API; logo and brand
 * color must be uploaded in Dashboard → Settings → Branding.
 *
 * Usage:
 *   node scripts/sync-stripe-invoice-branding.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BRAND_COLOR = "#0f5384";
const LOGO_PATH = resolve(process.cwd(), "public/assets/images/logo.png");
const DASHBOARD_BRANDING = "https://dashboard.stripe.com/settings/branding";

function main() {
	if (!existsSync(LOGO_PATH)) {
		throw new Error(`Logo not found at ${LOGO_PATH}`);
	}

	const logoSizeKb = Math.round(readFileSync(LOGO_PATH).length / 1024);

	console.log("CAALM invoice PDF branding checklist\n");
	console.log(`Logo file: ${LOGO_PATH} (${logoSizeKb} KB)`);
	console.log(`Brand color: ${BRAND_COLOR}`);
	console.log(`Dashboard: ${DASHBOARD_BRANDING}\n`);
	console.log("Steps:");
	console.log("1. Open Stripe Dashboard → Settings → Branding");
	console.log("2. Upload public/assets/images/logo.png as Logo (and Icon if needed)");
	console.log(`3. Set brand color to ${BRAND_COLOR}`);
	console.log(
		"4. Save. New paid invoice PDFs use logo, color, and the CAALM footer line.",
	);
	console.log(
		"\nFooter text for new customers is set automatically via CAALM_INVOICE_FOOTER in billing.ts.",
	);
}

main();
