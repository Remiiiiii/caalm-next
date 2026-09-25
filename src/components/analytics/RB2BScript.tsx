import Script from "next/script";

const RB2B_ID = process.env.NEXT_PUBLIC_RB2B_ID?.trim();

/**
 * RB2B visitor ID (https://app.rb2b.com).
 *
 * Uses their exact HTML snippet with `beforeInteractive` so the tracker is in
 * the first HTML response. A client-only useEffect injects too late for RB2B's
 * "Test script" popup, which opens the site briefly and expects the script
 * immediately — otherwise the popup closes with no success message.
 */
export function RB2BScript() {
	if (!RB2B_ID) return null;

	const snippet = `!function(key){if(window.reb2b)return;window.reb2b={loaded:true};var s=document.createElement("script");s.async=true;s.src="https://ddwl4m2hdecbv.cloudfront.net/b/"+key+"/"+key+".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s,document.getElementsByTagName("script")[0]);}(${JSON.stringify(RB2B_ID)});`;

	return (
		<Script id="rb2b-script" strategy="beforeInteractive">
			{snippet}
		</Script>
	);
}
