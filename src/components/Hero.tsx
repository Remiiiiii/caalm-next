"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Element, Link as LinkScroll } from "react-scroll";
import "../index.css";
import Spline from "@splinetool/react-spline";
import AOS from "aos";
import "aos/dist/aos.css";
import { useEffect, useState } from "react";

export const Hero = () => {
  useEffect(() => {
    AOS.init({
      duration: 1500,
      once: true,
    });
  }, []);

  // Crossfade effect state
  const [showSecond, setShowSecond] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setShowSecond((prev) => !prev), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative bg-gradient-to-br from-blue/10 to-green/10 pt-24 pb-12 px-4 sm:pt-32 sm:pb-20 md:pt-36 md:pb-24 lg:pt-40 lg:pb-32">
      <Element name="hero">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
            {/* Left: Text Content */}
            <div
              data-aos="fade-right"
              data-aos-offset="300"
              data-aos-easing="ease-in-sine"
              className="w-full max-w-[32rem] sm:max-w-[28rem] md:max-w-[36rem] lg:max-w-[44rem] xl:max-w-[48rem] mx-auto lg:mx-0"
            >
              <div className="font-bold uppercase text-xl sm:text-2xl md:text-3xl">
                CAALM
              </div>
              <div className="bg-white/20 backdrop-bl-md rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 max-w-full ml-0 mr-auto mb-6 sm:mb-8 max-lg:mx-auto">
                <h1 className="mb-4 sm:mb-6 h1 sm:text-4xl md:text-5xl lg:text-6xl font-bold text-p4 uppercase w-[42rem] max-w-[36rem] sm:max-w-[40rem] md:max-w-[44rem] lg:max-w-[64rem] xl:max-w-[80rem] leading-tight">
                  Centralize Your Contracts, Licenses & Audits
                </h1>
              </div>
              {/* Paragraph crossfade transition start */}
              <div className="relative h-16 max-w-full mb-8 sm:mb-12">
                <p
                  className={`body-1 absolute inset-0 transition-opacity duration-700 ${
                    showSecond ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                >
                  Caalm eliminates fragmented document storage and manual
                  tracking.
                </p>
                <p
                  className={`body-1 absolute inset-0 transition-opacity duration-700 ${
                    showSecond ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  Secure your compliance, prevent missed deadlines, and protect
                  your organization from financial and reputational risks.
                </p>
              </div>
              {/* Paragraph crossfade transition end */}
              <LinkScroll to="features">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-[#1793F0] to-[#1A9FF1] hover:from-[#1A9FF1] hover:to-[#1793F0] text-white font-semibold rounded-full shadow-md px-6 py-2 sm:px-8 transition-all duration-200 w-full sm:w-auto"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-700 hover:to-slate-500 text-white font-semibold rounded-full shadow-md px-6 py-2 sm:px-8 transition-all duration-200 hover:text-white w-full sm:w-auto"
                    variant="outline"
                    size="lg"
                  >
                    Schedule Demo
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </LinkScroll>
            </div>
            {/* Right: Spline 3D */}
            <div className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl flex justify-center mx-auto lg:mx-0 lg:-ml-12 xl:-ml-20">
              <Spline
                scene="https://prod.spline.design/JSDRNnN1k9dO-WXj/scene.splinecode"
                className="w-full h-[180px] sm:h-[260px] md:h-[340px] lg:h-[420px] xl:h-[500px]"
              />
            </div>
          </div>
        </div>
      </Element>

      {/* <div className="grid md:grid-cols-3 gap-8 text-center">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Secure & Compliant</h3>
          <p className="text-slate-700">
            Centralized, encrypted storage with role-based access controls
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
          <p className="text-slate-700">
            Multi-user workflows with approval processes and audit trails
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Automated Tracking</h3>
          <p className="text-slate-700">
            Proactive alerts for renewals, deadlines, and compliance milestones
          </p>
        </div>
      </div> */}
    </section>
  );
};

export default Hero;
