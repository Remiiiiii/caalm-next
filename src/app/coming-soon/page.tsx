'use client';

import { useState, useEffect } from 'react';
import {
  BarChart3,
  Brain,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Users,
  FileText,
  Zap,
} from 'lucide-react';
import SplineCanvas from '@/components/SplineCanvas';
import OrbitingBlocks from '@/components/OrbitingBlocks';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function ComingSoonPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [scrolled, setScrolled] = useState(false);

  // Scroll detection for header transition
  useEffect(() => {
    const el = window;
    let raf = 0;
    const readScroll = () => {
      const top = window.scrollY || document.documentElement.scrollTop || 0;
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

  // Header transition variants with smoother motion
  const wrapperVariants = {
    top: {
      width: '70%',
      height: 70,
      borderRadius: 24,
      marginTop: 16,
      boxShadow:
        '0 4px 32px 0 rgba(16,30,54,0.10), 0 1.5px 4px 0 rgba(16,30,54,0.03)',
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(200,200,200,0.18)',
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 30,
        mass: 0.8,
        duration: 0.6,
      },
    },
    scrolled: {
      width: '100%',
      height: 70,
      borderRadius: 0,
      marginTop: 0,
      boxShadow: 'none',
      background: 'transparent',
      border: '1px solid transparent',
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 30,
        mass: 0.8,
        duration: 0.6,
      },
    },
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/coming-soon-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Thank you! We'll notify you when we launch.");
        setEmail('');
      } else {
        setMessage(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      setMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Header with scroll transition */}
      <motion.header
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
          animate={scrolled ? 'top' : 'scrolled'}
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
          className="transition-all duration-700 ease-out"
          layout
          layoutId="header-container"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <Image
                src="/assets/images/logo.svg"
                alt="CAALM Logo"
                width={40}
                height={40}
              />
            </div>
            <div>
              <h1 className="text-xl font-bold sidebar-gradient-text">
                CAALM Solutions
              </h1>
              <p className="text-sm text-slate-600">Powered by AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <Clock className="w-4 h-4" />
            <span>Coming Soon</span>
          </div>
        </motion.div>
      </motion.header>

      {/* Main Content with Grid and Video Background */}
      <main className="relative min-h-screen">
        {/* Video Background */}
        <div className="absolute inset-0 -z-10">
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          >
            <source src="/assets/video/wave.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Global subtle grid, above any background videos */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 min-h-screen flex flex-col pt-20">
          {/* Hero Section */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-2">
            <div className="max-w-7xl w-full">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                {/* Left Content */}
                <div className="space-y-8">
                  {/* Main Heading */}
                  <div className="space-y-4">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
                      <span className="sidebar-gradient-text">
                        Centralize Contracts
                      </span>
                      <br />
                      <span className="sidebar-gradient-text">
                        Audits & Licenses
                      </span>
                    </h1>
                    <p className="text-md text-slate-600 max-w-2xl leading-relaxed">
                      Our AI-powered contract management platform is currently
                      in development. We're working hard to bring you the most
                      comprehensive solution for centralizing contracts, audits,
                      and licenses.
                    </p>
                  </div>

                  {/* Features Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                      <div className="w-10 h-10 bg-[#bfe5f1] rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue" />
                      </div>
                      <div>
                        <h3 className="font-semibold sidebar-gradient-text">
                          Advanced Analytics
                        </h3>
                        <p className="text-sm text-slate-600">
                          Comprehensive insights
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                      <div className="w-10 h-10 bg-[#b5f5da] rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-green" />
                      </div>
                      <div>
                        <h3 className="font-semibold sidebar-gradient-text">
                          AI-Powered
                        </h3>
                        <p className="text-sm text-slate-600">
                          Intelligent analysis
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold sidebar-gradient-text">
                          Secure & Compliant
                        </h3>
                        <p className="text-sm text-slate-600">
                          Enterprise-grade
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-slate-200/50">
                      <div className="w-10 h-10 bg-[#ffdfc5] rounded-lg flex items-center justify-center">
                        <Zap className="w-5 h-5 text-orange" />
                      </div>
                      <div>
                        <h3 className="font-semibold sidebar-gradient-text">
                          Real-time Updates
                        </h3>
                        <p className="text-sm text-slate-600">
                          Live monitoring
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Badge */}

                  {/* Email Signup */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 shadow-lg">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold sidebar-gradient-text mb-2">
                        Be the First to Know
                      </h2>
                      <p className="text-slate-600">
                        Get notified when we launch and receive early access to
                        our platform.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <input
                            type="email"
                            placeholder="Enter your email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/90 backdrop-blur-sm"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-[#00C1CB] via-[#078FAB] to-[#162768] text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2 shimmer-hover"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <span>Notify Me</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </div>
                      {message && (
                        <div
                          className={`text-center text-sm text-slate-600${
                            message.includes('Thank you')
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {message}
                        </div>
                      )}
                    </form>
                  </div>
                </div>

                {/* Right Content - Spline 3D */}
                <div className="relative flex flex-col items-center justify-center">
                  <div className="relative w-full h-[600px] rounded-2xl overflow-hidden">
                    {/* Orbiting Blocks around Spline - positioned to orbit around the center */}
                    <OrbitingBlocks />

                    <SplineCanvas
                      scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
                      className="w-full h-full relative z-10"
                      delayMs={1000}
                      durationMs={1000}
                    />

                    {/* Overlay gradient for better text readability */}
                    <div className="absolute inset-0 pointer-events-none z-20" />
                  </div>
                  <div className="inline-flex items-center text-md px-4 sidebar-gradient-text rounded-full font-medium mt-4">
                    <Sparkles className="w-4 h-4 mr-2  text-[#162768]" />
                    We're Building Something Amazing
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gradient transition from wave.mp4 to footer */}
        <div
          className="pointer-events-none absolute left-0 right-0 bottom-0 h-12 z-10"
          style={{
            background: 'linear-gradient(to bottom, transparent, white)',
          }}
        />
      </main>

      {/* Footer with smooth transition */}
      <div className="relative">
        <footer className="w-full py-8 px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-4 text-sm text-slate-600">
                <span>© 2025 CAALM Solutions. All rights reserved.</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <a
                  href="mailto:support@caalmsolutions.com"
                  className="text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-1"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Us</span>
                </a>
                <div className="flex items-center space-x-1 text-slate-600">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Launching Q4 2025</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
