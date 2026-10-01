/**
 * Prepare untrusted email HTML for a sandboxed iframe (srcDoc).
 * No scripts; links open in a new tab via <base target="_blank">.
 */

export function wrapEmailHtmlDocument(html: string): string {
	const trimmed = (html || "").trim();
	if (!trimmed) {
		return "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body></body></html>";
	}

	const headExtras = `
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" rel="noopener noreferrer" />
<style>
  html, body { margin: 0; padding: 0; background: #fff; }
  img, table { max-width: 100% !important; }
  img { height: auto !important; }
  a { word-break: break-word; }
</style>`.trim();

	if (/<html[\s>]/i.test(trimmed)) {
		if (/<head[\s>]/i.test(trimmed)) {
			return trimmed.replace(/<head([^>]*)>/i, `<head$1>${headExtras}`);
		}
		return trimmed.replace(
			/<html([^>]*)>/i,
			`<html$1><head>${headExtras}</head>`,
		);
	}

	return `<!DOCTYPE html><html><head>${headExtras}</head><body>${trimmed}</body></html>`;
}
