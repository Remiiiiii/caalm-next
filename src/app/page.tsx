import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import dynamic from 'next/dynamic';
import Insights from '../components/Insights';
import Pricing from '../components/Pricing';
import QA from '../components/QA';
import Feedback from '../components/Feedback';
import { loadPricingFromMarkdown } from '../lib/pricing';
import TextMarquee from '@/components/TextMarquee';

const HeroIntro = dynamic(() => import('../components/HeroIntro'));
const FeaturesDynamic = dynamic(() => import('../components/Features'));
// const ProblemSolutionDynamic = dynamic(
//   () => import('../components/ProblemSolution')
// );
// const CTADynamic = dynamic(() => import('../components/CTA'));

export default async function HomePage() {
  const pricing = await loadPricingFromMarkdown();
  return (
    <>
      <Header />
      <main className="relative">
        {/* Global subtle grid, above any background videos */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage:
              'linear-gradient(90deg,rgba(0,0,0,0.03) 1px,transparent 1px),linear-gradient(180deg,rgba(0,0,0,0.03) 1px,transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative z-10">
          <HeroIntro />
          <Hero />
          <FeaturesDynamic />
          <TextMarquee />
          <Insights />
          <Pricing plans={pricing.plans} />
          <QA />
          {/* <ProblemSolutionDynamic /> */}
          {/* <CTADynamic /> */}
        </div>
      </main>
      {/* Shared video background for Feedback + Footer */}
      <div className="relative">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover -z-10 pointer-events-none"
        >
          <source src="/assets/video/wave.mp4" type="video/mp4" />
        </video>
        <Feedback />
        <Footer />
      </div>
    </>
  );
}
