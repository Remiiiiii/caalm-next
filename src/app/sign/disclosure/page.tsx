import Link from "next/link";

export default function EsignDisclosurePage() {
	return (
		<div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6 lg:px-8">
			<article className="mx-auto max-w-3xl space-y-6 text-slate-700">
				<header className="space-y-2">
					<h1 className="h1 sidebar-gradient-text">
						CAALM Execute electronic signature disclosure
					</h1>
					<p className="text-sm text-slate-600">
						How electronic signing works in CAALM, what it means legally, and
						what you can expect as a signer.
					</p>
				</header>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Welcome
					</h2>
					<p>
						Thanks for signing with <strong>CAALM Execute</strong>, CAALM’s
						built-in electronic signature tool. This page explains the signing
						flow, when an electronic mark counts as a signature, and the rights
						you keep while you use it. If you continue and place your signature
						in CAALM Execute, you accept the points below.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Acceptance and consent
					</h2>
					<p>
						When you finish a document in CAALM Execute, you choose to sign and
						get related notices electronically under the U.S. Electronic
						Signatures in Global and National Commerce Act (E-Sign Act) and
						other laws that apply. That choice covers using CAALM Execute to
						review the file, apply your mark, and receive status updates by
						email or in the product.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Legal effect of your signature
					</h2>
					<p>
						A signature you create in CAALM Execute — for example by drawing or
						typing your name in the signing fields we show, or by any other
						signing method CAALM Execute offers — is meant to be enforceable.
						For the transaction, it is treated like a handwritten ink signature
						on paper.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						What you need to sign
					</h2>
					<p>To complete signing in CAALM Execute, you need:</p>
					<ul className="list-disc space-y-1 pl-5">
						<li>A reliable internet connection</li>
						<li>An email address you can open</li>
						<li>
							A computer or other device that can open and read the document
						</li>
						<li>
							A way to download or print a copy for your own files after you
							sign
						</li>
					</ul>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						How documents are delivered
					</h2>
					<p>
						Signing packages and related materials are delivered through CAALM
						Execute and/or email (for example, the secure link the sender
						shares). You are responsible for keeping that email address current
						and for being able to open messages from the sender or from CAALM.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Electronic transactions
					</h2>
					<p>
						By using CAALM Execute, you agree to handle this signing event and
						its disclosures electronically. You also confirm that the mark you
						apply binds you to the document’s terms, the same way a wet-ink
						signature would.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Withdrawing consent
					</h2>
					<p>
						You may stop using electronic signatures for this package any time
						before you finish signing. Contact the person or organization that
						sent the document first. If you cannot reach them, email{" "}
						<a
							href="mailto:support@caalmsolutions.com"
							className="text-[#0f5384] underline"
						>
							support@caalmsolutions.com
						</a>
						. Pulling consent can pause or stop the related deal or workflow
						until the parties agree on another path (including paper, if they
						offer it).
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Keeping your contact details current
					</h2>
					<p>
						Update the sender (and CAALM support when needed) as soon as your
						email or other contact details change. Out-of-date information can
						block signing notices and completion messages.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Keeping copies
					</h2>
					<p>
						After you sign, CAALM Execute gives you a chance to view, download,
						and print the document. Save your own copy. CAALM also stores a
						signed record for the organization’s files, but that copy may not
						stay available to you forever through support channels. Your
						download is the safest way to keep what you signed.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Acknowledgment
					</h2>
					<p>
						If you continue with CAALM Execute, you confirm you have read this
						disclosure, understand it, and agree to use electronic signatures
						and electronic delivery for this signing event as described here.
					</p>
				</section>

				<section className="space-y-2">
					<h2 className="text-xl font-semibold sidebar-gradient-text">
						Questions
					</h2>
					<p>
						For help with this disclosure, CAALM Execute, or a signing link,
						contact{" "}
						<a
							href="mailto:support@caalmsolutions.com"
							className="text-[#0f5384] underline"
						>
							support@caalmsolutions.com
						</a>
						.
					</p>
				</section>

				<p>
					<Link href="/" className="text-[#0f5384] underline">
						Back to CAALM
					</Link>
				</p>
			</article>
		</div>
	);
}
