import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import {
	EnterpriseFileFormatError,
	assertEnterpriseFileAllowed,
	getEnterpriseFileExtension,
} from "@/lib/files/enterprise-file-formats";

export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file provided" }, { status: 400 });
		}

		try {
			assertEnterpriseFileAllowed(file, "contractPrimary");
		} catch (error) {
			if (error instanceof EnterpriseFileFormatError) {
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
			throw error;
		}

		if (getEnterpriseFileExtension(file.name) !== "pdf") {
			return NextResponse.json(
				{ error: "Only PDF files are supported for AI analysis" },
				{ status: 400 },
			);
		}

		// Create uploads directory if it doesn't exist
		const uploadsDir = join(process.cwd(), "uploads");
		if (!existsSync(uploadsDir)) {
			mkdirSync(uploadsDir, { recursive: true });
		}

		// Generate unique filename
		const timestamp = Date.now();
		const filename = `${timestamp}-${file.name}`;
		const filepath = join(uploadsDir, filename);

		// Convert file to buffer and save
		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);
		await writeFile(filepath, buffer);

		// Extract text from the PDF
		try {
			const pdfParse = (await import("pdf-parse-debugging-disabled")).default;
			const data = await pdfParse(buffer);

			return NextResponse.json({
				success: true,
				filename,
				filepath,
				text: data.text,
				pages: data.numpages,
				info: data.info,
				method: "pdf-parse-debugging-disabled",
			});
		} catch (extractError) {
			console.error("PDF extraction error:", extractError);
			return NextResponse.json({
				success: false,
				filename,
				filepath,
				text: "Unable to extract text from PDF",
				error:
					extractError instanceof Error
						? extractError.message
						: "Unknown error",
			});
		}
	} catch (error) {
		console.error("Upload error:", error);
		return NextResponse.json(
			{ error: "Failed to upload file" },
			{ status: 500 },
		);
	}
}

export function GET() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}
