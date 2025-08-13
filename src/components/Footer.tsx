import { Mail } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="text-slate-700 relative">
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 md:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center">
              <Image
                src="/assets/images/logo.svg"
                alt="Caalm Logo"
                width={28}
                height={28}
                className="w-7 h-7 sm:w-8 sm:h-8"
              />
              <span className="ml-2 text-lg sm:text-xl font-bold">Caalm</span>
            </div>
            <p className="mt-3 sm:mt-4 text-slate-light text-sm sm:text-base">
              Automated data & document management for modern compliance teams.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
              Product
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
              Legal
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
              <li>
                <Link href="/terms">Terms</Link>
              </li>
              <li>
                <Link href="/privacy">Privacy</Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg sidebar-gradient-text">
              Contact
            </h3>
            <div className="space-y-2 sm:space-y-3 text-slate-light">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">
                  support@caalmsolutions.com
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t  border-navy-dark pt-6 sm:pt-8 text-center text-slate-dark text-xs sm:text-sm">
          <p>© 2025 Caalm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
