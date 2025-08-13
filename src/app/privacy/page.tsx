import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Privacy Policy - Caalm',
  description:
    'Privacy Policy for Caalm — compliance, agreement, and document management platform.',
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="relative">
        <section className="relative z-10 py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-slate-700">
            <h1 className="text-3xl sm:text-4xl font-semibold mb-6 sidebar-gradient-text">
              Privacy Policy
            </h1>
            <p className="mb-8 text-sm text-slate-500">
              Last updated: {new Date().toLocaleDateString()}
            </p>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                1. Introduction
              </h2>
              <p>
                Caalm (&quot;Company&quot;, &quot;we&quot;, &quot;our&quot;,
                &quot;us&quot;) is committed to protecting your privacy. This
                Privacy Policy explains how we collect, use, disclose, and
                safeguard information when you use our Service. By using the
                Service, you consent to the practices described in this policy.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                2. Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Personal Information:</span>{' '}
                  Name, email, organization details, and billing information you
                  provide.
                </li>
                <li>
                  <span className="font-semibold">Usage Data:</span> Log data
                  such as IP address, browser type, device identifiers, pages
                  viewed, and time spent to help us improve the Service.
                </li>
                <li>
                  <span className="font-semibold">Files and Content:</span>{' '}
                  Documents and data you upload to the Service, processed solely
                  to provide the Service to you and your organization.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                3. How We Use Information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Provide, maintain, and improve the Service and features.
                </li>
                <li>
                  Process transactions, manage accounts, and provide support.
                </li>
                <li>
                  Monitor, detect, and prevent security incidents or abuse.
                </li>
                <li>Comply with legal obligations and enforce our Terms.</li>
                <li>Communicate service updates and security notices.</li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                4. Sharing Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <span className="font-semibold">Service Providers:</span>{' '}
                  Trusted vendors who assist in hosting, analytics, support, and
                  payment processing, bound by confidentiality and data
                  protection obligations.
                </li>
                <li>
                  <span className="font-semibold">Legal Requirements:</span> We
                  may disclose information if required by law or valid legal
                  process, or to protect the rights, property, or safety of
                  Caalm, our users, or the public.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                5. SMS and Text Message Notification Privacy Policy
              </h2>
              <p>
                We will not share your opt-in to an SMS campaign with any third
                party for purposes unrelated to providing you with the services
                of that campaign.
              </p>
              <p>
                We may share your Personal Data, including your SMS opt-in or
                consent status, with third parties that help us provide our
                messaging services, including but not limited to platform
                providers, phone companies, and any other vendors who assist us
                in the delivery of text messages.
              </p>
              <p>
                All of the above categories exclude text messaging originator
                opt-in data and consent; this information will not be shared
                with any third parties.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                6. Data Security
              </h2>
              <p>
                We use reasonable and appropriate administrative, technical, and
                physical safeguards designed to protect your information against
                accidental or unlawful destruction, loss, alteration,
                unauthorized disclosure, or access. No method of transmission
                over the Internet or method of electronic storage is 100%
                secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                7. Data Retention
              </h2>
              <p>
                We retain personal information for as long as necessary to
                provide the Service, comply with legal obligations, resolve
                disputes, and enforce agreements. Data retention periods may
                vary based on the nature of the information and legal
                requirements.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                8. Your Rights and Choices
              </h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access, correct, or update your personal information.</li>
                <li>
                  Request deletion subject to legal and contractual obligations.
                </li>
                <li>Request a copy of your data in a portable format.</li>
                <li>
                  Object to or restrict certain processing where applicable.
                </li>
              </ul>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                9. International Transfers
              </h2>
              <p>
                If we transfer personal information across borders, we will
                ensure appropriate safeguards are in place as required by
                applicable data protection laws.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                10. Children’s Privacy
              </h2>
              <p>
                The Service is not intended for individuals under the age of 18.
                We do not knowingly collect personal information from children.
              </p>
            </section>

            <section className="space-y-4 mb-8">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                11. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. The most
                current version will govern our processing of your information.
                If changes materially affect your rights, we will provide notice
                where reasonable. Your continued use of the Service after
                changes become effective constitutes acceptance of the updated
                policy.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold sidebar-gradient-text">
                12. Contact Us
              </h2>
              <p>
                If you have questions about this Privacy Policy or our data
                practices, contact us at{' '}
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
