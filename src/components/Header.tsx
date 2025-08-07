'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef(null);
  const { scrollY } = useScroll();

  // Animate only after 64px scroll
  const width = useTransform(scrollY, [0, 64], ['100%', '70%']);
  const borderRadius = useTransform(scrollY, [0, 64], [0, 24]);
  const margin = useTransform(scrollY, [0, 64], ['0px', '16px auto']);
  const boxShadow = useTransform(
    scrollY,
    [0, 64],
    [
      'none',
      '0 4px 32px 0 rgba(16,30,54,0.10), 0 1.5px 4px 0 rgba(16,30,54,0.03)',
    ]
  );
  const background = useTransform(
    scrollY,
    [0, 64],
    ['rgba(255,255,255,0.85)', 'rgba(255,255,255,0.65)']
  );

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const AOS = (await import('aos')).default;
      await import('aos/dist/aos.css');
      AOS.init({ duration: 1500, once: true });
      cleanup = () => AOS.refreshHard();
    })();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  return (
    <motion.header
      ref={headerRef}
      style={{
        width,
        borderRadius,
        margin,
        boxShadow,
        background,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 72,
        border: '1px solid rgba(200,200,200,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
      }}
      className="transition-all duration-500"
    >
      <div
        className={clsx(
          'flex items-center justify-between w-full px-3 sm:px-4 md:px-6 transition-all duration-500 container mx-auto'
          // hasScrolled ? 'h-14 sm:h-16' : 'h-16 sm:h-20' // Removed hasScrolled
        )}
      >
        <div className="flex items-center ">
          <Image
            src="/assets/images/logo.svg"
            alt="Logo"
            width={50}
            height={50}
          />
          <span className="ml-1 text-2xl sm:text-xl font-bold text-slate-700">
            Caalm
          </span>
        </div>
        <nav className="hidden items-center space-x-4 sm:space-x-6 md:flex">
          <a
            data-aos="fade-down"
            data-aos-easing="linear"
            data-aos-duration="500"
            className="text-transparent bg-gradient-to-r bg-clip-text from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] transition-all duration-200 font-medium relative"
            href="#features"
          >
            Features
          </a>
          <a
            data-aos="fade-down"
            data-aos-easing="linear"
            data-aos-duration="1000"
            className="text-transparent bg-gradient-to-r bg-clip-text from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] transition-all duration-200 font-medium relative"
            href="#solutions"
          >
            Solutions
          </a>
          <a
            data-aos="fade-down"
            data-aos-easing="linear"
            data-aos-duration="1500"
            className="text-transparent bg-gradient-to-r bg-clip-text from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] transition-all duration-200 font-medium relative"
            href="#pricing"
          >
            Pricing
          </a>
          <a
            data-aos="fade-down"
            data-aos-easing="linear"
            data-aos-duration="2000"
            className="text-transparent bg-gradient-to-r bg-clip-text from-[#00C1CB] via-[#078FAB] via-[#0E638F] via-[#11487D] to-[#162768] transition-all duration-200 font-medium relative"
            href="#contact"
          >
            Contact
          </a>
        </nav>

        <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
          <Link href="/sign-in">
            <Button
              variant="ghost"
              className="text-navy hover:text-[#2563eb] hover:bg-[#2563eb] hover:bg-opacity-10"
            >
              Sign In
            </Button>
          </Link>
          <Link href="/sign-in"></Link>
        </div>

        <button
          className="flex flex-col items-center justify-center border-2 rounded-full lg:hidden z-20 w-10 h-10 border-s4/25 ml-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors bg-white"
          onClick={() => setIsOpen((prevState) => !prevState)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span
            className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out ${
              isOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-1.5'
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out my-1 ${
              isOpen ? 'opacity-0' : 'opacity-100'
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-navy rounded transition-all duration-300 ease-in-out ${
              isOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1.5'
            }`}
          ></span>
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10 bg-black/30 backdrop-blur-sm"
            aria-hidden="true"
          ></div>
          <div
            ref={menuRef}
            className="fixed top-16 left-0 right-0 z-20 md:hidden py-6 border-t border-border bg-white w-full px-6 shadow-xl animate-fadeIn"
          >
            <nav className="flex flex-col space-y-4">
              <a
                href="#features"
                className="text-navy font-medium"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a
                href="#solutions"
                className="text-navy font-medium"
                onClick={() => setIsOpen(false)}
              >
                Solutions
              </a>
              <a
                href="#pricing"
                className="text-navy font-medium"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </a>
              <a
                href="#contact"
                className="text-navy font-medium"
                onClick={() => setIsOpen(false)}
              >
                Contact
              </a>
              <div className="flex flex-col space-y-2 pt-3">
                <Link href="/sign-in">
                  <Button
                    variant="ghost"
                    className="justify-start text-navy hover:text-[#2563eb] hover:bg-[#2563eb] hover:bg-opacity-10 w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button
                    className="justify-start bg-[#2563eb] hover:bg-[#1e40af] text-white w-full"
                    onClick={() => setIsOpen(false)}
                  >
                    Get Started
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </motion.header>
  );
};

export default Header;
