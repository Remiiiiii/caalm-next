import Header from '../components/Header';
// import HeroIntro from '../components/HeroIntro';
import Hero from '../components/Hero';
import Features from '../components/Features';
import ProblemSolution from '../components/ProblemSolution';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import SignupBannerWrapper from '@/components/SignupBannerWrapper';
import { Suspense } from 'react';
import HeroIntro from '../components/HeroIntro';
import BrandMarquee from '../components/BrandMarquee';

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<div>Loading...</div>}>
        <SignupBannerWrapper />
      </Suspense>
      <Header />
      <main>
        <HeroIntro />
        <Hero />
        <BrandMarquee />
        <Features />
        <ProblemSolution />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
