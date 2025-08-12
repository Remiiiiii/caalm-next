import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
import dynamic from 'next/dynamic';
import Insights from '../components/Insights';

const TextMarquee = dynamic(() => import('../components/TextMarquee'));
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
          <TextMarquee />
          <FeaturesDynamic />
          <Insights />
          <ProblemSolutionDynamic />
          <CTADynamic />
        </div>
      </main>
      <Footer />
    </>
  );
}
