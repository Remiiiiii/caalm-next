import type { DiffLine } from "./diff.service";

export interface DiffSummary {
	adds: number;
	removes: number;
}

export function countDiffKinds(rows: DiffLine[]): DiffSummary {
	let adds = 0;
	let removes = 0;
	for (const row of rows) {
		if (row.kind === "add") adds += 1;
		else if (row.kind === "remove") removes += 1;
	}
	return { adds, removes };
}
