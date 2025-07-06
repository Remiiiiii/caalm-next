import './globals.css';

import type { ReactNode } from 'react';
import { Poppins } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import SignupBanner from '@/components/SignupBanner';
import { Suspense } from 'react';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins',
});

export const metadata = {
  title: 'CAALM Solutions',
  description: 'Compliance and Agreement Lifecycle Management',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="/assets/images/favicon-96x96.png"
          type="image/png"
          sizes="96x96"
        />
        {/* <link
          rel="icon"
          href="/favicon.ico"
          type="image/x-icon"
          sizes="48x48"
        /> */}
        {/* <link rel="icon" href="/favicon.ico" sizes="96x96" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="96x96" />
        <link
          rel="apple-touch-icon"
          href="/apple-touch-icon.png"
          sizes="96x96"
        /> */}
      </head>
      <body className={`${poppins.variable} font-poppins antialiased`}>
        <Suspense fallback={null}>
          <SignupBanner />
        </Suspense>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
