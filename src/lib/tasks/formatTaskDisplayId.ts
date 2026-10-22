/** Stable on-screen id like TSK-0031 from the Appwrite row id. */
export function formatTaskDisplayId(taskId: string): string {
	const digits = taskId.replace(/\D/g, "").slice(-4);
	if (digits.length > 0) {
		return `TSK-${digits.padStart(4, "0")}`;
	}
	const suffix = taskId
		.replace(/[^a-zA-Z0-9]/g, "")
		.slice(-4)
		.toUpperCase();
	return `TSK-${suffix.padStart(4, "0")}`;
}
