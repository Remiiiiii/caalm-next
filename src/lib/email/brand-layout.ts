/**
 * Shared branded shell for recipient-facing transactional emails (OTP,
 * invitations, e-sign requests, sharing notices). Uses the same gradient as
 * `.btn-primary` / `.primary-btn` in globals.css so emails match the app.
 */

export const BRAND_GRADIENT =
	"linear-gradient(90deg, #00c1cb, #078fab, #0e638f, #11487d, #162768)";

/** Wraps body HTML in the CAALM gradient header + card + footer shell. */
export function renderBrandedEmail(heading: string, bodyHtml: string): string {
	return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background-image: ${BRAND_GRADIENT}; padding: 24px; text-align: center;">
          <span style="color: #ffffff; font-size: 20px; font-weight: 700; letter-spacing: 0.3px;">CAALM Solutions</span>
        </div>
        <div style="background-color: #ffffff; padding: 24px;">
          ${heading ? `<h3 style="color: #162768; margin-top: 0;">${heading}</h3>` : ""}
          ${bodyHtml}
        </div>
        <p style="color: #999; font-size: 12px; text-align: center; padding: 16px 24px; margin: 0; background-color: #f8f9fa;">Best regards,<br>CAALM Solutions Team</p>
      </div>
    `;
}

/** Branded gradient CTA pill, matching `.btn-primary`. */
export function brandButton(href: string, label: string): string {
	return `<div style="text-align: center; margin: 30px 0;"><a href="${href}" style="background-image: ${BRAND_GRADIENT}; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 999px; font-size: 15px; font-weight: 700; display: inline-block;">${label}</a></div>`;
}

/** Branded gradient accent box (e.g. OTP codes). */
export function brandAccentBox(innerHtml: string): string {
	return `<div style="background-image: ${BRAND_GRADIENT}; color: #ffffff; font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border-radius: 10px; letter-spacing: 3px; margin: 20px 0;">${innerHtml}</div>`;
}

function appUrl(): string {
	return process.env.NEXT_PUBLIC_APP_URL || "https://www.caalmsolutions.com";
}

/**
 * Gradient + grid recreation (no source image exists for this in the repo —
 * CSS-only per spec sign-off). Two stacked repeating-linear-gradient layers
 * draw the grid lines over a diagonal brand gradient.
 */
const BRAND_GRID_BACKGROUND = [
	"repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0px, rgba(255,255,255,.08) 1px, transparent 1px, transparent 40px)",
	"repeating-linear-gradient(90deg, rgba(255,255,255,.08) 0px, rgba(255,255,255,.08) 1px, transparent 1px, transparent 40px)",
	"linear-gradient(135deg, #0bc7d4 0%, #0f5384 55%, #0b2545 100%)",
].join(", ");

/**
 * Verification (OTP) email per "Verification Email — Design Spec":
 * white logo banner, gradient/grid code body, dark sign-off bar.
 */
export function renderVerificationEmail(opts: {
	firstName: string;
	otp: string;
}): string {
	const logoUrl = `${appUrl()}/assets/images/logo.png`;
	return `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #ffffff;">
          <tr>
            <td style="padding: 20px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="padding-right: 10px;"><img src="${logoUrl}" alt="CAALM Solutions" width="28" height="28" style="display: block; height: 28px; width: 28px;" /></td>
                <td style="vertical-align: middle;">
                  <span style="font-family: Arial, sans-serif; font-size: 14px; font-weight: 800; background-image: linear-gradient(90deg, #0BC7D4, #0F5384 70%); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #0F5384;">CAALM Solutions</span>
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width: 100%; background-color: #0f5384; background-image: ${BRAND_GRID_BACKGROUND};">
          <tr>
            <td style="padding: 40px 32px 0 32px; text-align: center; font-family: Arial, sans-serif;">
              <p style="margin: 0 0 24px 0; font-size: 15px; color: rgba(255,255,255,.9);">Hello ${opts.firstName}, your verification code is:</p>
              <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: rgba(255,255,255,.55); margin-bottom: 8px;">VERIFICATION CODE</div>
              <div style="width: 64px; height: 3px; margin: 0 auto 14px auto; background-image: linear-gradient(90deg, #0BC7D4, #0F5384); border-radius: 2px;"></div>
              <div style="font-family: 'IBM Plex Mono', Consolas, Menlo, monospace; font-size: 34px; font-weight: 700; letter-spacing: .22em; color: #ffffff;">${opts.otp}</div>
              <div style="margin-top: 14px; margin-bottom: 24px; font-size: 11.5px; color: rgba(255,255,255,.65);">&#9203; Expires in 5 minutes</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px 32px; text-align: center; font-family: Arial, sans-serif;">
              <p style="margin: 0; font-size: 11.5px; color: rgba(255,255,255,.7);">Didn't request this? You can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: rgba(0,0,0,.18); padding: 16px 36px; text-align: center; font-family: Arial, sans-serif;">
              <span style="font-size: 11px; color: rgba(255,255,255,.55);">Best regards, CAALM Solutions Team</span>
            </td>
          </tr>
        </table>
      </div>
    `;
}
