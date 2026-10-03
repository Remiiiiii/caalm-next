/** Build RFC 2822 message and encode for Gmail API `raw` field. */
export function buildRawEmail(options: {
	to: string;
	subject: string;
	body: string;
	fromEmail?: string;
	inReplyTo?: string;
	references?: string;
	contentType?: "text" | "html";
}): string {
	const mimeType =
		options.contentType === "html"
			? 'text/html; charset="UTF-8"'
			: 'text/plain; charset="UTF-8"';
	const lines = [
		`To: ${options.to}`,
		...(options.fromEmail ? [`From: ${options.fromEmail}`] : []),
		`Subject: ${options.subject}`,
		...(options.inReplyTo ? [`In-Reply-To: ${options.inReplyTo}`] : []),
		...(options.references ? [`References: ${options.references}`] : []),
		"MIME-Version: 1.0",
		`Content-Type: ${mimeType}`,
		"",
		options.body,
	];
	const message = lines.join("\r\n");
	return base64UrlEncode(message);
}

function base64UrlEncode(input: string): string {
	const base64 = Buffer.from(input, "utf-8").toString("base64");
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
