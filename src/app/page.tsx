import Header from "../components/Header";
import Hero from "../components/Hero";
import Features from "../components/Features";
import ProblemSolution from "../components/ProblemSolution";
import CTA from "../components/CTA";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <>
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
