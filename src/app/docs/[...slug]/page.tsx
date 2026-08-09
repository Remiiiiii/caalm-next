import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { DocsPrevNext } from "@/components/docs/DocsPrevNext";
import { DocsToc } from "@/components/docs/DocsToc";
import { getAllDocsSlugs, getDocsPage } from "@/lib/docs/load";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
	params: Promise<{ slug: string[] }>;
};

export function generateStaticParams() {
	return getAllDocsSlugs().map((slug) => ({
		slug: slug.split("/"),
	}));
}

export async function generateMetadata({
	params,
}: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const page = getDocsPage(slug.join("/"));
	if (!page) return { title: "Not found" };
	return {
		title: page.frontmatter.title,
		description: page.frontmatter.description,
	};
}

export default async function DocsArticlePage({ params }: PageProps) {
	const { slug } = await params;
	const page = getDocsPage(slug.join("/"));
	if (!page) notFound();

	return (
		<div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_220px]">
			<article className="min-w-0">
				<div className="mb-6">
					<p className="text-xs font-semibold uppercase tracking-wider text-[#0f5384] dark:text-sky-300">
						<Link href="/docs" className="hover:underline">
							Docs
						</Link>
						<span className="mx-2 text-slate-300 dark:text-slate-600">/</span>
						{page.frontmatter.section}
					</p>
					{page.frontmatter.audience?.length ? (
						<p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
							Best for: {page.frontmatter.audience.join(" · ")}
						</p>
					) : null}
				</div>

				<DocsMarkdown
					markdown={`# ${page.frontmatter.title}\n\n${page.frontmatter.description ? `>${page.frontmatter.description}\n\n` : ""}${page.markdown}`}
				/>

				<DocsPrevNext prev={page.prev} next={page.next} />
			</article>

			<aside className="hidden xl:block">
				<div className="sticky top-24">
					<DocsToc headings={page.headings} />
				</div>
			</aside>
		</div>
	);
}
