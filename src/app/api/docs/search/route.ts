import { getDocsSearchCorpus } from "@/lib/docs/load";
import { searchDocs } from "@/lib/docs/search";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const q = (searchParams.get("q") || "").trim();
	if (!q) {
		return Response.json({ hits: [] });
	}

	const corpus = getDocsSearchCorpus();
	const hits = searchDocs(corpus, q, 16);
	return Response.json({ hits });
}
