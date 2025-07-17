import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { Fields, Files } from 'formidable';
import fs from 'fs';
import pdfParse from 'pdf-parse';

export const config = {
  api: {
    bodyParser: false, // Required for file uploads
  },
};

function extractExpiryDateFromText(text: string): string | null {
  // Regex for ISO date (YYYY-MM-DD) or similar
  const match = text.match(
    /(expiry|expiration|end) date[:\s]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i
  );
  return match ? match[2] : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable();
  form.parse(req, async (err: unknown, fields: Fields, files: Files) => {
    if (err || !files.file) {
      return res.status(400).json({ error: 'File upload failed' });
    }
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filePath = file.filepath;
    let expiryDate: string | null = null;
    let text = '';
    try {
      if (file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
        expiryDate = extractExpiryDateFromText(text);
      } else {
        // Assume text file
        text = fs.readFileSync(filePath, 'utf8');
        expiryDate = extractExpiryDateFromText(text);
      }
      return res.status(200).json({ expiryDate, text });
    } catch (e) {
      return res
        .status(500)
        .json({ error: 'Failed to extract expiry date', details: e });
    }
  });
}
