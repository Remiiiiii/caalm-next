export type DiffKind = "equal" | "add" | "remove";

export interface DiffLine {
	kind: DiffKind;
	text: string;
	leftIndex: number | null;
	rightIndex: number | null;
}

/** Split on blank lines so legal clauses stay together. */
export function splitParagraphs(text: string): string[] {
	return text
		.replace(/\r\n/g, "\n")
		.split(/\n{2,}/)
		.map((row) => row.trim())
		.filter(Boolean);
}

/**
 * Myers-style LCS paragraph diff. Short texts only — typical contract drafts.
 * Returns rows you can paint as keep / add / remove.
 */
export function diffParagraphs(
	leftText: string,
	rightText: string,
): DiffLine[] {
	const left = splitParagraphs(leftText);
	const right = splitParagraphs(rightText);
	const n = left.length;
	const m = right.length;
	const dp: number[][] = Array.from({ length: n + 1 }, () =>
		Array.from({ length: m + 1 }, () => 0),
	);

	for (let i = n - 1; i >= 0; i -= 1) {
		for (let j = m - 1; j >= 0; j -= 1) {
			dp[i][j] =
				left[i] === right[j]
					? dp[i + 1][j + 1] + 1
					: Math.max(dp[i + 1][j], dp[i][j + 1]);
		}
	}

	const rows: DiffLine[] = [];
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (left[i] === right[j]) {
			rows.push({
				kind: "equal",
				text: left[i],
				leftIndex: i,
				rightIndex: j,
			});
			i += 1;
			j += 1;
		} else if (dp[i + 1][j] >= dp[i][j + 1]) {
			rows.push({
				kind: "remove",
				text: left[i],
				leftIndex: i,
				rightIndex: null,
			});
			i += 1;
		} else {
			rows.push({
				kind: "add",
				text: right[j],
				leftIndex: null,
				rightIndex: j,
			});
			j += 1;
		}
	}
	while (i < n) {
		rows.push({
			kind: "remove",
			text: left[i],
			leftIndex: i,
			rightIndex: null,
		});
		i += 1;
	}
	while (j < m) {
		rows.push({
			kind: "add",
			text: right[j],
			leftIndex: null,
			rightIndex: j,
		});
		j += 1;
	}
	return rows;
}

export function hasDiffChanges(rows: DiffLine[]): boolean {
	return rows.some((row) => row.kind !== "equal");
}
