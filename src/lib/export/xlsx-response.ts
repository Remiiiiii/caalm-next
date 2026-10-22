import { NextResponse } from "next/server";
import {
	buildStyledXlsx,
	type StyledXlsxInput,
	XLSX_MIME,
} from "./styled-xlsx";

/** Download response for a styled workbook. */
export function xlsxResponse(filename: string, input: StyledXlsxInput) {
	return new NextResponse(buildStyledXlsx(input), {
		headers: {
			"Content-Type": XLSX_MIME,
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}
