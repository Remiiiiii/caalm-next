import Header from '../components/Header';
// import HeroIntro from '../components/HeroIntro';
import Hero from '../components/Hero';
import Features from '../components/Features';
import ProblemSolution from '../components/ProblemSolution';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import SignupBannerWrapper from '@/components/SignupBannerWrapper';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const BrandMarquee = dynamic(() => import('../components/BrandMarquee'));
const HeroIntro = dynamic(() => import('../components/HeroIntro'));
const FeaturesDynamic = dynamic(() => import('../components/Features'));
const ProblemSolutionDynamic = dynamic(
  () => import('../components/ProblemSolution')
);
const CTADynamic = dynamic(() => import('../components/CTA'));

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <HeroIntro />
        <Hero />
        <BrandMarquee />
        <FeaturesDynamic />
        <ProblemSolutionDynamic />
        <CTADynamic />
      </main>
      <Footer />
    </>
  );
}
