import { Mail, Phone, MapPin } from "lucide-react";
import Image from "next/image";

const Footer = () => {
  return (
    <footer className="bg-navy text-white">
      <div className="container mx-auto px-4 py-8 sm:py-10 md:py-12 lg:py-16 md:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="flex items-center">
              <Image
                src="/assets/images/color-star.png"
                alt="Caalm Logo"
                width={28}
                height={28}
                className="w-7 h-7 sm:w-8 sm:h-8"
              />
              <span className="ml-2 text-lg sm:text-xl font-bold">Caalm</span>
            </div>
            <p className="mt-3 sm:mt-4 text-slate-light text-sm sm:text-base">
              Automated contract management for modern legal teams.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">
              Product
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Security
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Integrations
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">
              Company
            </h3>
            <ul className="space-y-1.5 sm:space-y-2 text-slate-light text-sm sm:text-base">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Press
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Partners
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3 sm:mb-4 text-base sm:text-lg">
              Contact
            </h3>
            <div className="space-y-2 sm:space-y-3 text-slate-light">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">
                  sales@caalmsolutions.com
                </span>
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">(555) 123-4567</span>
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">San Francisco, CA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-navy-dark pt-6 sm:pt-8 text-center text-slate-dark text-xs sm:text-sm">
          <p>© 2025 Caalm. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
