import { format } from "date-fns";
import { normalizeSpeechPronunciation } from "@/lib/speech-pronunciation";
import type { License } from "@/types/licenses";

export type SpeechSegment = "full" | "itemOnly";

interface FormatLicenseForSpeechOptions {
	license: License;
	itemIndex?: number;
	totalItems?: number;
	userName?: string;
	userFullName?: string;
	daysUntilExpiry?: number | null;
	speechSegment?: SpeechSegment;
	includeGreeting?: boolean;
}

function getTimeBasedGreeting(): string {
	const hour = new Date().getHours();
	if (hour < 12) return "good morning";
	if (hour < 17) return "good afternoon";
	return "good evening";
}

function getFirstName(fullName?: string): string {
	if (!fullName) return "";
	return fullName.split(" ")[0];
}

function formatDateConversational(dateString: string): string {
	try {
		const date = new Date(dateString);
		const day = date.getDate();
		const daySuffix =
			day === 1 || day === 21 || day === 31
				? "st"
				: day === 2 || day === 22
					? "nd"
					: day === 3 || day === 23
						? "rd"
						: "th";
		return format(date, `MMMM d'${daySuffix},' yyyy`);
	} catch {
		try {
			return format(new Date(dateString), "MMMM d, yyyy");
		} catch {
			return dateString;
		}
	}
}

/**
 * Formats license data into natural speech for ElevenLabs TTS.
 */
export function formatLicenseForSpeech({
	license,
	itemIndex = 0,
	totalItems = 1,
	userName,
	userFullName,
	daysUntilExpiry,
	speechSegment = "full",
	includeGreeting = true,
}: FormatLicenseForSpeechOptions): string {
	const parts: string[] = [];
	const licenseName = license.licenseName || "Untitled License";
	const days = daysUntilExpiry ?? null;
	const itemOnly = speechSegment === "itemOnly";

	if (includeGreeting) {
		const firstName = getFirstName(userFullName || userName);
		const greeting = getTimeBasedGreeting();
		if (firstName) {
			parts.push(`Hey ${firstName}, ${greeting}!`);
		} else {
			parts.push(`${greeting.charAt(0).toUpperCase() + greeting.slice(1)}!`);
		}
	}

	if (!itemOnly) {
		if (days !== null && days <= 1) {
			if (totalItems === 1) {
				parts.push(
					`Urgent: ${licenseName} expires in 24 hours. Immediate action required.`,
				);
			} else {
				parts.push(
					`Urgent: You have ${totalItems} licenses expiring in 24 hours. Immediate action required.`,
				);
			}
		} else if (days !== null && days >= 2 && days <= 9) {
			if (totalItems === 1) {
				parts.push(`Reminder: ${licenseName} expires in ${days} days.`);
			} else {
				parts.push(
					`Reminder: You have ${totalItems} licenses expiring in ${days} days.`,
				);
			}
		} else if (totalItems === 1) {
			parts.push(
				"Just a heads-up—you've got a license coming up for renewal soon.",
			);
		} else {
			parts.push(
				`Looks like you have ${totalItems} licenses expiring soon.`,
			);
		}

		if (totalItems > 1) {
			parts.push(
				`Let's start with license ${itemIndex + 1} of ${totalItems}.`,
			);
		}
	}

	const expiryRaw = license.licenseExpiryDate || license.expirationDate;
	let expiryDateText = "";
	if (expiryRaw) {
		try {
			expiryDateText = formatDateConversational(expiryRaw);
		} catch {
			expiryDateText = expiryRaw;
		}
	}

	if (expiryDateText) {
		parts.push(
			`This is your ${licenseName}, which expires on ${expiryDateText}.`,
		);
	} else {
		parts.push(`This is your ${licenseName}.`);
	}

	const statusText = license.status
		? license.status.charAt(0).toUpperCase() +
			license.status.slice(1).replace(/-/g, " ")
		: null;
	const licenseType = license.licenseType || "professional license";
	const issuer = license.vendor || license.issuingAuthority || null;

	if (statusText && issuer) {
		parts.push(
			`The status of this license is ${statusText.toLowerCase()}. The license type is ${licenseType.toLowerCase()} and the issuer is ${issuer}.`,
		);
	} else if (statusText) {
		parts.push(
			`The status of this license is ${statusText.toLowerCase()}. The license type is ${licenseType.toLowerCase()}.`,
		);
	} else if (issuer) {
		parts.push(
			`The license type is ${licenseType.toLowerCase()} and the issuer is ${issuer}.`,
		);
	} else {
		parts.push(`The license type is ${licenseType.toLowerCase()}.`);
	}

	parts.push(
		"So, what would you like to do? You can renew it now, let it expire, take a closer look at the details, or snooze this reminder.",
	);

	return normalizeSpeechPronunciation(parts.join(" "));
}
