import { describe, expect, it } from "vitest";
import {
	googleNewsArticleId,
	isGoogleNewsArticleUrl,
	isPlayableNewsVideo,
	isUsableNewsImage,
	parseGoogleNewsDecodeParams,
	parseGoogleNewsPublisherUrl,
} from "./google-news-url";

describe("google news url helpers", () => {
	it("reads the article id from rss and web paths", () => {
		const id = "CBMickFVX3lxTE9mWU";
		expect(
			googleNewsArticleId(
				`https://news.google.com/rss/articles/${id}?oc=5`,
			),
		).toBe(id);
		expect(
			isGoogleNewsArticleUrl(
				`https://news.google.com/articles/${id}`,
			),
		).toBe(true);
		expect(isGoogleNewsArticleUrl("https://www.cnn.com/world")).toBe(false);
	});

	it("rejects Google News logos and homepage URLs as article images", () => {
		expect(
			isUsableNewsImage(
				"https://lh3.googleusercontent.com/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc=s0-w300-rw",
			),
		).toBe(false);
		expect(isUsableNewsImage("https://www.cnn.com")).toBe(false);
		expect(
			isUsableNewsImage(
				"https://media.cnn.com/api/v1/images/stellar/prod/flood.jpg?c=16x9",
			),
		).toBe(true);
	});

	it("parses signature, timestamp, and id from the Google News splash page", () => {
		const html = `<div data-n-a-id="CBMiabc" data-n-a-ts="1787935140" data-n-a-sg="Ae5Wzi8V50tDdFPmrmrLw79bRdZY"></div>`;
		expect(parseGoogleNewsDecodeParams(html)).toEqual({
			articleId: "CBMiabc",
			timestamp: "1787935140",
			signature: "Ae5Wzi8V50tDdFPmrmrLw79bRdZY",
		});
		expect(parseGoogleNewsDecodeParams("<html></html>")).toBeNull();
	});

	it("reads the publisher URL from a batchexecute garturlres payload", () => {
		const body = `)]}'

[["wrb.fr","Fbv4je","[\\"garturlres\\",\\"https://www.cnn.com/2026/08/28/world/live-news/nepal-china-flood\\",1]",null,null,null,"generic"]]`;
		expect(parseGoogleNewsPublisherUrl(body)).toBe(
			"https://www.cnn.com/2026/08/28/world/live-news/nepal-china-flood",
		);
	});

	it("accepts MP4 news videos and rejects YouTube and HLS", () => {
		expect(
			isPlayableNewsVideo(
				"https://media.cnn.com/video/clip.mp4?c=16x9",
			),
		).toBe(true);
		expect(
			isPlayableNewsVideo("https://www.youtube.com/watch?v=abc"),
		).toBe(false);
		expect(
			isPlayableNewsVideo("https://cdn.example.com/live/stream.m3u8"),
		).toBe(false);
	});
});
