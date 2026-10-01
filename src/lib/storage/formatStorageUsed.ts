/** Human-readable used storage for progress bars (KB → MB → GB). */
export function formatStorageUsedBytes(bytes: number): {
	formatted: string;
	unit: "GB" | "MB" | "KB";
} {
	const KB = 1024;
	const MB = KB * 1024;
	const GB = MB * 1024;

	if (bytes >= GB) {
		const gb = bytes / GB;
		return {
			formatted: gb.toLocaleString("en-US", {
				minimumFractionDigits: gb >= 10 ? 0 : 2,
				maximumFractionDigits: 2,
			}),
			unit: "GB",
		};
	}

	if (bytes >= MB) {
		const mb = bytes / MB;
		return {
			formatted: mb.toLocaleString("en-US", {
				minimumFractionDigits: 1,
				maximumFractionDigits: 1,
			}),
			unit: "MB",
		};
	}

	const kb = bytes / KB;
	return {
		formatted: kb.toLocaleString("en-US", {
			minimumFractionDigits: kb >= 100 ? 0 : 2,
			maximumFractionDigits: 2,
		}),
		unit: "KB",
	};
}
