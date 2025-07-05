import Header from '../components/Header';
import Hero from '../components/Hero';
import Features from '../components/Features';
import ProblemSolution from '../components/ProblemSolution';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import SignupBannerWrapper from '@/components/SignupBannerWrapper';

export default function HomePage() {
  return (
    <>
      <SignupBannerWrapper />
      <Header />
      <main>
        <Hero />
        <Features />
        <ProblemSolution />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
