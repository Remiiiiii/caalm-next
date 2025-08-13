'use client';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef(null);
  // Brute-force: Toggle a boolean once scrollTop >= 64, animate via variants
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el =
      (document.querySelector('.main-content') as HTMLElement) || window;
    let raf = 0;
    const readScroll = () => {
      const top =
        el instanceof Window
          ? window.scrollY || document.documentElement.scrollTop || 0
          : el.scrollTop || 0;
      setScrolled(top >= 64);
    };
    const onScroll: EventListener = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(readScroll);
    };
    const listenerOptions: AddEventListenerOptions = { passive: true };
    readScroll();
    el.addEventListener('scroll', onScroll, listenerOptions);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('scroll', onScroll, listenerOptions);
    };
  }, []);

  const wrapperVariants = {
    // Opposite mapping:
    // - At top (no scroll) show solid, rounded pill (Image 1)
    // - After threshold show minimal transparent bar (Image 2)
    top: {
      width: '70%',
      height: 70,
      borderRadius: 24,
      marginTop: 16,
      boxShadow:
        '0 4px 32px 0 rgba(16,30,54,0.10), 0 1.5px 4px 0 rgba(16,30,54,0.03)',
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(200,200,200,0.18)',
      transition: { type: 'spring', stiffness: 260, damping: 28 },
    },
    scrolled: {
      width: '100%',
      height: 70,
      borderRadius: 0,
      marginTop: 0,
      boxShadow: 'none',
      background: 'transparent',
      border: '1px solid transparent',
      transition: { type: 'spring', stiffness: 260, damping: 28 },
    },
  } as const;

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      const AOS = (await import('aos')).default;
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'transparent',
      }}
    >
      <motion.div
        variants={wrapperVariants}
        initial={false}
        animate={scrolled ? 'scrolled' : 'top'}
        style={{
          marginLeft: 'auto',
          marginRight: 'auto',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(200,200,200,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
        }}
        className="transition-all duration-500"
      >
        <div className="flex items-center justify-center">
          <Link href="/">
            <Image
              src="/assets/images/logo.svg"
              alt="Logo"
              width={40}
              height={40}
            />
          </Link>
          <span className="ml-1 text-2xl sm:text-xl font-bold text-slate-700">
            Caalm
          </span>
        </div>
        <nav className="hidden items-center space-x-4 sm:space-x-6 md:flex text-sm md:text-[0.95rem]">
          <a
            className="bg-clip-text font-medium relative text-sm text-slate-700 hover:underline decoration-[#03AFBF] underline-offset-4"
            href="#features"
          >
            Features
          </a>
          <a
            className=" bg-clip-text font-medium relative text-sm text-slate-700 hover:underline decoration-[#03AFBF] underline-offset-4"
            href="#solutions"
          >
            Solutions
          </a>
          <a
            className=" bg-clip-text font-medium relative text-sm text-slate-700 hover:underline decoration-[#03AFBF] underline-offset-4"
            href="#pricing"
          >
            Pricing
          </a>
          <a
            className=" bg-clip-text font-medium relative text-sm text-slate-700 hover:underline decoration-[#03AFBF] underline-offset-4"
            href="#contact"
          >
            Contact
          </a>
        </nav>

        <div className="hidden md:flex items-center space-x-2 sm:space-x-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-slate-700 text-sm">
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
      </motion.div>

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
            <nav className="flex flex-col space-y-4 text-sm">
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
