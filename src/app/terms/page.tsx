import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Terms of Service - Caalm',
  description:
    'Terms of Service for Caalm — compliance, agreement, and document management platform.',
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="relative mt-10">
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-slate-700">
            <h1 className="text-3xl sm:text-4xl font-semibold mb-6 sidebar-gradient-text">
              Terms of Service
            </h1>
            <p className="mb-8 text-sm text-slate-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                1. Introduction
              </h2>
              <p>
                Welcome to Caalm (&quot;Company&quot;, &quot;we&quot;,
                &quot;our&quot;, &quot;us&quot;). These Terms of Service
                (&quot;Terms&quot;) govern your access to and use of our
                compliance, data, and document management services, websites,
                and related applications (collectively, the
                &quot;Service&quot;). By accessing or using the Service, you
                agree to be bound by these Terms.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                2. Use of Service
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Eligibility:</span> You must
                  be at least 18 years old and have the authority to bind your
                  organization to use the Service.
                </li>
                <li>
                  <span className="font-semibold">License:</span> We grant you a
                  limited, non-exclusive, non-transferable license to use the
                  Service for your internal business purposes, subject to these
                  Terms.
                </li>
                <li>
                  <span className="font-semibold">Restrictions:</span> You will
                  not sublicense, resell, rent, lease, transfer, or otherwise
                  commercially exploit the Service; attempt to reverse engineer
                  or access the Service to build a competitive product; or use
                  the Service in a manner that violates laws, infringes
                  third-party rights, or disrupts system integrity or
                  performance.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                3. Accounts and Responsibilities
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Account Security:</span> You
                  are responsible for maintaining the confidentiality of your
                  credentials and for all activities under your account.
                </li>
                <li>
                  <span className="font-semibold">Compliance:</span> You will
                  ensure that your use of the Service complies with applicable
                  laws and regulations, including data protection requirements.
                </li>
                <li>
                  <span className="font-semibold">Acceptable Use:</span> You
                  will not upload, store, or transmit content that is unlawful,
                  harmful, or infringes the rights of others.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                4. Data Protection and Security
              </h2>
              <p>
                We implement reasonable and appropriate technical and
                organizational measures designed to help secure your data
                against accidental or unlawful loss, access, use, alteration, or
                disclosure. Where we process personal data on your behalf, we do
                so in accordance with our Privacy Policy and, where applicable,
                a data processing agreement.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                5. Confidentiality
              </h2>
              <p>
                Each party agrees to protect the other party&apos;s confidential
                information with the same degree of care it uses to protect its
                own confidential information and not to use such information for
                any purpose outside the scope of the Service.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                6. Customer Content and Ownership
              </h2>
              <p>
                You retain all rights to the data and documents you upload to
                the Service (&quot;Customer Content&quot;). You grant us a
                limited license to host, process, and display Customer Content
                solely as necessary to provide and improve the Service and to
                comply with legal obligations.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                7. Suspension and Termination
              </h2>
              <p>
                You may stop using the Service at any time. We may suspend or
                terminate access to the Service without prior notice if you
                breach these Terms, engage in unlawful activity, or pose a
                security risk. Upon termination, your right to use the Service
                will cease, but the following sections will survive:
                Confidentiality, Disclaimers, Limitations of Liability, and
                Miscellaneous.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                8. Disclaimers
              </h2>
              <p>
                The Service is provided &quot;as is&quot; and &quot;as
                available&quot; without warranties of any kind, whether express,
                implied, or statutory, including implied warranties of
                merchantability, fitness for a particular purpose, title, and
                non-infringement.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                9. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, in no event shall we be
                liable for any indirect, incidental, special, consequential,
                punitive damages, or loss of profits or revenues, whether
                incurred directly or indirectly, or any loss of data, use,
                goodwill, or other intangible losses, resulting from your use of
                the Service.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                10. Changes to the Service or Terms
              </h2>
              <p>
                We may modify the Service and these Terms from time to time. The
                most current version will supersede all previous versions. If
                changes materially affect your rights, we will provide notice
                where reasonable. Your continued use of the Service constitutes
                acceptance of the updated Terms.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                11. Miscellaneous
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Governing Law:</span> These
                  Terms are governed by the laws of your primary place of
                  business unless otherwise required by applicable law.
                </li>
                <li>
                  <span className="font-semibold">Severability:</span> If any
                  provision is found unenforceable, the remaining provisions
                  will remain in full force and effect.
                </li>
                <li>
                  <span className="font-semibold">Entire Agreement:</span> These
                  Terms constitute the entire agreement between you and Caalm
                  regarding the Service.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                12. SMS and Text Message Notification Terms of Service
              </h2>
              <p>
                By opting into our SMS and text message notification program,
                you agree to abide by the following terms and conditions. Please
                read this section carefully before providing your consent to
                receive notification messages via SMS.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Opt-In and Consent
              </h3>
              <p>
                By providing your mobile phone number and opting into our SMS
                and text message notification program, you expressly consent to
                receive promotional messages, alerts, and other notification
                communications from CaalmSolutions. You also confirm that you
                are the account holder or have the account holder&apos;s
                permission to enroll in this service. Standard message and data
                rates may apply.
              </p>
              <p>
                To opt in and manage your SMS notification preferences, please
                complete our SMS setup form:{' '}
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdPlNVK_YmEQA6_unkGS1_eqM2IgHFeNIkX_PWfc13Tj_HAsA/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-[#0000EE]"
                >
                  SMS Setup Form
                </a>
                . Completing this form allows us to verify your phone number and
                record your consent consistent with industry standards.
              </p>
              <h3 className="text-lg sm:text-xl font-semibold">
                Frequency of Messages
              </h3>
              <p>
                You agree to receive SMS and text message notification
                communications from CaalmSolutions periodically. The frequency
                of messages may vary based on your interaction with our platform
                and your preferences. You can opt-out of these messages at any
                time by following the instructions provided in the messages.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Opt-Out and Unsubscribe
              </h3>
              <p>
                To stop receiving SMS and text message notification
                communications, you can unsubscribe by replying &quot;STOP&quot;
                to any notification message you receive from us. After opting
                out, you will no longer receive notification messages via SMS,
                but you may continue to receive non-promotional messages related
                to your account or transactions.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Data and Privacy
              </h3>
              <p>
                We value your privacy and will handle your personal information
                in accordance with our Privacy Policy. By enrolling in our SMS
                and text message notification program, you acknowledge and agree
                that your mobile phone number and other provided data may be
                used to deliver notification messages, offers, and promotions.
                We will not share your information with third parties for
                notification purposes without your explicit consent.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Message Content
              </h3>
              <p>
                The content of our SMS and text message notification
                communications may include but is not limited to promotions,
                discounts, product updates, event information, and other
                relevant material related to our products and services.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Support and Assistance
              </h3>
              <p>
                For any questions, concerns, or assistance related to our SMS
                and text message notification program, you can contact our
                customer support team at{' '}
                <a
                  href="mailto:support@caalmsolutions.com"
                  className="underline"
                >
                  support@caalmsolutions.com
                </a>
                .
              </p>

              <h3 className="text-lg sm:text-xl font-semibold">
                Changes to the Terms
              </h3>
              <p>
                We reserve the right to modify or update these SMS and text
                message notification terms without prior notice. Any changes
                will be effective immediately upon posting the updated terms on
                our website or sending them to you via SMS. Your continued
                participation in the program after any modifications constitutes
                your acceptance of the revised terms.
              </p>

              <p>
                By enrolling in our SMS and text message notification program,
                you acknowledge that you have read, understood, and agree to
                these terms. If you do not agree to these terms, please do not
                opt into our SMS notification program.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                13. Contact Us
              </h2>
              <p>
                If you have questions about these Terms, contact us at{' '}
                <a href="mailto:sales@caalmsolutions.com" className="underline">
                  support@caalmsolutions.com
                </a>
                .
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
