const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

type SendAsAlias = {
	sendAsEmail?: string;
	signature?: string;
	isPrimary?: boolean;
	isDefault?: boolean;
};

/**
 * Load the HTML signature for the user's primary (or default) send-as alias.
 * Images in Gmail signatures are usually absolute URLs already.
 */
export async function fetchGmailSignatureHtml(
	accessToken: string,
	preferredEmail?: string,
): Promise<string | null> {
	const res = await fetch(`${GMAIL_BASE}/settings/sendAs`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Gmail sendAs error: ${text}`);
	}
	const data = (await res.json()) as { sendAs?: SendAsAlias[] };
	const aliases = data.sendAs || [];
	if (aliases.length === 0) return null;

	const preferred = preferredEmail?.trim().toLowerCase();
	const match =
		(preferred
			? aliases.find(
					(a) => a.sendAsEmail?.trim().toLowerCase() === preferred,
				)
			: undefined) ||
		aliases.find((a) => a.isPrimary) ||
		aliases.find((a) => a.isDefault) ||
		aliases[0];

	const signature = (match?.signature || "").trim();
	return signature || null;
}
