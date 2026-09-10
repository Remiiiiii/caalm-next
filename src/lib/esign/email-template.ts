export function applyEsignEmailTemplate(
	template: string,
	vars: { signerName: string; signerEmail: string; documentName: string },
): string {
	return template
		.replaceAll("{signer.name}", vars.signerName)
		.replaceAll("{signer.email}", vars.signerEmail)
		.replaceAll("{document.name}", vars.documentName);
}

export function defaultEsignEmailSubject(documentName: string): string {
	return `Please sign: ${documentName}`;
}

export function defaultEsignEmailMessage(documentName: string): string {
	return `Hi {signer.name},\n\nYou have been asked to sign "${documentName}".\n\nOpen the link in this email to review and sign.`;
}
