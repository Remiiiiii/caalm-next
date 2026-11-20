/**
 * Personal preference: whether the full-screen expiry alert modal may auto-open.
 * Stored in localStorage so each browser can turn it off without a server round-trip.
 */

export const EXPIRY_ALERT_MODAL_PREF_KEY = "caalm.expiryAlertModal.enabled";

/** Fired on the same tab after a preference write (storage events only cross-tab). */
export const EXPIRY_ALERT_MODAL_PREF_EVENT = "caalm:expiry-alert-pref";

/** Default on: missing key means the modal still auto-opens. */
export function isExpiryAlertModalEnabled(): boolean {
	if (typeof window === "undefined") return true;
	try {
		const raw = window.localStorage.getItem(EXPIRY_ALERT_MODAL_PREF_KEY);
		if (raw === null) return true;
		return raw === "1" || raw === "true";
	} catch {
		return true;
	}
}

export function setExpiryAlertModalEnabled(enabled: boolean): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			EXPIRY_ALERT_MODAL_PREF_KEY,
			enabled ? "true" : "false",
		);
		window.dispatchEvent(new Event(EXPIRY_ALERT_MODAL_PREF_EVENT));
	} catch {
		/* private mode / blocked storage */
	}
}
