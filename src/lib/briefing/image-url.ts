/**
 * RSS thumbs are `/ace/standard/240/...`. That template serves 640–1920.
 * Article og:image is `/news/1024/branded_news/...` — only 1024 exists. Do not
 * rewrite branded_news or the browser srcset will 404.
 */
export function bbcImageAtWidth(url: string, width: number): string {
	if (/\/branded_news\//i.test(url)) return url;
	return url.replace(
		/^(https:\/\/ichef\.bbci\.co\.uk\/ace\/standard)\/(\d+)\//i,
		`$1/${width}/`,
	);
}
