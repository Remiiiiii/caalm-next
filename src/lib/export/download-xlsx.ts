import {
	buildStyledXlsx,
	type StyledXlsxInput,
	XLSX_MIME,
} from "./styled-xlsx";

/** Builds the styled workbook and saves it from the browser. */
export function downloadXlsx(filename: string, input: StyledXlsxInput) {
	const url = URL.createObjectURL(
		new Blob([buildStyledXlsx(input)], { type: XLSX_MIME }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
