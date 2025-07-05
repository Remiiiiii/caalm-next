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
      <head />
      <body className={`${poppins.variable} font-poppins antialiased`}>
        <Suspense fallback={null}>
          <SignupBanner />
        </Suspense>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
