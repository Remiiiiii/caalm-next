import type {
	Proposal,
	ProposalRequirement,
	ProposalSection,
} from "./types";

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function markdownToHtml(markdown: string): string {
	return escapeHtml(markdown)
		.split(/\n{2,}/)
		.map((block) => {
			const lines = block.split("\n");
			if (lines.every((line) => /^\s*[-*]\s+/.test(line))) {
				const items = lines
					.map((line) => `<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`)
					.join("");
				return `<ul>${items}</ul>`;
			}
			const heading = /^#{1,6}\s+(.*)$/.exec(lines[0] || "");
			if (heading) return `<h2>${heading[1]}</h2>`;
			return `<p>${lines.join("<br/>")}</p>`;
		})
		.join("");
}

export function proposalToWordHtml(input: {
	orgName: string;
	proposal: Proposal;
	requirements: ProposalRequirement[];
	sections: ProposalSection[];
}): string {
	const rows = input.requirements
		.map(
			(row, index) =>
				`<tr><td>${index + 1}</td><td>${escapeHtml(row.sourceSection)}</td><td>${escapeHtml(row.requirementText)}</td><td>${escapeHtml(row.responseType)}</td></tr>`,
		)
		.join("");
	const sections = input.sections
		.map(
			(section) =>
				`<h1>${escapeHtml(section.heading)}</h1>${markdownToHtml(section.bodyMarkdown || "No draft yet.")}`,
		)
		.join("");
	return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${escapeHtml(input.proposal.title)}</title></head>
<body>
<p><strong>CAALM proposal draft</strong> · ${escapeHtml(input.orgName)}</p>
<h1>${escapeHtml(input.proposal.title)}</h1>
<p>Notice: ${escapeHtml(input.proposal.solicitationRef || "None")}</p>
<p>Human-reviewed first draft. Confirm every claim against the solicitation before submission.</p>
<h2>Compliance matrix</h2>
<table border="1" cellspacing="0" cellpadding="6">
<tr><th>#</th><th>Section</th><th>Requirement</th><th>Response</th></tr>
${rows}
</table>
${sections}
</body></html>`;
}
