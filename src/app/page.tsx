import Header from '../components/Header';
import Hero from '../components/Hero';
import Footer from '../components/Footer';
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
        <FeaturesDynamic />
        <BrandMarquee />
        <ProblemSolutionDynamic />
        <CTADynamic />
      </main>
      <Footer />
    </>
  );
}
