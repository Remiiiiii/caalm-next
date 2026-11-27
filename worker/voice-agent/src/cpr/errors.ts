export class CprAvatarError extends Error {
	readonly type?: string;

	constructor(message: string, options?: { type?: string; cause?: unknown }) {
		super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
		this.name = "CprAvatarError";
		this.type = options?.type;
	}
}
